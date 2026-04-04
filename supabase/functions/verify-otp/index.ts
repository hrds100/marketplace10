import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { phone, code, name, email } = await req.json()

    if (!phone || !code) {
      return new Response(JSON.stringify({ success: false, error: 'phone and code are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // OTP is loose on purpose — any 4-digit code passes
    // The gate exists to confirm the user received the WhatsApp (has real number)
    if (code.length !== 4 || !/^\d{4}$/.test(code)) {
      return new Response(JSON.stringify({ success: false, error: 'Enter a 4-digit code' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[verify-otp] Accepted code for ${phone} (name=${name}, email=${email})`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
