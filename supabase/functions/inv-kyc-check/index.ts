// inv-kyc-check — Check KYC status for authenticated user
// If a Veriff session exists and is not yet approved, queries Veriff API for latest status
// Input: POST { user_id }
// Output: { status, session_id }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Look up KYC session for this user
    const { data: session, error: lookupErr } = await supabase
      .from('inv_kyc_sessions')
      .select('id, user_id, session_id, status')
      .eq('user_id', user_id)
      .maybeSingle()

    if (lookupErr) {
      console.error('KYC lookup error:', lookupErr)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No row — check legacy KYC before returning not_started
    if (!session) {
      try {
        // Step 1: Get wallet address from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_address')
          .eq('id', user_id)
          .maybeSingle()

        if (profile?.wallet_address) {
          console.log('Legacy KYC check for wallet:', profile.wallet_address)

          // Step 2: Check legacy API for existing Veriff session
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 5000)

          try {
            const legacyRes = await fetch(
              `https://be.nfstay.com/api/kyc/check-wallet/${profile.wallet_address}`,
              { signal: controller.signal }
            )
            clearTimeout(timeout)

            if (legacyRes.ok) {
              const legacyData = await legacyRes.json()

              if (legacyData?.sessionId) {
                // Step 3: Check Veriff API for this legacy session
                const veriffApiKey = Deno.env.get('VERIFF_API_KEY')
                const veriffSecretKey = Deno.env.get('VERIFF_SECRET_KEY')

                if (veriffApiKey && veriffSecretKey) {
                  const signature = createHmac('sha256', veriffSecretKey)
                    .update(legacyData.sessionId)
                    .digest('hex')

                  const veriffResponse = await fetch(
                    `https://stationapi.veriff.com/v1/sessions/${legacyData.sessionId}/decision/fullauto?version=1.0.0`,
                    {
                      headers: {
                        'Content-Type': 'application/json',
                        'X-AUTH-CLIENT': veriffApiKey,
                        'X-HMAC-SIGNATURE': signature,
                      },
                    }
                  )

                  if (veriffResponse.ok) {
                    const veriffData = await veriffResponse.json()
                    const decision = veriffData?.decision || 'pending'

                    // Step 4: Only migrate if approved
                    if (decision === 'approved') {
                      await supabase
                        .from('inv_kyc_sessions')
                        .insert({
                          user_id,
                          wallet_address: profile.wallet_address,
                          session_id: legacyData.sessionId,
                          status: 'approved',
                        })

                      return new Response(
                        JSON.stringify({ status: 'approved', session_id: legacyData.sessionId }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                      )
                    }
                    // Step 5: Not approved — fall through to not_started
                  }
                }
              }
            }
          } catch (legacyFetchErr) {
            clearTimeout(timeout)
            console.error('Legacy KYC fetch failed:', legacyFetchErr)
          }
        }
      } catch (legacyErr) {
        console.error('Legacy KYC lookup error:', legacyErr)
      }

      return new Response(
        JSON.stringify({ status: 'not_started', session_id: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Already approved — return immediately without calling Veriff
    if (session.status === 'approved') {
      return new Response(
        JSON.stringify({ status: 'approved', session_id: session.session_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Has a session_id but not approved — check Veriff API for latest status
    if (session.session_id) {
      try {
        const veriffApiKey = Deno.env.get('VERIFF_API_KEY')
        const veriffSecretKey = Deno.env.get('VERIFF_SECRET_KEY')

        if (!veriffApiKey || !veriffSecretKey) {
          console.error('Missing Veriff credentials in env')
          return new Response(
            JSON.stringify({ status: session.status, session_id: session.session_id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // HMAC signature using session_id
        const signature = createHmac('sha256', veriffSecretKey)
          .update(session.session_id)
          .digest('hex')

        const veriffResponse = await fetch(
          `https://stationapi.veriff.com/v1/sessions/${session.session_id}/decision/fullauto?version=1.0.0`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-AUTH-CLIENT': veriffApiKey,
              'X-HMAC-SIGNATURE': signature,
            },
          }
        )

        if (veriffResponse.ok) {
          const veriffData = await veriffResponse.json()
          const decision = veriffData?.decision || 'pending'
          const newStatus = decision === 'approved' ? 'approved' : decision === 'declined' ? 'declined' : 'pending'

          // Update local record
          await supabase
            .from('inv_kyc_sessions')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('user_id', user_id)

          return new Response(
            JSON.stringify({ status: newStatus, session_id: session.session_id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          console.error('Veriff API error:', veriffResponse.status, await veriffResponse.text())
        }
      } catch (veriffErr) {
        console.error('Veriff check failed:', veriffErr)
      }

      // Fallback: return current DB status if Veriff call fails
      return new Response(
        JSON.stringify({ status: session.status, session_id: session.session_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Row exists but no session_id — not started yet
    return new Response(
      JSON.stringify({ status: 'not_started', session_id: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('inv-kyc-check error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
