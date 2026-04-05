// Vercel serverless function — receives GHL webhook and forwards to Supabase
// Waits for Supabase response before replying to GHL
module.exports = async function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const response = await fetch('https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/receive-tenant-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    });

    const data = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/json').end(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
