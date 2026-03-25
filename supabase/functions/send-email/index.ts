import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAIL') || 'hugo@nfstay.com,chris@nfstay.com').split(',').map(e => e.trim());
const FROM_EMAIL = 'nfstay <notifications@hub.nfstay.com>';
const BASE_URL = 'https://hub.nfstay.com';

const BRAND = {
  color: '#1E9A80',
  bg: '#f3f3ee',
  font: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
};

const LOGO_URL = 'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/public-assets/nfstay-logo-email.png';
const LOGO_HTML = `<div style="text-align:center;padding:0 0 12px;">
  <a href="https://hub.nfstay.com" style="text-decoration:none;">
    <img src="${LOGO_URL}" alt="nfstay" width="100" style="display:inline-block;width:100px;height:auto;" />
  </a>
</div>`;

function layout(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:${BRAND.font};">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    ${LOGO_HTML}
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
      <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#111;">${title}</h2>
      ${body}
    </div>
    <div style="text-align:center;padding:24px 0;font-size:12px;color:#9ca3af;">
      nfstay &middot; <a href="${BASE_URL}" style="color:${BRAND.color};text-decoration:none;">hub.nfstay.com</a>
    </div>
  </div>
</body>
</html>`;
}

function btn(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:${BRAND.color};color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${text}</a>`;
}

function row(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;"><span style="color:#6b7280;">${label}: </span><span style="font-weight:500;color:#111;">${value}</span></div>`;
}

interface EmailConfig {
  to: string;
  subject: string;
  html: string;
}

function buildEmail(type: string, data: Record<string, unknown>): EmailConfig {
  switch (type) {

    // ─── ADMIN EMAILS ──────────────────────────────────────
    case 'new-deal-admin':
      return {
        to: ADMIN_EMAILS,
        subject: `New Deal Submitted - ${data.city} ${data.type}`,
        html: layout('New deal submitted', `
          ${row('Property', String(data.name))}
          ${row('Location', `${data.city} ${data.postcode}`)}
          ${row('Type', String(data.type))}
          ${row('Rent', `£${Number(data.rent).toLocaleString()}/mo`)}
          ${row('Contact', `${data.contactName} - ${data.contactEmail}`)}
          ${btn('Review in Admin →', `${BASE_URL}/admin/submissions`)}
        `),
      };

    case 'new-signup-admin':
      return {
        to: ADMIN_EMAILS,
        subject: `New User - ${data.name || data.email}`,
        html: layout('New user signed up', `
          ${row('Name', String(data.name || '-'))}
          ${row('Email', String(data.email))}
          ${row('Phone', String(data.phone || '-'))}
          ${btn('View Users →', `${BASE_URL}/admin/users`)}
        `),
      };

    // ─── MEMBER EMAILS ─────────────────────────────────────
    case 'deal-approved-member':
      return {
        to: String(data.memberEmail),
        subject: `Your deal has been approved - ${data.city}`,
        html: layout('Your deal is live!', `
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Great news - your property in <strong>${data.city}</strong> has been approved and is now live on the marketplace.
          </p>
          ${row('Property', String(data.name))}
          ${row('Status', 'Live')}
          ${btn('View on nfstay →', `${BASE_URL}/dashboard/deals`)}
        `),
      };

    case 'deal-rejected-member':
      return {
        to: String(data.memberEmail),
        subject: `Update on your deal - ${data.city}`,
        html: layout('Deal not approved', `
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Unfortunately, your submitted property in <strong>${data.city}</strong> was not approved at this time.
          </p>
          ${row('Property', String(data.name))}
          ${data.reason ? row('Reason', String(data.reason)) : ''}
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:16px 0 0;">
            You can update and resubmit your deal, or contact us if you have questions.
          </p>
          ${btn('Resubmit Deal →', `${BASE_URL}/dashboard/list-a-deal`)}
        `),
      };

    case 'deal-expired-member':
      return {
        to: String(data.memberEmail),
        subject: `Your deal has expired - ${data.city}`,
        html: layout('Deal expired', `
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Your property listing in <strong>${data.city}</strong> has been moved to <strong>${data.newStatus === 'inactive' ? 'inactive' : 'on offer'}</strong> after ${data.days || '14'} days.
          </p>
          ${row('Property', String(data.name))}
          ${row('New Status', data.newStatus === 'inactive' ? 'Inactive' : 'On Offer')}
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:16px 0 0;">
            You can re-list this deal at any time from your dashboard.
          </p>
          ${btn('View My Deals →', `${BASE_URL}/dashboard/deals`)}
        `),
      };

    case 'welcome-member':
      return {
        to: String(data.email),
        subject: 'Welcome to nfstay!',
        html: layout('Welcome to nfstay', `
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Hi${data.name ? ` ${data.name}` : ''} - welcome to the UK's rent-to-rent property marketplace.
          </p>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Here's what you can do:
          </p>
          <ul style="font-size:14px;color:#374151;line-height:1.8;padding-left:20px;margin:0 0 16px;">
            <li>Browse landlord-approved deals across the UK</li>
            <li>Save your favourites and track them in CRM</li>
            <li>Message landlords directly through the inbox</li>
            <li>Learn the business in nfstay University</li>
          </ul>
          ${btn('Start Browsing Deals →', `${BASE_URL}/dashboard/deals`)}
        `),
      };

    case 'tier-upgraded-member':
      return {
        to: String(data.email),
        subject: 'Payment confirmed - you\'re upgraded!',
        html: layout('Payment confirmed', `
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Your payment has been processed and your account has been upgraded.
          </p>
          ${row('Plan', String(data.tier || 'Premium'))}
          ${row('Status', 'Active')}
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:16px 0 0;">
            You now have full access to message landlords, view contact details, and more.
          </p>
          ${btn('Go to Dashboard →', `${BASE_URL}/dashboard/deals`)}
        `),
      };

    // ─── AFFILIATE EMAILS ────────────────────────────────
    case 'payout-requested-admin':
      return {
        to: ADMIN_EMAILS,
        subject: `Payout Request - ${data.name} (£${Number(data.amount).toFixed(2)})`,
        html: layout('Payout Requested', `
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            An agent has requested a payout.
          </p>
          ${row('Agent', String(data.name))}
          ${row('Amount', `£${Number(data.amount).toFixed(2)}`)}
          ${row('PayPal', String(data.paypal || '-'))}
          ${row('Email', String(data.email))}
          ${btn('Review Payouts →', `${BASE_URL}/admin/affiliates`)}
        `),
      };

    case 'payout-sent-member':
      return {
        to: String(data.email),
        subject: `Payout sent - £${Number(data.amount).toFixed(2)}`,
        html: layout('Payout Sent', `
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Your commission payout has been sent.
          </p>
          ${row('Amount', `£${Number(data.amount).toFixed(2)}`)}
          ${row('Method', String(data.method || 'PayPal'))}
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:16px 0 0;">
            It may take 1-2 business days to arrive. Keep referring - your next payout is every Tuesday!
          </p>
          ${btn('View Dashboard →', `${BASE_URL}/dashboard/affiliates`)}
        `),
      };

    case 'new-referral-agent':
      return {
        to: String(data.agentEmail),
        subject: `New referral signup - ${data.referredName || 'someone'} joined via your link!`,
        html: layout('New Referral', `
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Someone just signed up using your referral link.
          </p>
          ${row('New User', String(data.referredName || data.referredEmail || 'Anonymous'))}
          ${row('Your Total Signups', String(data.totalSignups || '-'))}
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:16px 0 0;">
            When they subscribe, you'll earn commission automatically.
          </p>
          ${btn('View Your Dashboard →', `${BASE_URL}/dashboard/affiliates`)}
        `),
      };

    // ─── INVESTMENT PURCHASE EMAILS ────────────────────────
    case 'inv-purchase-buyer':
      return {
        to: String(data.email),
        subject: `Investment confirmed — ${data.property || 'nfstay'}`,
        html: layout('Your investment is confirmed', `
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Thank you for your investment! Your order has been received and is being processed.
          </p>
          ${row('Property', String(data.property || 'Investment Property'))}
          ${row('Amount', `$${Number(data.amount || 0).toFixed(2)}`)}
          ${row('Shares', String(data.shares || '—'))}
          ${row('Status', 'Pending approval')}
          <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:16px 0 0;">
            Your shares will be allocated once the admin approves the order. You'll receive another email when this happens.
          </p>
          ${btn('View Your Portfolio →', `${BASE_URL}/dashboard/invest/portfolio`)}
        `),
      };

    case 'inv-purchase-agent':
      return {
        to: String(data.agentEmail),
        subject: `New sale — you earned $${Number(data.commission || 0).toFixed(2)} commission`,
        html: layout('You just earned commission!', `
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Someone purchased shares through your referral link. Your commission has been recorded.
          </p>
          ${row('Property', String(data.property || 'Investment Property'))}
          ${row('Sale Amount', `$${Number(data.amount || 0).toFixed(2)}`)}
          ${row('Your Commission', `$${Number(data.commission || 0).toFixed(2)}`)}
          ${row('Rate', `${Number(data.rate || 5)}%`)}
          ${row('Claimable On', String(data.claimableDate || '14 days'))}
          <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:16px 0 0;">
            Your commission will become claimable after the 14-day holdback period.
          </p>
          ${btn('View Your Earnings →', `${BASE_URL}/dashboard/affiliates`)}
        `),
      };

    case 'inv-purchase-admin':
      return {
        to: ADMIN_EMAILS,
        subject: `New investment — $${Number(data.amount || 0).toFixed(2)} from ${data.buyerName || data.buyerEmail || 'Unknown'}`,
        html: layout('New investment purchase', `
          ${row('Buyer', String(data.buyerName || data.buyerEmail || '—'))}
          ${row('Email', String(data.buyerEmail || '—'))}
          ${row('Property', String(data.property || '—'))}
          ${row('Amount', `$${Number(data.amount || 0).toFixed(2)}`)}
          ${row('Shares', String(data.shares || '—'))}
          ${data.agentName ? row('Referred by', String(data.agentName)) : ''}
          ${data.commission ? row('Agent Commission', `$${Number(data.commission).toFixed(2)}`) : ''}
          ${btn('Review Orders →', `${BASE_URL}/admin/invest/orders`)}
        `),
      };

    case 'inv-order-approved-buyer':
      return {
        to: String(data.email),
        subject: `Shares allocated — ${data.property || 'nfstay'}`,
        html: layout('Your shares have been allocated', `
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Great news! Your investment order has been approved and your shares are now in your portfolio.
          </p>
          ${row('Property', String(data.property || 'Investment Property'))}
          ${row('Shares', String(data.shares || '—'))}
          ${row('Amount', `$${Number(data.amount || 0).toFixed(2)}`)}
          ${row('Transaction', data.txHash ? `<a href="https://bscscan.com/tx/${data.txHash}" style="color:${BRAND.color};text-decoration:none;">${String(data.txHash).slice(0, 10)}…</a>` : 'Confirmed')}
          <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:16px 0 0;">
            Your shares are recorded on the blockchain. You can view your holdings and track returns in your portfolio.
          </p>
          ${btn('View Your Portfolio →', `${BASE_URL}/dashboard/invest/portfolio`)}
        `),
      };

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}

serve(async (req) => {
  try {
    const { type, data } = await req.json();
    const { to, subject, html } = buildEmail(type, data);

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
      status: err instanceof Error && err.message.startsWith('Unknown email type') ? 400 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
