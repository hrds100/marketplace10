/**
 * OTP functions — call Supabase edge functions directly (no n8n).
 * Migrated from src/lib/n8n.ts on 2026-04-05.
 */

/** Strip spaces, dashes, parens from phone numbers */
function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}

/** send-otp edge function → GHL OTP workflow → WhatsApp */
export async function sendOtp(phone: string): Promise<{ success: boolean; message_id?: string }> {
  const clean = cleanPhone(phone);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const res = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
    body: JSON.stringify({ phone: clean }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** verify-otp edge function — accepts any 4-digit code (loose on purpose) */
export async function verifyOtp(params: {
  phone: string;
  code: string;
  name: string;
  email?: string;
}): Promise<{ success: boolean; error?: string }> {
  const clean = cleanPhone(params.phone);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const res = await fetch(`${supabaseUrl}/functions/v1/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
    body: JSON.stringify({ ...params, phone: clean }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
