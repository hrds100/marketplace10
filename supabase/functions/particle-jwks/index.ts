// particle-jwks — Serves our RSA public key in JWKS format
// Particle Network calls this to verify our JWT signatures
// URL: https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/particle-jwks

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=3600',
}

// Public key in JWK format — generated from our RSA key pair
// This is the PUBLIC key only — safe to expose
const JWKS = {
  keys: [
    {
      kty: "RSA",
      n: "xMNM2WeDtc8GQ0l-7bTBTBO_8fowfoS-Da5XxPD9cMzZXd2CQKy-zA7lNa341cWcp7jjbwN9-VQbSerdJ5SHABnDgLgap4nTJGtvmEXQpiR3uQvyX17H3PLEzbdcoIHPk9gXP8UsFXLELuKdkoi6OunZnEARtiTEIzX2v0ATKk33qL3fP3A8--WYAMCMy4O1r3SSuUZcoE-0nS_o_VO0k4pRuOSK3ndlA87Xq9gZJPlwot6cZlW4v1x4g3Qbk41yZTON7eRAEyqAsSROZDSXd--7pi4tFR-3AMnFsTXS_I0pjuEAxBr1tNe_O_4OlGVUn5LU6or4ITwX9TxAOMr3_Q",
      e: "AQAB",
      alg: "RS256",
      use: "sig",
      kid: "nfstay-hub-1"
    }
  ]
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only GET allowed
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  return new Response(JSON.stringify(JWKS), { headers: corsHeaders })
})
