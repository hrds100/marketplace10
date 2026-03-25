// nfstay Email Edge Function
// Sends transactional emails via Resend API
// Uses NFS_RESEND_API_KEY (separate from marketplace10's RESEND_API_KEY)
//
// Supported email types:
//   - booking_confirmation: sent to guest after reservation is created/confirmed
//   - booking_cancelled: sent to guest when reservation is cancelled
//   - operator_new_booking: sent to operator when a new booking is received

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const NFS_RESEND_API_KEY = Deno.env.get('NFS_RESEND_API_KEY');
const FROM_EMAIL = 'nfstay <onboarding@resend.dev>'; // Update to verified domain when available

const BRAND = {
  color: '#1E9A80',
  bg: '#f3f3ee',
  font: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
};

const LOGO_URL = 'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/inv-property-docs/brand/nfstay-email-logo.png';
const LOGO_HTML = `<div style="text-align:center;padding:0 0 12px;">
  <a href="https://nfstay.app" style="text-decoration:none;">
    <img src="${LOGO_URL}" alt="nfstay" width="100" style="display:inline-block;width:100px;height:auto;" />
  </a>
</div>`;

const FOOTER_HTML = `<div style="text-align:center;padding:24px 0;font-size:12px;color:#9ca3af;">
  Powered by <a href="https://nfstay.app" style="color:${BRAND.color};text-decoration:none;">nfstay</a>
</div>`;

interface EmailRequest {
  type: string;
  data: Record<string, unknown>;
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

function buildBookingConfirmation(data: Record<string, unknown>): EmailPayload {
  const guestName = data.guest_first_name || 'Guest';
  const propertyTitle = data.property_title || 'your vacation rental';
  const checkIn = data.check_in || '';
  const checkOut = data.check_out || '';
  const checkInTime = data.check_in_time || '15:00';
  const checkOutTime = data.check_out_time || '11:00';
  const totalAmount = data.total_amount || '0.00';
  const currency = data.currency || 'GBP';
  const adults = data.adults || 1;
  const children = data.children || 0;
  const operatorName = data.operator_name || 'Your host';
  const reservationId = data.reservation_id || '';

  return {
    to: String(data.guest_email || ''),
    subject: `Booking Confirmed - ${propertyTitle}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:${BRAND.font};background:${BRAND.bg};">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    ${LOGO_HTML}
    <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
      <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;">Booking Confirmed</h1>
      <p style="font-size:15px;color:#6b7280;margin:0 0 24px;">Hi ${guestName}, your reservation is confirmed.</p>

      <div style="background:#f3f4f6;border-radius:8px;padding:20px;margin-bottom:20px;">
        <p style="font-size:16px;font-weight:600;color:#111;margin:0 0 12px;">${propertyTitle}</p>
        <table style="width:100%;font-size:14px;color:#374151;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#6b7280;padding:4px 0;">Check-in:</td>
            <td style="padding:4px 0 4px 12px;text-align:right;">${checkIn} at ${checkInTime}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:4px 0;">Check-out:</td>
            <td style="padding:4px 0 4px 12px;text-align:right;">${checkOut} at ${checkOutTime}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:4px 0;">Guests:</td>
            <td style="padding:4px 0 4px 12px;text-align:right;">${adults} adult${Number(adults) !== 1 ? 's' : ''}${Number(children) > 0 ? `, ${children} child${Number(children) !== 1 ? 'ren' : ''}` : ''}</td>
          </tr>
        </table>
      </div>

      <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-bottom:20px;">
        <table style="width:100%;font-size:14px;color:#374151;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:4px 0;font-weight:700;font-size:16px;">Total:</td>
            <td style="padding:4px 0;text-align:right;font-weight:700;font-size:16px;">${currency} ${totalAmount}</td>
          </tr>
        </table>
      </div>

      <p style="font-size:13px;color:#9ca3af;margin:0;">
        Reservation ID: ${reservationId}<br>
        Hosted by ${operatorName}
      </p>
    </div>
    ${FOOTER_HTML}
  </div>
</body>
</html>`,
  };
}

function buildBookingCancelled(data: Record<string, unknown>): EmailPayload {
  const guestName = data.guest_first_name || 'Guest';
  const propertyTitle = data.property_title || 'your vacation rental';
  const checkIn = data.check_in || '';
  const checkOut = data.check_out || '';

  return {
    to: String(data.guest_email || ''),
    subject: `Booking Cancelled - ${propertyTitle}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:${BRAND.font};background:${BRAND.bg};">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    ${LOGO_HTML}
    <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
      <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;">Booking Cancelled</h1>
      <p style="font-size:15px;color:#6b7280;margin:0 0 16px;">Hi ${guestName}, your reservation for <strong>${propertyTitle}</strong> (${checkIn} - ${checkOut}) has been cancelled.</p>
      <p style="font-size:14px;color:#6b7280;">If you have any questions, please contact your host directly.</p>
    </div>
    ${FOOTER_HTML}
  </div>
</body>
</html>`,
  };
}

function buildOperatorNewBooking(data: Record<string, unknown>): EmailPayload {
  const guestName = [data.guest_first_name, data.guest_last_name].filter(Boolean).join(' ') || 'A guest';
  const propertyTitle = data.property_title || 'one of your properties';
  const checkIn = data.check_in || '';
  const checkOut = data.check_out || '';
  const totalAmount = data.total_amount || '0.00';
  const currency = data.currency || 'GBP';

  return {
    to: String(data.operator_email || ''),
    subject: `New Booking - ${propertyTitle}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:${BRAND.font};background:${BRAND.bg};">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    ${LOGO_HTML}
    <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
      <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 8px;">New Booking Received</h1>
      <p style="font-size:15px;color:#6b7280;margin:0 0 24px;">${guestName} has booked <strong>${propertyTitle}</strong>.</p>
      <div style="background:#f3f4f6;border-radius:8px;padding:16px;font-size:14px;color:#374151;">
        <p style="margin:0 0 4px;"><span style="color:#6b7280;">Dates:</span> ${checkIn} - ${checkOut}</p>
        <p style="margin:0 0 4px;"><span style="color:#6b7280;">Guest:</span> ${guestName} (${data.guest_email || 'no email'})</p>
        <p style="margin:0;"><span style="color:#6b7280;">Total:</span> ${currency} ${totalAmount}</p>
      </div>
    </div>
    ${FOOTER_HTML}
  </div>
</body>
</html>`,
  };
}

serve(async (req) => {
  // CORS headers for Supabase client calls
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!NFS_RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'NFS_RESEND_API_KEY not configured' }),
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const { type, data }: EmailRequest = await req.json();

    if (!type || !data) {
      return new Response(
        JSON.stringify({ error: 'Missing type or data' }),
        { status: 400, headers: corsHeaders }
      );
    }

    let email: EmailPayload;

    switch (type) {
      case 'booking_confirmation':
        email = buildBookingConfirmation(data);
        break;
      case 'booking_cancelled':
        email = buildBookingCancelled(data);
        break;
      case 'operator_new_booking':
        email = buildOperatorNewBooking(data);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
          { status: 400, headers: corsHeaders }
        );
    }

    if (!email.to) {
      return new Response(
        JSON.stringify({ error: 'No recipient email provided' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NFS_RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email.to,
        subject: email.subject,
        html: email.html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: 'Resend API error', details: result }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
