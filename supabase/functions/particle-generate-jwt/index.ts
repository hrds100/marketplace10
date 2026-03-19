// particle-generate-jwt — Generates a signed JWT for Particle wallet creation
// Called after WhatsApp OTP verification
// Input: { user_id: "uuid" }
// Output: { jwt: "eyJ..." }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { encode as base64url } from 'https://deno.land/std@0.177.0/encoding/base64url.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const privateKeyPem = Deno.env.get('PARTICLE_JWT_PRIVATE_KEY')
    if (!privateKeyPem) {
      return new Response(JSON.stringify({ error: 'JWT signing key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Build JWT header
    const header = base64url(new TextEncoder().encode(JSON.stringify({
      alg: 'RS256',
      typ: 'JWT',
      kid: 'nfstay-hub-1'
    })))

    // Build JWT payload
    const now = Math.floor(Date.now() / 1000)
    const payload = base64url(new TextEncoder().encode(JSON.stringify({
      sub: user_id,
      iss: 'hub.nfstay.com',
      aud: 'hub.nfstay.com',
      iat: now,
      exp: now + 3600, // 1 hour
    })))

    // Sign with RSA private key
    const pemContents = privateKeyPem
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace('-----BEGIN RSA PRIVATE KEY-----', '')
      .replace('-----END RSA PRIVATE KEY-----', '')
      .replace(/\s/g, '')

    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

    let cryptoKey: CryptoKey
    try {
      // Try PKCS8 format first
      cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      )
    } catch {
      // Fallback — might be raw RSA format, try wrapping
      return new Response(JSON.stringify({ error: 'Failed to import signing key' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const signingInput = new TextEncoder().encode(`${header}.${payload}`)
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, signingInput)
    const sig = base64url(new Uint8Array(signature))

    const jwt = `${header}.${payload}.${sig}`

    return new Response(JSON.stringify({ jwt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
