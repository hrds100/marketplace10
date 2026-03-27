import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { thread_id, requesting_user_id } = await req.json()
    if (!thread_id || !requesting_user_id) {
      return new Response(JSON.stringify({ error: 'thread_id and requesting_user_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get the other party's whatsapp from the thread
    const { data: thread } = await supabaseAdmin
      .from('chat_threads')
      .select('operator_id, landlord_id')
      .eq('id', thread_id)
      .maybeSingle()

    if (!thread) {
      return new Response(JSON.stringify({ whatsapp: '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // The other party is whoever is NOT the requesting user
    const otherId = thread.operator_id === requesting_user_id
      ? thread.landlord_id
      : thread.operator_id

    if (!otherId) {
      return new Response(JSON.stringify({ whatsapp: '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('whatsapp')
      .eq('id', otherId)
      .maybeSingle()

    return new Response(JSON.stringify({ whatsapp: profile?.whatsapp || '' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
