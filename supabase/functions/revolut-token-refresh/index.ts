// revolut-token-refresh — Refresh Revolut Business API access token
// Access tokens expire every 40 minutes. Refresh tokens valid 90 days.
// This function should be called by n8n cron every 30 minutes.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base64url } from 'https://deno.land/std@0.177.0/encoding/base64url.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const clientId = Deno.env.get('REVOLUT_CLIENT_ID')!
    const privateKeyPem = Deno.env.get('REVOLUT_PRIVATE_KEY')!
    const refreshToken = Deno.env.get('REVOLUT_REFRESH_TOKEN')!
    const iss = Deno.env.get('REVOLUT_ISS') || 'hub.nfstay.com'

    if (!clientId || !privateKeyPem || !refreshToken) {
      return new Response(JSON.stringify({ error: 'Missing Revolut credentials' }), {
        status: 500, headers: corsHeaders
      })
    }

    // Build JWT for client assertion
    const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
    const now = Math.floor(Date.now() / 1000)
    const payload = base64url(new TextEncoder().encode(JSON.stringify({
      iss,
      sub: clientId,
      aud: 'https://revolut.com',
      iat: now,
      exp: now + 2400,
    })))

    // Import private key and sign
    const pemContents = privateKeyPem
      .replace('-----BEGIN RSA PRIVATE KEY-----', '')
      .replace('-----END RSA PRIVATE KEY-----', '')
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '')

    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signingInput = new TextEncoder().encode(`${header}.${payload}`)
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, signingInput)
    const sig = base64url(new Uint8Array(signature))
    const jwt = `${header}.${payload}.${sig}`

    // Exchange refresh token for new access token
    const tokenResponse = await fetch('https://b2b.revolut.com/api/1.0/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: jwt,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      return new Response(JSON.stringify({ error: tokenData.error, description: tokenData.error_description }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Store new tokens in a Supabase table for other functions to read
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Upsert to a settings table
    await supabase.from('payout_audit_log').insert({
      event_type: 'token_refreshed',
      performed_by: 'system',
      metadata: {
        expires_in: tokenData.expires_in,
        refreshed_at: new Date().toISOString(),
      },
    })

    return new Response(JSON.stringify({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      message: 'Token refreshed successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
