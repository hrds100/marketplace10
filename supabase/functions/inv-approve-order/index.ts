// inv-approve-order — Admin approves a pending order, sends shares on-chain, updates DB
// Called from AdminInvestOrders page when admin clicks "Approve"

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ethers } from 'https://esm.sh/ethers@5.7.2'

const RPC_URL = 'https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T'
const MARKETPLACE_ADDRESS = '0xDD22fDC50062F49a460E5a6bADF96Cbec85ac128'
const SEND_PRIMARY_ABI = [
  'function sendPrimaryShares(address recipient, address agentWallet, uint256 propertyId, uint256 sharesRequested) external payable',
]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_EMAILS = ['admin@hub.nfstay.com', 'hugo@nfstay.com']

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { order_id } = await req.json()
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!ADMIN_EMAILS.includes(user.email || '')) {
      return new Response(JSON.stringify({ error: 'Not authorized - admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from('inv_orders')
      .select('*')
      .eq('id', order_id)
      .single()
    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (order.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Order is ${order.status}, not pending` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch the property
    const { data: property, error: propError } = await supabase
      .from('inv_properties')
      .select('*')
      .eq('id', order.property_id)
      .single()
    if (propError || !property) {
      return new Response(JSON.stringify({ error: 'Property not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch buyer wallet from profiles
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('wallet_address, email')
      .eq('id', order.user_id)
      .single()
    const recipientWallet = buyerProfile?.wallet_address || order.wallet_address
    if (!recipientWallet) {
      return new Response(JSON.stringify({ error: 'Buyer has no wallet address' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch agent wallet if agent_id exists
    let agentWallet = '0x0000000000000000000000000000000000000000'
    if (order.agent_id) {
      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('id', order.agent_id)
        .single()
      if (agentProfile?.wallet_address) {
        agentWallet = agentProfile.wallet_address
      }
    } else if (order.agent_wallet) {
      agentWallet = order.agent_wallet
    }

    const shares = order.shares_requested ?? order.shares ?? 0
    const amountPaid = order.amount_paid ?? order.amount ?? 0

    // If zero or negative shares, mark complete without on-chain
    if (shares <= 0) {
      await supabase
        .from('inv_orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', order_id)

      return new Response(JSON.stringify({
        status: 'approved',
        order_id,
        message: 'Below minimum shares - marked complete without on-chain',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send shares on-chain
    let txHash: string
    try {
      const privateKey = Deno.env.get('BACKEND_PRIVATE_KEY')
      if (!privateKey) throw new Error('BACKEND_PRIVATE_KEY not set')

      const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
      const wallet = new ethers.Wallet(privateKey, provider)
      const contract = new ethers.Contract(MARKETPLACE_ADDRESS, SEND_PRIMARY_ABI, wallet)

      const propertyBlockchainId = property.blockchain_property_id
      if (!propertyBlockchainId && propertyBlockchainId !== 0) {
        throw new Error('Property has no blockchain_property_id')
      }

      // Dry-run first
      await contract.callStatic.sendPrimaryShares(recipientWallet, agentWallet, propertyBlockchainId, shares)

      // Execute real transaction
      const tx = await contract.sendPrimaryShares(recipientWallet, agentWallet, propertyBlockchainId, shares)
      const receipt = await tx.wait()
      txHash = receipt.transactionHash
    } catch (chainErr: any) {
      // Log chain failure to audit log
      await supabase.from('payout_audit_log').insert({
        event_type: 'admin_order_chain_failed',
        metadata: {
          order_id,
          shares,
          error: chainErr.message || String(chainErr),
          recipient: recipientWallet,
          agent: agentWallet,
        },
      })

      return new Response(JSON.stringify({ error: `Blockchain transaction failed: ${chainErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // On-chain success — update order
    await supabase
      .from('inv_orders')
      .update({ status: 'completed', tx_hash: txHash, updated_at: new Date().toISOString() })
      .eq('id', order_id)

    // Upsert shareholdings (same logic as inv-samcart-webhook)
    const { data: existing } = await supabase
      .from('inv_shareholdings')
      .select('id, shares_owned, invested_amount')
      .eq('user_id', order.user_id)
      .eq('property_id', order.property_id)
      .maybeSingle()

    if (existing) {
      await supabase.from('inv_shareholdings').update({
        shares_owned: existing.shares_owned + shares,
        invested_amount: existing.invested_amount + amountPaid,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('inv_shareholdings').insert({
        user_id: order.user_id,
        property_id: order.property_id,
        shares_owned: shares,
        invested_amount: amountPaid,
        current_value: amountPaid,
      })
    }

    // Update property shares_sold
    await supabase.from('inv_properties').update({
      shares_sold: (property.shares_sold || 0) + shares,
    }).eq('id', order.property_id)

    // Email buyer: shares allocated
    const buyerEmail = buyerProfile?.email || (await supabase.from('profiles').select('email').eq('id', order.user_id).maybeSingle()).data?.email
    if (buyerEmail) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'inv-order-approved-buyer',
          data: {
            email: buyerEmail,
            property: property.title || `Property #${order.property_id}`,
            shares,
            amount: amountPaid,
            txHash,
          },
        }),
      }).catch(() => {})
    }

    // Write audit log
    await supabase.from('payout_audit_log').insert({
      event_type: 'admin_order_approved',
      metadata: {
        order_id,
        shares,
        tx_hash: txHash,
        recipient: recipientWallet,
        agent: agentWallet,
        approved_by: user.email,
      },
    })

    return new Response(JSON.stringify({
      status: 'approved',
      order_id,
      tx_hash: txHash,
      shares,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
