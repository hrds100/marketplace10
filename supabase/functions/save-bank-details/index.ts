// save-bank-details — Save user's bank details for Revolut payouts
// Trigger: User submits bank details form
// Input: { user_id, currency, account_name, sort_code?, account_number?, iban?, bic?, bank_country }
// Output: { id, message }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const body = await req.json()
    const { user_id, currency, account_name, sort_code, account_number, iban, bic, bank_country } = body

    if (!user_id || !currency || !account_name || !bank_country) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders })
    }

    // Validate GBP fields
    if (currency === 'GBP') {
      if (!sort_code || !account_number) {
        return new Response(JSON.stringify({ error: 'Sort code and account number required for GBP' }), { status: 400, headers: corsHeaders })
      }
      const cleanSort = sort_code.replace(/[^0-9]/g, '')
      if (cleanSort.length !== 6) {
        return new Response(JSON.stringify({ error: 'Sort code must be 6 digits' }), { status: 400, headers: corsHeaders })
      }
      const cleanAcct = account_number.replace(/[^0-9]/g, '')
      if (cleanAcct.length !== 8) {
        return new Response(JSON.stringify({ error: 'Account number must be 8 digits' }), { status: 400, headers: corsHeaders })
      }
    }

    // Validate EUR fields
    if (currency === 'EUR') {
      if (!iban) {
        return new Response(JSON.stringify({ error: 'IBAN required for EUR' }), { status: 400, headers: corsHeaders })
      }
    }

    // Check if user already has verified bank details
    const { data: existing } = await supabase
      .from('user_bank_accounts')
      .select('id, is_verified')
      .eq('user_id', user_id)
      .maybeSingle()

    if (existing?.is_verified) {
      return new Response(JSON.stringify({ error: 'Bank details are locked after first successful payout. Contact support to change.' }), { status: 403, headers: corsHeaders })
    }

    // Upsert bank details
    const bankData = {
      user_id,
      currency,
      account_name,
      sort_code: currency === 'GBP' ? sort_code.replace(/[^0-9]/g, '') : null,
      account_number: currency === 'GBP' ? account_number.replace(/[^0-9]/g, '') : null,
      iban: currency === 'EUR' ? iban : null,
      bic: currency === 'EUR' ? bic : null,
      bank_country,
      updated_at: new Date().toISOString(),
    }

    let result
    if (existing) {
      const { data, error } = await supabase
        .from('user_bank_accounts')
        .update(bankData)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabase
        .from('user_bank_accounts')
        .insert(bankData)
        .select()
        .single()
      if (error) throw error
      result = data
    }

    // Audit log
    await supabase.from('payout_audit_log').insert({
      user_id,
      event_type: 'bank_details_added',
      performed_by: 'user',
      metadata: { currency, bank_country, account_name },
    })

    // TODO: Send WhatsApp confirmation via n8n webhook
    // const n8nUrl = Deno.env.get('N8N_WEBHOOK_URL')
    // if (n8nUrl) {
    //   await fetch(n8nUrl + '/inv-notify-whatsapp', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ user_id, event: 'bank_details_saved', currency }),
    //   }).catch(() => {}) // Don't fail if notification fails
    // }

    return new Response(JSON.stringify({ id: result.id, message: 'Bank details saved successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
