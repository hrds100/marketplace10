// Vercel serverless function — receives GHL webhook and forwards to Supabase
// GHL gets an instant 200 response. Supabase processing happens async.
export default async function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Respond to GHL immediately
  res.status(200).json({ success: true, received: true });

  // Forward to Supabase in the background (fire-and-forget)
  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    fetch('https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/receive-tenant-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    }).catch(() => {});
  } catch {}
}
