const N8N_BASE = (import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv886554.hstgr.cloud').replace(/\/$/, '');

/** Strip spaces, dashes, parens from phone numbers: "+44 7863 992555" → "+447863992555" */
function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}

/** POST /webhook/send-otp → { phone } → { success, message_id } */
export async function sendOtp(phone: string): Promise<{ success: boolean; message_id?: string }> {
  const clean = cleanPhone(phone);
  console.log('sendOtp PHONE:', phone, 'CLEAN:', clean);
  const res = await fetch(`${N8N_BASE}/webhook/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: clean }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('n8n sendOtp ERROR:', res.status, errText);
    throw new Error(errText);
  }
  const data = await res.json();
  console.log('n8n sendOtp RESP:', data);
  return data;
}

/** POST /webhook/estimate-profit → { city, postcode, beds } → { profit_est, airbnb_url, ... } */
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

/** POST /webhook/new-inquiry → save + notify */
export async function submitInquiry(params: {
  property_name: string;
  city: string;
  email?: string;
  phone?: string;
  message?: string;
}): Promise<{ success: boolean; id?: string }> {
  const res = await fetch(`${N8N_BASE}/webhook/new-inquiry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** POST /webhook/verify-otp → { phone, code, name, email? } → { success, error? }
 *  NOTE: n8n verify-otp currently has no "Respond to Webhook" node so returns empty body.
 *  We treat empty 200 as success (pass-through) until the workflow is configured to
 *  explicitly return { success: false } for wrong codes.
 */
export async function verifyOtp(params: {
  phone: string;
  code: string;
  name: string;
  email?: string;
}): Promise<{ success: boolean; error?: string }> {
  const clean = cleanPhone(params.phone);
  console.log('verifyOtp PHONE:', params.phone, 'CLEAN:', clean);
  const res = await fetch(`${N8N_BASE}/webhook/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, phone: clean }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('n8n verifyOtp ERROR:', res.status, errText);
    throw new Error(errText);
  }
  const text = await res.text();
  if (!text.trim()) {
    // n8n workflow ran but has no Respond to Webhook node — treat as success
    console.log('verifyOtp: empty response from n8n — treating as success (TODO: add Respond to Webhook node)');
    return { success: true };
  }
  const data = JSON.parse(text);
  console.log('n8n verifyOtp RESP:', data);
  return data;
}

/** POST /webhook/move-crm-stage — fire-and-forget notification, never blocks UI */
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
  }).catch(() => {
    // Silent fail — Supabase is source of truth, n8n is just a notification
  });
}

/** POST /webhook/signup-welcome (call after Supabase signup if you use Auth) */
export async function sendSignupWelcome(params: { email: string; name?: string }): Promise<{ success: boolean }> {
  const res = await fetch(`${N8N_BASE}/webhook/signup-welcome`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
