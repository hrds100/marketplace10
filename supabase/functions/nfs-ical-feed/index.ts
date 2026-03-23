// nfstay iCal Feed Edge Function
// Generates a public ICS calendar feed for a property
//
// Endpoint:
//   GET /nfs-ical-feed?property_id=UUID → Returns text/calendar ICS file
//
// Public endpoint — no auth required.
// External platforms (Airbnb, VRBO, Google Calendar) subscribe to this URL.
// Includes: confirmed reservations as VEVENT + blocked date ranges as VEVENT.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Format date as ICS DATE (YYYYMMDD) for all-day events
function formatIcsDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// Format date as ICS DATETIME (YYYYMMDDTHHMMSSZ)
function formatIcsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Escape special characters in ICS text fields
function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

serve(async (req) => {
  // Only GET
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type',
      },
    });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const propertyId = url.searchParams.get('property_id');

  if (!propertyId) {
    return new Response('property_id query parameter required', { status: 400 });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(propertyId)) {
    return new Response('Invalid property_id format', { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Fetch property (public_title, blocked_date_ranges)
    const { data: property, error: propError } = await supabase
      .from('nfs_properties')
      .select('id, public_title, blocked_date_ranges, listing_status')
      .eq('id', propertyId)
      .single();

    if (propError || !property) {
      return new Response('Property not found', { status: 404 });
    }

    // Only serve calendar for listed properties
    if (property.listing_status !== 'listed') {
      return new Response('Property is not listed', { status: 404 });
    }

    // Fetch confirmed reservations for this property
    const { data: reservations, error: resError } = await supabase
      .from('nfs_reservations')
      .select('id, check_in, check_out, guest_first_name, status')
      .eq('property_id', propertyId)
      .in('status', ['confirmed', 'completed']);

    if (resError) {
      return new Response('Failed to fetch reservations', { status: 500 });
    }

    const now = new Date();
    const dtstamp = formatIcsDateTime(now);
    const calName = escapeIcs(property.public_title || 'nfstay Property');

    // Build ICS content
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//nfstay//Calendar Feed//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${calName}`,
      'X-WR-TIMEZONE:UTC',
    ];

    // Add confirmed reservations as all-day events
    if (reservations) {
      for (const res of reservations) {
        const uid = `reservation-${res.id}@nfstay.app`;
        const summary = res.guest_first_name
          ? `Reserved - ${escapeIcs(res.guest_first_name)}`
          : 'Reserved';

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${dtstamp}`);
        lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(res.check_in)}`);
        lines.push(`DTEND;VALUE=DATE:${formatIcsDate(res.check_out)}`);
        lines.push(`SUMMARY:${summary}`);
        lines.push('STATUS:CONFIRMED');
        lines.push('TRANSP:OPAQUE');
        lines.push('END:VEVENT');
      }
    }

    // Add blocked date ranges as all-day events
    const blockedRanges = (property.blocked_date_ranges || []) as Array<{
      start?: string;
      end?: string;
      from?: string;
      to?: string;
      reason?: string;
    }>;

    for (let i = 0; i < blockedRanges.length; i++) {
      const block = blockedRanges[i];
      const start = block.start || block.from;
      const end = block.end || block.to;

      if (!start || !end) continue;

      const uid = `blocked-${propertyId}-${i}@nfstay.app`;
      const summary = block.reason
        ? `Blocked - ${escapeIcs(block.reason)}`
        : 'Not Available';

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(start)}`);
      lines.push(`DTEND;VALUE=DATE:${formatIcsDate(end)}`);
      lines.push(`SUMMARY:${summary}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('TRANSP:OPAQUE');
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    const icsContent = lines.join('\r\n');

    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${propertyId}.ics"`,
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(`Error: ${String(err)}`, { status: 500 });
  }
});
