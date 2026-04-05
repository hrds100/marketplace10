// Vercel serverless function — receives GHL webhook and forwards to Supabase
import https from 'node:https';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).end();
  }

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});

  try {
    const result = await new Promise((resolve, reject) => {
      const request = https.request('https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/receive-tenant-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve({ status: response.statusCode, body: data }));
      });

      request.on('error', reject);
      request.setTimeout(25000, () => { request.destroy(); reject(new Error('timeout')); });
      request.write(body);
      request.end();
    });

    res.status(result.status).setHeader('Content-Type', 'application/json').end(result.body);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
