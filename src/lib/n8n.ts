// ─── NATIVE (Supabase Edge Functions — no n8n) ─────────────────────
// sendOtp and verifyOtp were migrated from n8n to native edge functions on 2026-04-04.
// They call Supabase directly. Do NOT re-add n8n calls for these.

/** Strip spaces, dashes, parens from phone numbers: "+44 7863 992555" → "+447863992555" */
function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}

/** Calls send-otp edge function → GHL OTP workflow → WhatsApp */
export async function sendOtp(phone: string): Promise<{ success: boolean; message_id?: string }> {
  const clean = cleanPhone(phone);
  console.log('sendOtp PHONE:', phone, 'CLEAN:', clean);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const res = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
    body: JSON.stringify({ phone: clean }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('send-otp ERROR:', res.status, errText);
    throw new Error(errText);
  }
  const data = await res.json();
  console.log('send-otp RESP:', data);
  return data;
}

/** Calls verify-otp edge function — accepts any 4-digit code (loose on purpose) */
export async function verifyOtp(params: {
  phone: string;
  code: string;
  name: string;
  email?: string;
}): Promise<{ success: boolean; error?: string }> {
  const clean = cleanPhone(params.phone);
  console.log('verifyOtp PHONE:', params.phone, 'CLEAN:', clean);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const res = await fetch(`${supabaseUrl}/functions/v1/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
    body: JSON.stringify({ ...params, phone: clean }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('verify-otp ERROR:', res.status, errText);
    throw new Error(errText);
  }
  const data = await res.json();
  console.log('verify-otp RESP:', data);
  return data;
}

// ─── STILL ON N8N (not yet migrated) ───────────────────────────────
// These functions still call n8n webhooks. They are used for features
// outside the OTP/inquiry flow and are NOT part of the migration above.

const N8N_BASE = (import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv886554.hstgr.cloud').replace(/\/$/, '');

/** n8n: estimate Airbnb profit — used by ListADealPage, AdminQuickList, AdminDeals */
export async function estimateProfit(params: {
  city: string;
  postcode?: string;
  beds?: number;
}): Promise<{ profit_est: number; airbnb_url?: string }> {
  const res = await fetch(`${N8N_BASE}/webhook/estimate-profit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** n8n: CRM stage move notification — fire-and-forget */
export function notifyCrmStageMove(params: {
  dealId: string;
  fromStage: string;
  toStage: string;
  userId: string;
}): void {
  fetch(`${N8N_BASE}/webhook/move-crm-stage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }).catch(() => {});
}
