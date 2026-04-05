// Vercel cron job — calls poll-whatsapp-inquiries edge function every 2 minutes
// Configured in vercel.json under "crons"
import https from 'node:https';

export default async function handler(req, res) {
  // Only allow GET (cron) and POST (manual trigger)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).end();
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const request = https.request('https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/poll-whatsapp-inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': 2,
        },
      }, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve({ status: response.statusCode, body: data }));
      });

      request.on('error', reject);
      request.setTimeout(55000, () => { request.destroy(); reject(new Error('timeout')); });
      request.write('{}');
      request.end();
    });

    res.status(result.status).setHeader('Content-Type', 'application/json').end(result.body);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
