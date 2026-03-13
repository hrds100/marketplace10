/**
 * n8n webhook base URL (set in .env as VITE_N8N_WEBHOOK_URL).
 * Production: https://n8n.srv886554.hstgr.cloud
 */
const base = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

function webhook(path: string) {
  const url = path.startsWith('http') ? path : `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  return url;
}

/** POST /webhook/send-otp → { phone } → { success, message_id } */
export async function sendOtp(phone: string): Promise<{ success: boolean; message_id?: string }> {
  const res = await fetch(webhook('webhook/send-otp'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** POST /webhook/estimate-profit → { city, postcode, beds } → { profit_est, airbnb_url, ... } */
export async function estimateProfit(params: {
  city: string;
  postcode?: string;
  beds?: number;
}): Promise<{ profit_est: number; airbnb_url?: string }> {
  const res = await fetch(webhook('webhook/estimate-profit'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** POST /webhook/new-inquiry → save + notify */
export async function submitInquiry(params: {
  property_name: string;
  city: string;
  email?: string;
  phone?: string;
  message?: string;
}): Promise<{ success: boolean; id?: string }> {
  const res = await fetch(webhook('webhook/new-inquiry'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** POST /webhook/verify-otp → { phone, code } → { success, error? } */
export async function verifyOtp(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(webhook('webhook/verify-otp'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** POST /webhook/signup-welcome (call after Supabase signup if you use Auth) */
export async function sendSignupWelcome(params: { email: string; name?: string }): Promise<{ success: boolean }> {
  const res = await fetch(webhook('webhook/signup-welcome'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
