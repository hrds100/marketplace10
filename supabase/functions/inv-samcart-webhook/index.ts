// inv-samcart-webhook — Handle SamCart order webhooks for share purchases
// Supports TWO modes:
//   1. Legacy SamCart flow: webhook has { type, order: { id } }, we call SamCart API
//      to validate + get customer data, parse phone field for propertyId/agentWallet/recipient
//   2. Direct payload flow: webhook has customer.email + custom_fields (our current approach)
// After order creation, calls sendPrimaryShares() on-chain (same as legacy backend)
// Env: SAMCART_API_KEY (optional), BACKEND_PRIVATE_KEY (required for on-chain)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ethers } from 'https://esm.sh/ethers@5.7.2'

// ---------------------------------------------------------------------------
// Blockchain: sendPrimaryShares on Marketplace contract (same as legacy)
// ---------------------------------------------------------------------------
const RPC_URL = 'https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T'
const MARKETPLACE_ADDRESS = '0xDD22fDC50062F49a460E5a6bADF96Cbec85ac128'
const SEND_PRIMARY_ABI = [
  'function sendPrimaryShares(address recipient, address agentWallet, uint256 propertyId, uint256 sharesRequested) external payable',
]

async function sendSharesOnChain(
  recipientWallet: string,
  agentWallet: string,
  propertyId: number,
  shares: number,
): Promise<{ txHash: string }> {
  const privateKey = Deno.env.get('BACKEND_PRIVATE_KEY')
  if (!privateKey) throw new Error('BACKEND_PRIVATE_KEY not set — cannot send shares on-chain')

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
  const wallet = new ethers.Wallet(privateKey, provider)
  const contract = new ethers.Contract(MARKETPLACE_ADDRESS, SEND_PRIMARY_ABI, wallet)

  // Dry-run first (same as legacy samcartRoute.js line 112)
  await contract.callStatic.sendPrimaryShares(recipientWallet, agentWallet, propertyId, shares)

  // Execute real transaction
  const tx = await contract.sendPrimaryShares(recipientWallet, agentWallet, propertyId, shares)
  const receipt = await tx.wait()

  return { txHash: receipt.transactionHash }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---------------------------------------------------------------------------
// Legacy helpers (ported from nfstay-org/backend/routes/samcartRoute.js)
// ---------------------------------------------------------------------------

/** Parse the phone field that SamCart customers encode as quasi-JSON:
 *  e.g. {propertyId: 3, agentWallet: 0xABC..., recipient: 0xDEF...}
 *  Keys/values may or may not be quoted.
 */
function parsePhoneData(data: string): { propertyId?: number; agentWallet?: string; recipient?: string } {
  try {
    // First try direct JSON parse
    return JSON.parse(data)
  } catch {
    // Legacy cleanup: quote keys, quote unquoted string values
    const cleaned = data
      .replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":')
      .replace(/:\s*([a-zA-Z_][\w]*|0x[\w]+)/g, (_match: string, p1: string) => {
        if (['true', 'false', 'null'].includes(p1)) return `: ${p1}`
        return `: "${p1}"`
      })
    return JSON.parse(cleaned)
  }
}

/** Extract a valid Ethereum wallet address from a string */
function extractWalletAddress(text: string | undefined | null): string | null {
  if (!text) return null
  const match = text.match(/0x[a-fA-F0-9]{40}/)
  return match ? match[0] : null
}

/** Try to parse the request body — JSON first, then URL-encoded */
async function parseBody(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get('content-type') || ''
  const rawText = await req.text()

  // Try JSON first
  try {
    return JSON.parse(rawText)
  } catch {
    // Fall through
  }

  // Try URL-encoded
  if (contentType.includes('application/x-www-form-urlencoded') || rawText.includes('=')) {
    const params = new URLSearchParams(rawText)
    const obj: Record<string, unknown> = {}
    for (const [k, v] of params.entries()) {
      // Try to parse nested JSON values
      try {
        obj[k] = JSON.parse(v)
      } catch {
        obj[k] = v
      }
    }
    return obj
  }

  throw new Error('Unable to parse request body as JSON or URL-encoded')
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await parseBody(req) as Record<string, any>
    console.log('SamCart webhook received:', JSON.stringify(body))

    const samcartApiKey = Deno.env.get('SAMCART_API_KEY')
    const webhookType = body.type as string | undefined // "Order" | "Refund" | undefined

    // -----------------------------------------------------------------------
    // LEGACY FLOW — SamCart sends { type: "Order"|"Refund", order: { id } }
    // and we have an API key to call their API
    // -----------------------------------------------------------------------
    if (samcartApiKey && webhookType && (body.order as any)?.id) {
      const orderId = String((body.order as any).id)
      console.log(`Legacy flow: type=${webhookType}, orderId=${orderId}`)

      // 1. Fetch order from SamCart API
      const orderRes = await fetch(
        `https://api.samcart.com/v1/orders/${orderId}`,
        { headers: { 'sc-api': samcartApiKey } }
      )
      if (!orderRes.ok) {
        console.error('SamCart order API failed:', orderRes.status)
        return new Response(JSON.stringify({ error: 'SamCart order verification failed' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const orderData = await orderRes.json()
      if (String(orderData.id) !== orderId) {
        return new Response(JSON.stringify({ error: 'Order ID mismatch' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // 2. Fetch customer from SamCart API
      const customerId = orderData.customer_id
      const customerRes = await fetch(
        `https://api.samcart.com/v1/customers/${customerId}`,
        { headers: { 'sc-api': samcartApiKey } }
      )
      const customerData = customerRes.ok ? await customerRes.json() : null

      // 3. Parse propertyId / agentWallet / recipient from last_name or phone field
      //    hub.nfstay.com encodes JSON in last_name ("DON'T EDIT - Wallet ID")
      //    legacy app.nfstay.com encoded JSON in the phone field
      let propertyId: number | null = null
      let agentWallet: string | null = null
      let recipientWallet: string | null = null
      const customerEmail: string | null = customerData?.email || null
      const customerFirstName: string | null = customerData?.first_name || null

      // Try last_name first (hub.nfstay.com sends JSON here)
      const lastNameRaw = customerData?.last_name || ''
      if (lastNameRaw && lastNameRaw.includes('{')) {
        try {
          const parsed = parsePhoneData(lastNameRaw)
          propertyId = parsed.propertyId ? Number(parsed.propertyId) : null
          agentWallet = extractWalletAddress(parsed.agentWallet)
          recipientWallet = extractWalletAddress(parsed.recipient)
        } catch (e) {
          console.log('Could not parse last_name field:', lastNameRaw, e)
          // Still try to extract a bare wallet address
          recipientWallet = extractWalletAddress(lastNameRaw)
        }
      } else if (lastNameRaw) {
        // Plain wallet address in last_name (legacy format)
        recipientWallet = extractWalletAddress(lastNameRaw)
      }

      // Fallback: try phone field (legacy app.nfstay.com format)
      if (!propertyId && customerData?.phone) {
        try {
          const parsed = parsePhoneData(customerData.phone)
          propertyId = propertyId || (parsed.propertyId ? Number(parsed.propertyId) : null)
          agentWallet = agentWallet || extractWalletAddress(parsed.agentWallet)
          recipientWallet = recipientWallet || extractWalletAddress(parsed.recipient)
        } catch (e) {
          console.log('Could not parse phone field:', customerData.phone, e)
        }
      }

      // 4. Calculate amount and shares (legacy: subtotal is in cents)
      const subtotalCents = orderData.cart_items?.[0]?.initial_price?.subtotal || 0
      const amountPaid = subtotalCents / 100
      const sharesRequested = Math.floor(amountPaid)

      // 5. Check for refund in cart_items (legacy refund handling)
      const isRefund = webhookType === 'Refund' ||
        orderData.cart_items?.some((item: any) => item.status === 'refunded')

      // Check for existing order by external_order_id
      const { data: existingOrder } = await supabase
        .from('inv_orders')
        .select('id, status')
        .eq('external_order_id', orderId)
        .maybeSingle()

      if (isRefund) {
        if (existingOrder && existingOrder.status !== 'pending' && existingOrder.status !== 'completed') {
          return new Response(JSON.stringify({
            error: `Order already has status '${existingOrder.status}', cannot refund`,
          }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (existingOrder) {
          await supabase.from('inv_orders')
            .update({ status: 'refunded', updated_at: new Date().toISOString() })
            .eq('id', existingOrder.id)
        }

        // Audit log
        await supabase.from('payout_audit_log').insert({
          performed_by: 'system',
          event_type: 'samcart_order_refunded',
          metadata: { external_order_id: orderId, amount: amountPaid },
        })

        return new Response(JSON.stringify({ status: 'refunded', external_order_id: orderId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // 6. Not a refund — process the order
      if (existingOrder) {
        // Idempotency: already exists
        return new Response(JSON.stringify({ status: 'duplicate', order_id: existingOrder.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Resolve property — use parsed propertyId or fall back to product name match
      if (!propertyId) {
        const productName = orderData.cart_items?.[0]?.product_name || ''
        if (productName) {
          // Strip share count prefix: "500 Shares - Pembroke" → "Pembroke"
          const cleanProductName = productName
            .replace(/^\d+\s*-?\s*shares?\s*-?\s*/i, '')
            .replace(/^rent\s*2\s*rent\s*-\s*shares?\s*-?\s*/i, '')
            .trim()

          const { data: matchedProp } = await supabase
            .from('inv_properties')
            .select('id')
            .or(`title.ilike.%${productName}%,title.ilike.%${cleanProductName}%`)
            .limit(1)
            .maybeSingle()

          if (matchedProp) {
            propertyId = matchedProp.id
          } else {
            const { data: firstProp } = await supabase
              .from('inv_properties')
              .select('id')
              .eq('status', 'open')
              .order('id', { ascending: true })
              .limit(1)
              .maybeSingle()
            propertyId = firstProp?.id || null
          }
        } else {
          const { data: firstProp } = await supabase
            .from('inv_properties')
            .select('id')
            .eq('status', 'open')
            .order('id', { ascending: true })
            .limit(1)
            .maybeSingle()
          propertyId = firstProp?.id || null
        }

        if (!propertyId) {
          return new Response(JSON.stringify({ error: 'No active properties found' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      // Get property details — try by id first, then by blockchain_property_id
      let { data: property } = await supabase
        .from('inv_properties')
        .select('id, blockchain_property_id, price_per_share, shares_sold, total_shares')
        .eq('id', propertyId)
        .single()

      if (!property) {
        // Fallback: the parsed propertyId might be a blockchain_property_id
        const { data: fallbackProp } = await supabase
          .from('inv_properties')
          .select('id, blockchain_property_id, price_per_share, shares_sold, total_shares')
          .eq('blockchain_property_id', propertyId)
          .maybeSingle()
        if (fallbackProp) {
          property = fallbackProp
          propertyId = fallbackProp.id // use Supabase id for all DB operations
          console.log(`Resolved blockchain_property_id=${fallbackProp.blockchain_property_id} → Supabase id=${propertyId}`)
        }
      }

      if (!property) {
        return new Response(JSON.stringify({ error: 'Property not found' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Recalculate shares using property price_per_share if available
      const finalShares = property.price_per_share
        ? Math.floor(amountPaid / Number(property.price_per_share))
        : sharesRequested

      // Resolve user — try email, then wallet address
      let userId: string | null = null
      if (customerEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', customerEmail)
          .maybeSingle()
        userId = profile?.id || null
      }
      if (!userId && recipientWallet) {
        const { data: walletProfile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('wallet_address', recipientWallet)
          .maybeSingle()
        userId = walletProfile?.id || null
      }

      if (!userId) {
        console.log('User not found for legacy order:', { customerEmail, recipientWallet })
        await supabase.from('payout_audit_log').insert({
          event_type: 'samcart_user_not_found',
          performed_by: 'system',
          metadata: { email: customerEmail, wallet: recipientWallet, amount: amountPaid, orderId },
        })
        return new Response(JSON.stringify({
          status: 'logged',
          message: 'User not found — logged for manual processing',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Resolve agent by wallet address
      let agentUserId: string | null = null
      if (agentWallet) {
        const { data: agentProfile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('wallet_address', agentWallet)
          .maybeSingle()
        agentUserId = agentProfile?.id || null
      }

      // Fallback: resolve agent from buyer's referred_by field
      if (!agentUserId && userId) {
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('referred_by')
          .eq('id', userId)
          .maybeSingle()

        if (buyerProfile?.referred_by) {
          // Try current referral_code first
          const { data: affByCode } = await supabase
            .from('aff_profiles')
            .select('user_id')
            .eq('referral_code', buyerProfile.referred_by)
            .maybeSingle()

          if (affByCode?.user_id) {
            agentUserId = affByCode.user_id
            console.log(`Agent resolved from buyer referred_by: ${buyerProfile.referred_by} → ${agentUserId}`)
          } else {
            // Fallback: check previous_codes (agent may have changed their code)
            const { data: affByOldCode } = await supabase
              .from('aff_profiles')
              .select('user_id')
              .contains('previous_codes', [buyerProfile.referred_by])
              .maybeSingle()

            if (affByOldCode?.user_id) {
              agentUserId = affByOldCode.user_id
              console.log(`Agent resolved from previous_codes: ${buyerProfile.referred_by} → ${agentUserId}`)
            }
          }
        }
      }

      // Payment below one full share (e.g. $5 test when price/share > $5) — still record inv_orders so the user sees it
      if (finalShares <= 0) {
        if (amountPaid <= 0) {
          return new Response(JSON.stringify({ error: 'Invalid amount' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        const productLabel =
          orderData.cart_items?.[0]?.product_name || 'Investment'
        const { data: smallOrder, error: smallErr } = await supabase
          .from('inv_orders')
          .insert({
            user_id: userId,
            property_id: propertyId,
            shares_requested: 0,
            amount_paid: amountPaid,
            payment_method: 'card',
            agent_id: agentUserId,
            status: 'pending',
            external_order_id: orderId,
          })
          .select()
          .single()
        if (smallErr) throw smallErr
        await supabase.from('payout_audit_log').insert({
          user_id: userId,
          event_type: 'samcart_below_min_share',
          performed_by: 'system',
          metadata: {
            order_id: smallOrder.id,
            amount: amountPaid,
            property_id: propertyId,
            flow: 'legacy_api',
          },
        })
        await sendNotification(
          customerFirstName || 'Investor',
          amountPaid,
          productLabel,
          customerEmail,
          null,
          userId,
        )
        return new Response(
          JSON.stringify({
            status: 'pending',
            order_id: smallOrder.id,
            message: 'Payment recorded; amount below one full share',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Create order as PENDING first (same as legacy samcartRoute.js)
      const { data: order, error: orderErr } = await supabase
        .from('inv_orders')
        .insert({
          user_id: userId,
          property_id: propertyId,
          shares_requested: finalShares,
          amount_paid: amountPaid,
          payment_method: 'card',
          agent_id: agentUserId,
          status: 'pending',
          external_order_id: orderId,
        })
        .select()
        .single()

      if (orderErr) throw orderErr

      // ── On-chain: SKIPPED — admin must approve before shares are sent ──
      // sendSharesOnChain() is NOT called here. Order stays 'pending'.
      // Shareholdings and shares_sold are NOT updated — that happens on admin approve.

      // Create agent commission if applicable
      if (agentUserId) {
        await createCommission(supabase, agentUserId, userId, propertyId, amountPaid, order.id)
      }

      // Send notification
      await sendNotification(customerFirstName || 'Investor', amountPaid, '', customerEmail, null, userId)

      // Audit log
      await supabase.from('payout_audit_log').insert({
        user_id: userId,
        event_type: 'samcart_order_pending',
        performed_by: 'system',
        metadata: {
          order_id: order.id,
          amount: amountPaid,
          shares: finalShares,
          property_id: propertyId,
          agent_wallet: agentWallet,
          flow: 'legacy_api',
        },
      })

      return new Response(JSON.stringify({
        status: 'pending',
        order_id: order.id,
        shares: finalShares,
        property_id: propertyId,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // -----------------------------------------------------------------------
    // REFUND via direct type field (no API key, or API key present but no order.id)
    // -----------------------------------------------------------------------
    if (webhookType === 'Refund') {
      const orderId = String((body.order as any)?.id || body.transaction_id || body.id || '')
      if (!orderId) {
        return new Response(JSON.stringify({ error: 'No order ID for refund' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: existingOrder } = await supabase
        .from('inv_orders')
        .select('id, status')
        .eq('external_order_id', orderId)
        .maybeSingle()

      if (existingOrder) {
        await supabase.from('inv_orders')
          .update({ status: 'refunded', updated_at: new Date().toISOString() })
          .eq('id', existingOrder.id)
      }

      await supabase.from('payout_audit_log').insert({
        performed_by: 'system',
        event_type: 'samcart_order_refunded',
        metadata: { external_order_id: orderId },
      })

      return new Response(JSON.stringify({ status: 'refunded', external_order_id: orderId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // -----------------------------------------------------------------------
    // DIRECT PAYLOAD FLOW — no API key or webhook came with full customer data
    // (our current approach: customer.email, custom_fields, etc.)
    // -----------------------------------------------------------------------

    const email = body.customer?.email || body.billing_email || body.email
    const phone = body.customer?.phone || body.phone_number || body.phone
    const firstName = body.customer?.first_name || body.first_name
    const lastName = body.customer?.last_name || body.last_name
    const amount = Number(body.order?.total || body.total_amount || body.charge?.amount || 0)
    const transactionId = body.order?.id || body.transaction_id || body.id
    const productName = body.product?.name || body.line_items?.[0]?.name || ''
    const productId = body.product?.id || body.line_items?.[0]?.id || ''

    // Custom fields for blockchain data
    const customFields = body.custom_fields || body.order?.custom_fields || {}
    const walletAddress = customFields.wallet_address || customFields.walletAddress || null
    const propertyIdRaw = customFields.property_id || customFields.propertyId || null
    const agentCode = customFields.agent_code || customFields.referral_code || customFields.agentCode || null

    // Also try to parse phone field (legacy format support even in direct mode)
    let phonePropertyId: number | null = null
    let phoneAgentWallet: string | null = null
    let phoneRecipient: string | null = null
    if (phone && typeof phone === 'string' && phone.includes('{')) {
      try {
        const parsed = parsePhoneData(phone)
        phonePropertyId = parsed.propertyId ? Number(parsed.propertyId) : null
        phoneAgentWallet = extractWalletAddress(parsed.agentWallet)
        phoneRecipient = extractWalletAddress(parsed.recipient)
      } catch {
        // Not parseable — it's a real phone number, ignore
      }
    }

    if (!email && !phoneRecipient) {
      console.log('Invalid webhook payload — no email or wallet:', { email, amount })
      return new Response(JSON.stringify({ error: 'Invalid payload — no email or identifiable user' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!amount || amount <= 0) {
      console.log('Invalid webhook payload — bad amount:', { email, amount })
      return new Response(JSON.stringify({ error: 'Invalid payload — amount must be positive' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Look up user by email
    let userId: string | null = null
    let profileName: string | null = null
    if (email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, wallet_address')
        .ilike('email', email)
        .maybeSingle()
      userId = profile?.id || null
      profileName = profile?.name || null
    }

    // If no profile by email, try phone (real phone, not the JSON-encoded one)
    if (!userId && phone && typeof phone === 'string' && !phone.includes('{')) {
      const { data: phoneProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('whatsapp', phone.replace(/[^0-9+]/g, ''))
        .maybeSingle()
      userId = phoneProfile?.id || null
    }

    // Try wallet from phone field
    if (!userId && phoneRecipient) {
      const { data: walletProfile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('wallet_address', phoneRecipient)
        .maybeSingle()
      userId = walletProfile?.id || null
    }

    if (!userId) {
      console.log('User not found for email:', email)
      await supabase.from('payout_audit_log').insert({
        event_type: 'samcart_user_not_found',
        performed_by: 'system',
        metadata: { email, phone, amount, transactionId, productName },
      })
      return new Response(JSON.stringify({
        status: 'logged',
        message: 'User not found — logged for manual processing',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Determine property ID (custom_fields > phone-parsed > product name match > default)
    let propertyId = propertyIdRaw ? Number(propertyIdRaw) : phonePropertyId
    if (!propertyId) {
      if (productName) {
        // Strip share count prefix: "500 Shares - Pembroke" → "Pembroke"
        const cleanProductName = productName
          .replace(/^\d+\s*-?\s*shares?\s*-?\s*/i, '')
          .replace(/^rent\s*2\s*rent\s*-\s*shares?\s*-?\s*/i, '')
          .trim()

        const { data: matchedProp } = await supabase
          .from('inv_properties')
          .select('id')
          .or(`title.ilike.%${productName}%,title.ilike.%${cleanProductName}%`)
          .limit(1)
          .maybeSingle()

        if (matchedProp) {
          propertyId = matchedProp.id
        } else {
          const { data: firstProp } = await supabase
            .from('inv_properties')
            .select('id')
            .eq('status', 'open')
            .order('id', { ascending: true })
            .limit(1)
            .maybeSingle()
          propertyId = firstProp?.id || null
        }
      } else {
        const { data: firstProp } = await supabase
          .from('inv_properties')
          .select('id')
          .eq('status', 'open')
          .order('id', { ascending: true })
          .limit(1)
          .maybeSingle()
        propertyId = firstProp?.id || null
      }

      if (!propertyId) {
        return new Response(JSON.stringify({ error: 'No active properties found' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Get property details — try by id first, then by blockchain_property_id
    let { data: property } = await supabase
      .from('inv_properties')
      .select('id, blockchain_property_id, price_per_share, shares_sold, total_shares')
      .eq('id', propertyId)
      .single()

    if (!property) {
      // Fallback: the parsed propertyId might be a blockchain_property_id
      const { data: fallbackProp } = await supabase
        .from('inv_properties')
        .select('id, blockchain_property_id, price_per_share, shares_sold, total_shares')
        .eq('blockchain_property_id', propertyId)
        .maybeSingle()
      if (fallbackProp) {
        property = fallbackProp
        propertyId = fallbackProp.id // use Supabase id for all DB operations
        console.log(`Resolved blockchain_property_id=${fallbackProp.blockchain_property_id} → Supabase id=${propertyId}`)
      }
    }

    if (!property) {
      return new Response(JSON.stringify({ error: 'Property not found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const pps = Number(property.price_per_share) || 0
    const sharesRequested = pps > 0 ? Math.floor(amount / pps) : 0

    // Look up agent by referral code or wallet
    let agentUserId: string | null = null
    if (agentCode) {
      const { data: agentProfile } = await supabase
        .from('aff_profiles')
        .select('user_id')
        .eq('referral_code', agentCode.toUpperCase())
        .maybeSingle()
      agentUserId = agentProfile?.user_id || null
    }
    if (!agentUserId && phoneAgentWallet) {
      const { data: agentByWallet } = await supabase
        .from('profiles')
        .select('id')
        .ilike('wallet_address', phoneAgentWallet)
        .maybeSingle()
      agentUserId = agentByWallet?.id || null
    }

    // Fallback: resolve agent from buyer's referred_by field
    if (!agentUserId && userId) {
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('id', userId)
        .maybeSingle()

      if (buyerProfile?.referred_by) {
        // Try current referral_code first
        const { data: affByCode } = await supabase
          .from('aff_profiles')
          .select('user_id')
          .eq('referral_code', buyerProfile.referred_by)
          .maybeSingle()

        if (affByCode?.user_id) {
          agentUserId = affByCode.user_id
          console.log(`Agent resolved from buyer referred_by: ${buyerProfile.referred_by} → ${agentUserId}`)
        } else {
          // Fallback: check previous_codes (agent may have changed their code)
          const { data: affByOldCode } = await supabase
            .from('aff_profiles')
            .select('user_id')
            .contains('previous_codes', [buyerProfile.referred_by])
            .maybeSingle()

          if (affByOldCode?.user_id) {
            agentUserId = affByOldCode.user_id
            console.log(`Agent resolved from previous_codes: ${buyerProfile.referred_by} → ${agentUserId}`)
          }
        }
      }
    }

    // Check for duplicate order (idempotency)
    if (transactionId) {
      const { data: existingOrder } = await supabase
        .from('inv_orders')
        .select('id')
        .eq('external_order_id', String(transactionId))
        .maybeSingle()

      if (existingOrder) {
        return new Response(JSON.stringify({ status: 'duplicate', order_id: existingOrder.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const sharesStored = sharesRequested > 0 ? sharesRequested : 0

    // Create order as PENDING — admin must approve before shares are granted
    const { data: order, error: orderErr } = await supabase
      .from('inv_orders')
      .insert({
        user_id: userId,
        property_id: propertyId,
        shares_requested: sharesStored,
        amount_paid: amount,
        payment_method: 'card',
        agent_id: agentUserId,
        status: 'pending',
        external_order_id: transactionId ? String(transactionId) : null,
      })
      .select()
      .single()

    if (orderErr) throw orderErr

    // Shareholdings and shares_sold are NOT updated here — that happens on admin approve.

    // Create agent commission if applicable (commissions are created at webhook time)
    if (agentUserId) {
      await createCommission(supabase, agentUserId, userId, propertyId, amount, order.id)
    }

    // Send notification via n8n
    await sendNotification(
      firstName || profileName || 'Investor',
      amount,
      productName,
      email,
      phone,
      userId,
    )

    // Audit log
    await supabase.from('payout_audit_log').insert({
      user_id: userId,
      event_type: 'samcart_order_pending',
      performed_by: 'system',
      metadata: {
        order_id: order.id,
        amount,
        shares: sharesRequested,
        property_id: propertyId,
        agent: agentCode,
        flow: 'direct_payload',
      },
    })

    return new Response(
      JSON.stringify({
        status: 'pending',
        order_id: order.id,
        shares: sharesRequested,
        property_id: propertyId,
        message:
          sharesRequested > 0 ? undefined : 'Payment recorded; amount below one full share',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    console.error('SamCart webhook error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Create affiliate commission for an agent */
async function createCommission(
  supabase: any,
  agentUserId: string,
  referredUserId: string,
  propertyId: number,
  amount: number,
  orderId: string,
) {
  try {
    let affProfile = await supabase
      .from('aff_profiles')
      .select('id')
      .eq('user_id', agentUserId)
      .maybeSingle()
      .then((r: any) => r.data)

    if (!affProfile) {
      // Auto-create aff_profiles entry for this agent
      const { data: agentUser } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', agentUserId)
        .maybeSingle()

      const code = (agentUser?.name || 'AGENT').substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X')
        + Math.random().toString(36).substring(2, 4).toUpperCase()

      const { data: newAff, error: affErr } = await supabase
        .from('aff_profiles')
        .insert({
          user_id: agentUserId,
          referral_code: code,
          full_name: agentUser?.name || agentUser?.email || 'Agent',
          tier: 'standard',
          total_earned: 0,
          total_claimed: 0,
          pending_balance: 0,
          link_clicks: 0,
          signups: 0,
          paid_users: 0,
        })
        .select('id')
        .single()

      if (affErr) {
        console.log('Failed to auto-create aff_profile:', affErr)
        return
      }
      affProfile = newAff
    }

    // Get rate (user-specific or global)
    const { data: customRate } = await supabase
      .from('aff_commission_settings')
      .select('rate')
      .eq('user_id', agentUserId)
      .eq('commission_type', 'investment_first')
      .maybeSingle()

    const { data: globalRate } = await supabase
      .from('aff_commission_settings')
      .select('rate')
      .is('user_id', null)
      .eq('commission_type', 'investment_first')
      .maybeSingle()

    const rate = customRate?.rate || globalRate?.rate || 0.05
    const commissionAmount = amount * rate

    await supabase.from('aff_commissions').insert({
      affiliate_id: affProfile.id,
      source: 'investment_first',
      source_id: orderId,
      referred_user_id: referredUserId,
      property_id: propertyId,
      gross_amount: amount,
      commission_rate: rate,
      commission_amount: commissionAmount,
      claimable_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
  } catch (e) {
    // Don't fail the webhook if commission creation fails
    console.log('Commission creation failed:', e)
  }
}

/** Send purchase notification via n8n */
async function sendNotification(
  userName: string,
  amount: number,
  productName: string,
  email: string | null,
  phone: string | null,
  userId: string,
) {
  const n8nUrl = Deno.env.get('VITE_N8N_WEBHOOK_URL') || 'https://n8n.srv886554.hstgr.cloud/webhook'
  try {
    await fetch(`${n8nUrl}/inv-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'purchase_confirmed',
        user_name: userName,
        amount,
        property: productName,
        email,
        phone,
        user_id: userId,
      }),
    })
  } catch (e) {
    // Don't fail the webhook if notification fails
    console.log('Notification failed:', e)
  }
}
