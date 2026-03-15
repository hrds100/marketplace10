import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'hugo@nfstay.com';
const FROM_EMAIL = 'NFsTay <onboarding@resend.dev>';

serve(async (req) => {
  try {
    const { type, data } = await req.json();

    let to: string;
    let subject: string;
    let html: string;

    if (type === 'new-deal-admin') {
      to = ADMIN_EMAIL;
      subject = `New Deal Submitted — ${data.city} ${data.type}`;
      html = `
        <h2>New deal submitted on NFsTay</h2>
        <p><strong>Property:</strong> ${data.name}</p>
        <p><strong>City:</strong> ${data.city} ${data.postcode}</p>
        <p><strong>Type:</strong> ${data.type}</p>
        <p><strong>Rent:</strong> £${data.rent}/mo</p>
        <p><strong>Contact:</strong> ${data.contactName} — ${data.contactEmail}</p>
        <p><a href="https://hub.nfstay.com/admin/submissions">Review on NFsTay Admin →</a></p>
      `;
    } else if (type === 'deal-approved-member') {
      to = data.memberEmail;
      subject = `Your deal has been approved — ${data.city}`;
      html = `
        <h2>Your deal is live on NFsTay!</h2>
        <p>Great news — your submitted property in <strong>${data.city}</strong> has been approved and is now live on the marketplace.</p>
        <p><strong>Property:</strong> ${data.name}</p>
        <p><a href="https://hub.nfstay.com/dashboard/deals">View on NFsTay →</a></p>
      `;
    } else {
      return new Response(JSON.stringify({ error: 'Unknown type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });

    const result = await res.json();
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: res.ok ? 200 : 500,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
