// ghl-payment-webhook — Handles GHL "Order Submitted" trigger
// Replaces the deactivated n8n workflow wsDjAdpWnjqnO7ML
//
// GHL fires this when a user completes payment in the funnel.
// Updates profiles.tier + records affiliate commission if referred.
//
// Input from GHL Custom Webhook:
// { email, contact_id, first_name, phone, product_id?, amount? }

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
    // 1. Parse body (JSON or form-urlencoded)
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

    console.log(`[ghl-payment-webhook] email=${email} product_id=${productId} amount=${amount} contact_id=${contactId}`)

    if (!email) {
      console.error('[ghl-payment-webhook] No email in payload')
      return new Response(JSON.stringify({ error: 'Missing email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Determine tier from product_id or amount
    let tier = PRODUCT_ID_TO_TIER[productId] || null
    if (!tier && amount > 0) {
      tier = AMOUNT_TO_TIER[amount] || null
    }
    if (!tier) {
      // Default to monthly if we can't determine
      console.warn(`[ghl-payment-webhook] Could not determine tier from product_id=${productId} amount=${amount}, defaulting to monthly`)
      tier = 'monthly'
    }

    console.log(`[ghl-payment-webhook] Mapped tier: ${tier}`)

    // 3. Find user by email
    const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers({ perPage: 1, page: 1 })
    // listUsers doesn't filter by email, so use profiles table instead
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email, tier, referred_by')
      .eq('email', email)
      .single()

    if (profileErr || !profile) {
      // Try auth.users as fallback
      console.warn(`[ghl-payment-webhook] Profile not found for ${email}, trying auth.users`)
      const { data: authUser } = await supabase.auth.admin.listUsers()
      const matchedUser = authUser?.users?.find(u => u.email?.toLowerCase() === email)
      if (!matchedUser) {
        console.error(`[ghl-payment-webhook] No user found for email ${email}`)
        return new Response(JSON.stringify({ error: 'User not found', email }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      // Create/update profile
      await supabase.from('profiles').upsert({
        id: matchedUser.id,
        email,
        tier,
        name: firstName || null,
      }, { onConflict: 'id' })
      console.log(`[ghl-payment-webhook] Created/updated profile for ${email} with tier=${tier}`)

      return new Response(JSON.stringify({ success: true, tier, user_id: matchedUser.id, affiliate: false }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Update profiles.tier
    const previousTier = profile.tier
    if (previousTier === tier) {
      console.log(`[ghl-payment-webhook] Tier already set to ${tier} for ${email}, skipping`)
      return new Response(JSON.stringify({ success: true, tier, user_id: profile.id, already_set: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ tier })
      .eq('id', profile.id)

    if (updateErr) {
      console.error(`[ghl-payment-webhook] Failed to update tier:`, updateErr)
      return new Response(JSON.stringify({ error: 'Failed to update tier', detail: updateErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[ghl-payment-webhook] Updated ${email} tier: ${previousTier} → ${tier}`)

    // 5. Handle affiliate commission
    let affiliateHandled = false
    const referredBy = profile.referred_by

    if (referredBy) {
      try {
        // Create aff_events row
        const commissionAmount = TIER_AMOUNTS[tier] || 67
        const { error: eventErr } = await supabase.from('aff_events').insert({
          referral_code: referredBy,
          user_id: profile.id,
          event_type: 'subscription',
          amount: commissionAmount,
          payment_id: `ghl-${profile.id}-${Date.now()}`,
          tier,
        })

        if (eventErr) {
          console.error(`[ghl-payment-webhook] Failed to create aff_event:`, eventErr)
        } else {
          console.log(`[ghl-payment-webhook] Created aff_event: code=${referredBy} amount=${commissionAmount} tier=${tier}`)

          // Increment aff_profiles.paid_users and total_earned
          // Calculate commission: 40% of the tier amount
          const commissionRate = 0.40
          const commission = Math.round(commissionAmount * commissionRate * 100) / 100

          const { error: affUpdateErr } = await supabase.rpc('increment_affiliate_stats', {
            p_referral_code: referredBy,
            p_paid_users_inc: 1,
            p_earned_inc: commission,
          })

          if (affUpdateErr) {
            // Fallback: manual update if RPC doesn't exist
            console.warn(`[ghl-payment-webhook] RPC failed, trying manual update:`, affUpdateErr)
            const { data: affProfile } = await supabase
              .from('aff_profiles')
              .select('id, paid_users, total_earned')
              .eq('referral_code', referredBy)
              .single()

            if (affProfile) {
              await supabase.from('aff_profiles').update({
                paid_users: (affProfile.paid_users || 0) + 1,
                total_earned: (affProfile.total_earned || 0) + commission,
              }).eq('id', affProfile.id)
              console.log(`[ghl-payment-webhook] Updated aff_profiles: paid_users+1, earned+${commission}`)
            }
          }

          affiliateHandled = true
        }
      } catch (e) {
        console.error(`[ghl-payment-webhook] Affiliate processing error:`, e)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      tier,
      previous_tier: previousTier,
      user_id: profile.id,
      affiliate: affiliateHandled,
      referred_by: referredBy || null,
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
