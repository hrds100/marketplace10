// Vercel serverless function — injects dynamic OG meta tags for deal pages
// Strips existing static og:/twitter: tags from app.html, then injects
// listing-specific ones. Crawlers read the tags; React SPA loads normally.

import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://hub.nfstay.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-preview.png`;
const DEFAULT_TITLE = 'nfstay — Landlord-Approved Property Deals';
const DEFAULT_DESC =
  'Find, negotiate and grow your Airbnb portfolio. Verified rent-to-rent deals across the UK.';

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Remove all existing og: and twitter: meta tags from the HTML */
function stripOgTags(html: string): string {
  return html
    .replace(/<meta\s+property="og:[^"]*"[^>]*\/?>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*\/?>/gi, '');
}

export default async function handler(req: any, res: any) {
  const { slug } = req.query as { slug: string };

  if (!slug) {
    res.status(400).send('Missing slug');
    return;
  }

  // --- 1. Fetch listing metadata (service role bypasses RLS) ---
  let ogTitle = DEFAULT_TITLE;
  let ogDesc = DEFAULT_DESC;
  let ogImage = DEFAULT_OG_IMAGE;

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    // Prefer service role key (bypasses RLS) — fall back to anon key
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    // Use eq('id') for UUIDs, eq('slug') for human slugs — avoids .or() issues
    const query = isUuid
      ? supabase.from('properties').select('id, name, city, photos, slug').eq('id', slug)
      : supabase.from('properties').select('id, name, city, photos, slug').eq('slug', slug);

    const { data: listing, error } = await query.maybeSingle();

    if (error) {
      console.error('[og-deals] Supabase error:', error.message);
    }

    if (listing) {
      // Only use real user photos — filter out Pexels and placeholder images
      const photos: string[] = Array.isArray(listing.photos) ? listing.photos : [];
      const realPhoto = photos.find(
        (p: string) => p && !p.includes('pexels.com') && !p.includes('property-placeholder')
      );
      if (realPhoto) ogImage = realPhoto;

      if (listing.name) {
        ogTitle = listing.city
          ? `${listing.name} — ${listing.city} | nfstay`
          : `${listing.name} | nfstay`;
        ogDesc = listing.city
          ? `Verified rent-to-rent deal in ${listing.city}. Find, negotiate and grow your Airbnb portfolio on nfstay.`
          : DEFAULT_DESC;
      }
    }
  } catch (err) {
    console.error('[og-deals] Unexpected error:', err);
    // Non-fatal — fall through with defaults
  }

  const ogUrl = `${SITE_URL}/deals/${slug}`;

  // --- 2. Fetch the SPA shell (app.html) ---
  const baseUrl =
    process.env.VERCEL_ENV === 'production'
      ? SITE_URL
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : SITE_URL;

  let appHtml: string;
  try {
    const resp = await fetch(`${baseUrl}/app.html`, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`app.html responded ${resp.status}`);
    appHtml = await resp.text();
  } catch {
    res.redirect(307, `/deals/${slug}`);
    return;
  }

  // --- 3. Strip existing static og/twitter tags, inject dynamic ones ---
  const ogTags = `
  <!-- nfstay dynamic OG — ${slug} -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${esc(ogUrl)}" />
  <meta property="og:title" content="${esc(ogTitle)}" />
  <meta property="og:description" content="${esc(ogDesc)}" />
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@nfstay" />
  <meta name="twitter:title" content="${esc(ogTitle)}" />
  <meta name="twitter:description" content="${esc(ogDesc)}" />
  <meta name="twitter:image" content="${esc(ogImage)}" />`;

  const html = stripOgTags(appHtml).replace('</head>', `${ogTags}\n</head>`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.send(html);
}
