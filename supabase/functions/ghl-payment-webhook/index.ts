// ghl-payment-webhook — Handles GHL "Order Submitted" + "Subscription Cancelled"
// Replaces the deactivated n8n workflow wsDjAdpWnjqnO7ML
//
// GHL fires this when a user completes payment OR cancels subscription.
// Supports multiple calls per funnel (cart → upsell → downsell) — always
// UPGRADES to the highest tier, never downgrades.
//
// Input from GHL Custom Webhook:
// Payment: { email, contact_id, first_name, phone, product_id?, amount? }
// Cancel:  { email, contact_id, action: "cancel" }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Product ID → tier mapping (same as src/core/integrations/ghl.ts)
const PRODUCT_ID_TO_TIER: Record<string, string> = {
  '69b5c27da3434d4750457c80': 'monthly',
  '69b5c2d26831635e6c3edb65': 'lifetime',
  '69b5cd925759e2ddcf750aa9': 'yearly',
  // Legacy IDs
  '69b5b769081db66d1afbf145': 'monthly',
  '69b5b777711f98f382f110ff': 'lifetime',
  '69b5b7791fe1a8f21eb651b5': 'yearly',
}

// Amount → tier fallback (GBP)
const AMOUNT_TO_TIER: Record<number, string> = {
  67: 'monthly',
  397: 'yearly',
  997: 'lifetime',
  5: 'monthly', // trial price
}

// Tier priority — higher number = better tier. Never downgrade.
const TIER_PRIORITY: Record<string, number> = {
  free: 0,
  monthly: 1,
  yearly: 2,
  lifetime: 3,
}

const TIER_AMOUNTS: Record<string, number> = {
  monthly: 67,
  yearly: 397,
  lifetime: 997,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // 1. Parse body
    const bodyText = await req.text()
    console.log('[ghl-payment-webhook] Raw body:', bodyText.substring(0, 500))

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(bodyText)
    } catch {
      payload = Object.fromEntries(new URLSearchParams(bodyText).entries())
    }

    const email = String(payload.email || '').trim().toLowerCase()
    const contactId = String(payload.contact_id || '')
    const firstName = String(payload.first_name || '')
    const phone = String(payload.phone || '')
    const productId = String(payload.product_id || '')
    const amount = parseFloat(String(payload.amount || '0')) || 0
    const action = String(payload.action || '').toLowerCase()

    console.log(`[ghl-payment-webhook] email=${email} product_id=${productId} amount=${amount} action=${action}`)

    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Find user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, tier, referred_by')
      .eq('email', email)
      .single()

    if (!profile) {
      // Fallback: search auth.users
      const { data: authData } = await supabase.auth.admin.listUsers()
      const matchedUser = authData?.users?.find(u => u.email?.toLowerCase() === email)
      if (!matchedUser) {
        console.error(`[ghl-payment-webhook] No user found for ${email}`)
        return new Response(JSON.stringify({ error: 'User not found', email }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      // Create profile with tier
      const tier = action === 'cancel' ? 'free' : (PRODUCT_ID_TO_TIER[productId] || AMOUNT_TO_TIER[amount] || 'monthly')
      await supabase.from('profiles').upsert({ id: matchedUser.id, email, tier, name: firstName || null }, { onConflict: 'id' })
      return new Response(JSON.stringify({ success: true, tier, user_id: matchedUser.id }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Handle CANCELLATION
    if (action === 'cancel') {
      const previousTier = profile.tier
      await supabase.from('profiles').update({ tier: 'free' }).eq('id', profile.id)
      console.log(`[ghl-payment-webhook] CANCELLED: ${email} tier ${previousTier} → free`)
      return new Response(JSON.stringify({ success: true, action: 'cancel', previous_tier: previousTier, tier: 'free' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Determine tier from product_id or amount
    let tier = PRODUCT_ID_TO_TIER[productId] || null
    if (!tier && amount > 0) {
      tier = AMOUNT_TO_TIER[amount] || null
    }
    if (!tier) {
      console.warn(`[ghl-payment-webhook] Could not determine tier from product_id=${productId} amount=${amount}, defaulting to monthly`)
      tier = 'monthly'
    }

    // 5. UPGRADE LOGIC — never downgrade
    const currentPriority = TIER_PRIORITY[profile.tier || 'free'] || 0
    const newPriority = TIER_PRIORITY[tier] || 0

    if (newPriority <= currentPriority && profile.tier !== 'free') {
      console.log(`[ghl-payment-webhook] Skipping: ${email} already has ${profile.tier} (priority ${currentPriority}), incoming ${tier} (priority ${newPriority})`)
      return new Response(JSON.stringify({ success: true, tier: profile.tier, incoming_tier: tier, skipped: true, reason: 'current tier is equal or higher' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 6. Update tier
    const previousTier = profile.tier
    await supabase.from('profiles').update({ tier }).eq('id', profile.id)
    console.log(`[ghl-payment-webhook] UPGRADED: ${email} tier ${previousTier} → ${tier}`)

    // 7. Handle affiliate commission (only for the FIRST payment, not upgrades from paid→paid)
    let affiliateHandled = false
    const referredBy = profile.referred_by
    const isFirstPayment = !previousTier || previousTier === 'free'

    if (referredBy && isFirstPayment) {
      try {
        const { data: affProfile } = await supabase
          .from('aff_profiles')
          .select('id, paid_users, total_earned, pending_balance')
          .eq('referral_code', referredBy)
          .single()

        if (affProfile) {
          const paymentAmount = TIER_AMOUNTS[tier] || 67
          const commissionRate = 0.40
          const commission = Math.round(paymentAmount * commissionRate * 100) / 100
          const claimableAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

          // Create aff_commissions row
          await supabase.from('aff_commissions').insert({
            affiliate_id: affProfile.id,
            source: 'subscription',
            source_id: `ghl-${profile.id}-${Date.now()}`,
            referred_user_id: profile.id,
            gross_amount: paymentAmount,
            commission_rate: commissionRate,
            commission_amount: commission,
            currency: 'GBP',
            status: 'pending',
            claimable_at: claimableAt,
          }).then(() => {}).catch(e => console.error('[ghl-payment-webhook] aff_commission error:', e))

          // Create aff_events row
          await supabase.from('aff_events').insert({
            affiliate_id: affProfile.id,
            event_type: 'payment',
            referred_user_id: profile.id,
            amount: commission,
            commission_type: 'subscription',
            metadata: { tier, payment_amount: paymentAmount, source: 'ghl-payment-webhook' },
          }).then(() => {}).catch(e => console.error('[ghl-payment-webhook] aff_event error:', e))

          // Update aff_profiles counters
          await supabase.from('aff_profiles').update({
            paid_users: (affProfile.paid_users || 0) + 1,
            total_earned: (affProfile.total_earned || 0) + commission,
            pending_balance: (affProfile.pending_balance || 0) + commission,
          }).eq('id', affProfile.id)

          console.log(`[ghl-payment-webhook] Affiliate commission: code=${referredBy} £${commission} for ${tier}`)
          affiliateHandled = true
        }
      } catch (e) {
        console.error('[ghl-payment-webhook] Affiliate error:', e)
      }
    } else if (referredBy && !isFirstPayment) {
      // Upgrade from paid→paid (e.g. monthly→lifetime): update the commission to the higher amount
      // Find and update the existing commission for this user
      try {
        const { data: affProfile } = await supabase
          .from('aff_profiles')
          .select('id, total_earned, pending_balance')
          .eq('referral_code', referredBy)
          .single()

        if (affProfile) {
          const oldAmount = TIER_AMOUNTS[previousTier || 'monthly'] || 67
          const newAmount = TIER_AMOUNTS[tier] || 67
          const oldCommission = Math.round(oldAmount * 0.40 * 100) / 100
          const newCommission = Math.round(newAmount * 0.40 * 100) / 100
          const diff = newCommission - oldCommission

          if (diff > 0) {
            // Update the existing commission to the higher amount
            const { data: existingComm } = await supabase
              .from('aff_commissions')
              .select('id, commission_amount')
              .eq('affiliate_id', affProfile.id)
              .eq('referred_user_id', profile.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (existingComm) {
              await supabase.from('aff_commissions').update({
                gross_amount: newAmount,
                commission_amount: newCommission,
              }).eq('id', existingComm.id)
            }

            // Update aff_profiles with the difference
            await supabase.from('aff_profiles').update({
              total_earned: (affProfile.total_earned || 0) + diff,
              pending_balance: (affProfile.pending_balance || 0) + diff,
            }).eq('id', affProfile.id)

            console.log(`[ghl-payment-webhook] Affiliate upgrade: ${previousTier}→${tier}, commission diff +£${diff}`)
          }
        }
      } catch (e) {
        console.error('[ghl-payment-webhook] Affiliate upgrade error:', e)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      tier,
      previous_tier: previousTier,
      upgraded: true,
      user_id: profile.id,
      affiliate: affiliateHandled,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[ghl-payment-webhook] Error:', err)
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
