import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Pool } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'

// One-shot schema migration — safe to run multiple times (IF NOT EXISTS)
serve(async (req) => {
  const auth = req.headers.get('Authorization') || ''
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!auth.endsWith(serviceRole)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  const pool = new Pool(Deno.env.get('SUPABASE_DB_URL')!, 1, true)
  const conn = await pool.connect()
  try {
    await conn.queryArray(`
      ALTER TABLE landlord_invites
        ADD COLUMN IF NOT EXISTS phone TEXT,
        ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS landlord_user_id UUID;
      ALTER TABLE profiles
        ADD COLUMN IF NOT EXISTS claimed BOOLEAN DEFAULT false;
    `)
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  } finally {
    conn.release()
    await pool.end()
  }
})
