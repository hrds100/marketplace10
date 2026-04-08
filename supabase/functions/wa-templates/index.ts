// wa-templates — CRUD for WhatsApp message templates via Meta Cloud API
// Source of truth: supabase/config.toml (verify_jwt = false)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const META_TOKEN = Deno.env.get('META_WHATSAPP_TOKEN')!;
const WABA_ID = '1993261647929761';
const GRAPH_URL = 'https://graph.facebook.com/v25.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface CreatePayload {
  name: string;
  category: string;
  language: string;
  components: unknown[];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const action = body.action as string;

    // ---- LIST TEMPLATES ----
    if (action === 'list') {
      const url = `${GRAPH_URL}/${WABA_ID}/message_templates?access_token=${META_TOKEN}&limit=100`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        console.error('Meta API list error:', data);
        return json(
          { error: 'Failed to list templates', meta_error: data.error?.message || 'Unknown' },
          502
        );
      }

      const templates = (data.data || []).map((t: Record<string, unknown>) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        category: t.category,
        language: t.language,
        components: t.components,
      }));

      return json({ templates });
    }

    // ---- CREATE TEMPLATE ----
    if (action === 'create') {
      const { name, category, language, components } = body as CreatePayload & { action: string };

      if (!name || !category || !language || !components?.length) {
        return json({ error: 'Missing required fields: name, category, language, components' }, 400);
      }

      const res = await fetch(`${GRAPH_URL}/${WABA_ID}/message_templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${META_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, category, language, components }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Meta API create error:', data);
        return json(
          { error: 'Failed to create template', meta_error: data.error?.message || 'Unknown' },
          502
        );
      }

      return json({ id: data.id, status: data.status, category: data.category });
    }

    // ---- DELETE TEMPLATE ----
    if (action === 'delete') {
      const templateName = body.name as string;
      const templateId = body.id as string;

      if (!templateName && !templateId) {
        return json({ error: 'Missing required field: name or id' }, 400);
      }

      // Meta requires the template name for deletion
      const deleteParam = templateName
        ? `name=${encodeURIComponent(templateName)}`
        : `hsm_id=${encodeURIComponent(templateId)}`;

      const url = `${GRAPH_URL}/${WABA_ID}/message_templates?${deleteParam}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${META_TOKEN}` },
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Meta API delete error:', data);
        const metaMsg = data.error?.message || 'Unknown error';
        // Return 200 with error info so the client can show a toast (not crash)
        return json({ error: 'Failed to delete template', meta_error: metaMsg, success: false });
      }

      return json({ success: true });
    }

    // ---- IMPORT META DEFAULT TEMPLATES ----
    if (action === 'list_available') {
      // Fetch templates that Meta provides as defaults
      const url = `${GRAPH_URL}/${WABA_ID}/message_templates?access_token=${META_TOKEN}&limit=100&status=APPROVED`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        return json({ error: 'Failed to fetch templates', meta_error: data.error?.message }, 502);
      }

      const templates = (data.data || []).map((t: Record<string, unknown>) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        category: t.category,
        language: t.language,
        components: t.components,
      }));

      return json({ templates });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error('wa-templates error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
