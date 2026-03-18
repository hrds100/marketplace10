// nfs-domain-verify — Verify custom domain DNS and provision Cloudflare SSL
// POST /nfs-domain-verify { action: 'verify' | 'remove', domain: string }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NFS_CF_API_TOKEN = Deno.env.get('NFS_CF_API_TOKEN');
const NFS_CF_ZONE_ID = Deno.env.get('NFS_CF_ZONE_ID');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Get operator
    const { data: operator, error: opError } = await supabase
      .from('nfs_operators')
      .select('id, custom_domain, custom_domain_verified, custom_domain_cf')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (opError || !operator) {
      return new Response(JSON.stringify({ error: 'Operator not found' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, domain } = body;

    if (action === 'verify') {
      return await handleVerify(supabase, operator, domain);
    } else if (action === 'remove') {
      return await handleRemove(supabase, operator);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

async function handleVerify(
  supabase: any,
  operator: any,
  domain: string
) {
  if (!domain || typeof domain !== 'string') {
    return jsonResponse({ error: 'Domain is required' }, 400);
  }

  const cleanDomain = domain.toLowerCase().trim();

  // Basic domain validation
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(cleanDomain)) {
    return jsonResponse({ error: 'Invalid domain format' }, 400);
  }

  // Reject nfstay.app subdomains
  if (cleanDomain.endsWith('.nfstay.app') || cleanDomain === 'nfstay.app') {
    return jsonResponse({ error: 'Cannot use nfstay.app as a custom domain' }, 400);
  }

  // DNS check — verify CNAME or A record points to Vercel
  const dnsVerified = await checkDns(cleanDomain);

  // Update operator record
  const updateData: Record<string, unknown> = {
    custom_domain: cleanDomain,
    custom_domain_dns_verified: dnsVerified,
    custom_domain_dns_checked_at: new Date().toISOString(),
    custom_domain_dns_method: dnsVerified ? 'cname' : null,
  };

  if (dnsVerified) {
    // Provision Cloudflare SSL if credentials are available
    let cfResult = null;
    if (NFS_CF_API_TOKEN && NFS_CF_ZONE_ID) {
      cfResult = await provisionCloudflareHostname(cleanDomain);
    }

    updateData.custom_domain_verified = true;
    updateData.custom_domain_cf = cfResult || {};
  } else {
    updateData.custom_domain_verified = false;
  }

  const { error: updateError } = await supabase
    .from('nfs_operators')
    .update(updateData)
    .eq('id', operator.id);

  if (updateError) {
    return jsonResponse({ error: 'Failed to update operator' }, 500);
  }

  return jsonResponse({
    domain: cleanDomain,
    dns_verified: dnsVerified,
    ssl_provisioned: dnsVerified && !!NFS_CF_API_TOKEN,
    instructions: dnsVerified
      ? 'Domain verified successfully! SSL will be provisioned automatically.'
      : `DNS not yet pointing to Vercel. Add a CNAME record:\n\nHost: ${cleanDomain}\nValue: cname.vercel-dns.com\n\nOr add an A record:\nHost: ${cleanDomain}\nValue: 76.76.21.21\n\nDNS changes can take up to 48 hours to propagate.`,
  });
}

async function handleRemove(supabase: any, operator: any) {
  // Remove custom domain from operator
  const { error: updateError } = await supabase
    .from('nfs_operators')
    .update({
      custom_domain: null,
      custom_domain_verified: false,
      custom_domain_dns_verified: false,
      custom_domain_dns_method: null,
      custom_domain_dns_checked_at: null,
      custom_domain_cf: {},
      primary_domain_type: 'subdomain',
    })
    .eq('id', operator.id);

  if (updateError) {
    return jsonResponse({ error: 'Failed to remove domain' }, 500);
  }

  // Remove from Cloudflare if provisioned
  if (NFS_CF_API_TOKEN && NFS_CF_ZONE_ID && operator.custom_domain_cf?.hostname_id) {
    try {
      await fetch(
        `https://api.cloudflare.com/client/v4/zones/${NFS_CF_ZONE_ID}/custom_hostnames/${operator.custom_domain_cf.hostname_id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${NFS_CF_API_TOKEN}` },
        }
      );
    } catch {
      // Non-fatal — hostname may have already been removed
    }
  }

  return jsonResponse({ success: true });
}

/**
 * Check if domain's DNS points to Vercel via CNAME or A record.
 * Uses Cloudflare's DNS-over-HTTPS API (public, no auth needed).
 */
async function checkDns(domain: string): Promise<boolean> {
  try {
    // Check CNAME
    const cnameRes = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=CNAME`,
      { headers: { Accept: 'application/dns-json' } }
    );
    const cnameData = await cnameRes.json();
    if (cnameData.Answer?.some((a: any) =>
      a.data?.includes('vercel-dns.com') || a.data?.includes('vercel.com')
    )) {
      return true;
    }

    // Check A record
    const aRes = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`,
      { headers: { Accept: 'application/dns-json' } }
    );
    const aData = await aRes.json();
    if (aData.Answer?.some((a: any) => a.data === '76.76.21.21')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Provision a custom hostname in Cloudflare for SSL (Cloudflare for SaaS).
 */
async function provisionCloudflareHostname(domain: string): Promise<Record<string, unknown> | null> {
  if (!NFS_CF_API_TOKEN || !NFS_CF_ZONE_ID) return null;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${NFS_CF_ZONE_ID}/custom_hostnames`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NFS_CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostname: domain,
          ssl: {
            method: 'http',
            type: 'dv',
            settings: {
              http2: 'on',
              min_tls_version: '1.2',
            },
          },
        }),
      }
    );

    const data = await res.json();

    if (data.success && data.result) {
      return {
        hostname_id: data.result.id,
        status: data.result.status,
        ssl_status: data.result.ssl?.status,
        provisioned_at: new Date().toISOString(),
      };
    }

    return null;
  } catch {
    return null;
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
