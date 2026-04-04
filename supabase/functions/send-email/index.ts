// DEPLOY NOTE: After every deploy, verify_jwt must be patched to false.
// This function is called from browser (admin Send Test) and other edge functions.
// Patch command: PATCH /v1/projects/asazddtvjvmckouxcmmo/functions/send-email { verify_jwt: false }
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAIL') || 'hugo@nfstay.com,chris@nfstay.com,hello@nfstay.com').split(',').map(e => e.trim());
const FROM_EMAIL = 'nfstay <notifications@hub.nfstay.com>';
const BASE_URL = 'https://hub.nfstay.com';

// Check user notification preferences before sending
async function shouldSendEmail(email: string, prefColumn: string): Promise<boolean> {
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await sb
      .from('profiles')
      .select(prefColumn)
      .eq('email', email)
      .single();
    if (!data) return true; // Default to sending if profile not found
    return (data as Record<string, unknown>)[prefColumn] !== false;
  } catch {
    return true; // Default to sending on error
  }
}

// Map email types to the preference column they should check (null = always send)
function getPreferenceColumn(type: string): string | null {
  switch (type) {
    case 'deal-approved-member':
    case 'deal-rejected-member':
    case 'deal-expired-member':
      return 'notif_email_daily';
    default:
      return null; // Welcome, admin, payout, investment emails always send
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map email type to notification_settings event_key for admin-level toggle check
function mapTypeToEventKey(type: string): string | null {
  const map: Record<string, string> = {
    'new-deal-admin': 'new_deal_submitted',
    'new-signup-admin': 'new_signup',
    'deal-approved-member': 'deal_approved',
    'deal-rejected-member': 'deal_rejected',
    'deal-expired-member': 'deal_expired',
    'welcome-member': 'welcome_email',
    'tier-upgraded-member': 'tier_upgraded',
    'inquiry-tenant-confirmation': 'new_inquiry_email',
    'inquiry-lister-notification': 'new_inquiry_email',
    'payout-requested-admin': 'payout_requested',
    'payout-sent-member': 'payout_completed',
    'new-referral-agent': 'new_referral',
    'inv-purchase-buyer': 'share_purchased',
    'inv-purchase-agent': 'agent_commission',
    'inv-purchase-admin': 'crypto_purchase',
    'inv-order-approved-buyer': 'share_purchased',
  };
  return map[type] || null;
}

// Interpolate {{variable}} placeholders in a template string
function interpolate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? ''));
}

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
        subject: `Partnership confirmed — ${data.property || 'nfstay'}`,
        html: layout('Your partnership is confirmed', `
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Thank you for your allocation! Your order has been received and is being processed.
          </p>
          ${row('Property', String(data.property || 'Partnership Property'))}
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
          ${row('Property', String(data.property || 'Partnership Property'))}
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
        subject: `New allocation — $${Number(data.amount || 0).toFixed(2)} from ${data.buyerName || data.buyerEmail || 'Unknown'}`,
        html: layout('New allocation purchase', `
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
            Great news! Your allocation order has been approved and your shares are now in your portfolio.
          </p>
          ${row('Property', String(data.property || 'Partnership Property'))}
          ${row('Shares', String(data.shares || '—'))}
          ${row('Amount', `$${Number(data.amount || 0).toFixed(2)}`)}
          ${row('Transaction', data.txHash ? `<a href="https://bscscan.com/tx/${data.txHash}" style="color:${BRAND.color};text-decoration:none;">${String(data.txHash).slice(0, 10)}…</a>` : 'Confirmed')}
          <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:16px 0 0;">
            Your shares are recorded on the blockchain. You can view your holdings and track returns in your portfolio.
          </p>
          ${btn('View Your Portfolio →', `${BASE_URL}/dashboard/invest/portfolio`)}
        `),
      };

    // ─── INQUIRY EMAILS ──────────────────────────────────
    case 'inquiry-tenant-confirmation':
      return {
        to: String(data.tenant_email),
        subject: 'Your enquiry has been sent!',
        html: layout('Enquiry sent', `
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Hello, thanks for contacting nfstay.
          </p>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            We've passed your enquiry to the Landlord or Agent, they'll reach out to you shortly. \ud83d\udc4d
          </p>
          ${data.property_url ? btn('View Property', String(data.property_url)) : ''}
        `),
      };

    case 'inquiry-lister-notification':
      return {
        to: String(data.lister_email),
        subject: `New tenant inquiry for ${data.property_name || 'your property'}`,
        html: layout('You have a new lead!', `
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Great news — someone is interested in your property on nfstay.
          </p>
          ${row('Property', String(data.property_name || 'Your property'))}
          ${row('Tenant', String(data.tenant_name || 'A tenant'))}
          ${row('Status', 'Ready to view')}
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:16px 0 0;">
            Click below to view their full contact details in your nfstay inbox.
          </p>
          <div style="text-align:center;margin:24px 0 8px;">
            ${btn('View Lead Details →', String(data.lead_url || `${BASE_URL}/signin`))}
          </div>
          ${data.property_url ? `<div style="text-align:center;margin-top:8px;"><a href="${data.property_url}" style="font-size:13px;color:${BRAND.color};text-decoration:underline;">View Property Listing</a></div>` : ''}
          <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;line-height:1.5;">
            This is an automated message from nfstay. You received this because a tenant inquired about your listed property.
          </p>
        `),
      };

    case 'inquiry-lister-nda':
      return {
        to: String(data.lister_email),
        subject: `New inquiry for ${data.property_name || 'your property'} — quick agreement needed`,
        html: layout('You have a new lead!', `
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Great news — someone is interested in your property on nfstay.
          </p>
          ${row('Property', String(data.property_name || 'Your property'))}
          ${row('Status', 'Agreement required')}
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:16px 0 0;">
            Before we can share the tenant's details, please review and accept our quick Lead Access Agreement. It takes less than a minute.
          </p>
          <div style="text-align:center;margin:24px 0 8px;">
            ${btn('Review Agreement & View Lead →', String(data.nda_url || `${BASE_URL}/signin`))}
          </div>
          ${data.property_url ? `<div style="text-align:center;margin-top:8px;"><a href="${data.property_url}" style="font-size:13px;color:${BRAND.color};text-decoration:underline;">View Property Listing</a></div>` : ''}
          <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;line-height:1.5;">
            This is an automated message from nfstay. You received this because a tenant inquired about your listed property.
          </p>
        `),
      };

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check admin-level notification toggle
    const eventKey = mapTypeToEventKey(type);
    if (eventKey) {
      const { data: setting } = await supabaseAdmin
        .from('notification_settings')
        .select('email_enabled')
        .eq('event_key', eventKey)
        .single();
      if (setting && !(setting as Record<string, unknown>).email_enabled) {
        return new Response(JSON.stringify({ skipped: true, reason: 'Notification disabled by admin' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check for admin-edited template in email_templates table
    let finalSubject: string;
    let finalHtml: string;
    let finalTo: string | string[];

    const { data: dbTemplate } = await supabaseAdmin
      .from('email_templates')
      .select('subject, html_body')
      .eq('type', type)
      .single();

    if (dbTemplate && (dbTemplate as Record<string, unknown>).html_body) {
      // Use DB template with variable interpolation, but still need recipient from buildEmail
      const fallback = buildEmail(type, data);
      finalTo = fallback.to;
      finalSubject = interpolate(String((dbTemplate as Record<string, unknown>).subject), data);
      finalHtml = layout(
        interpolate(String((dbTemplate as Record<string, unknown>).subject), data),
        interpolate(String((dbTemplate as Record<string, unknown>).html_body), data)
      );
    } else {
      // Fall back to hardcoded buildEmail
      const built = buildEmail(type, data);
      finalTo = built.to;
      finalSubject = built.subject;
      finalHtml = built.html;
    }

    // Check user notification preferences for gated email types
    const prefColumn = getPreferenceColumn(type);
    if (prefColumn) {
      const recipientEmail = Array.isArray(finalTo) ? finalTo[0] : finalTo;
      const allowed = await shouldSendEmail(recipientEmail, prefColumn);
      if (!allowed) {
        return new Response(JSON.stringify({ skipped: true, reason: 'User opted out', type }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: finalTo, subject: finalSubject, html: finalHtml }),
    });

    const result = await res.json();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: res.ok ? 200 : 500,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: err instanceof Error && err.message.startsWith('Unknown email type') ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
