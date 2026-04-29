// Caller — useSmsTemplates.
// Reads + writes wk_sms_templates with realtime. CRUD over the four
// fields agents touch: name, bodyMd, mergeFields. Merge-field detection
// is automatic on save (parses {{...}} occurrences from the body).

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SmsTemplate {
  id: string;
  name: string;
  bodyMd: string;
  mergeFields: string[];
}

interface Row {
  id: string;
  name: string | null;
  body_md: string | null;
  merge_fields: string[] | null;
}

function rowToTemplate(r: Row): SmsTemplate {
  return {
    id: r.id,
    name: r.name ?? 'Untitled',
    bodyMd: r.body_md ?? '',
    mergeFields: r.merge_fields ?? [],
  };
}

function detectMergeFields(body: string): string[] {
  const out = new Set<string>();
  const re = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) out.add(m[1]);
  return Array.from(out);
}

export function useSmsTemplates() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: e } = await (supabase.from('wk_sms_templates' as any) as any)
      .select('id, name, body_md, merge_fields')
      .order('name', { ascending: true });
    if (e) setError(e.message);
    else setTemplates(((data ?? []) as Row[]).map(rowToTemplate));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`caller-sms-templates`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'wk_sms_templates' },
        () => void load()
      )
      .subscribe();
    return () => {
      try { void supabase.removeChannel(ch); } catch { /* ignore */ }
    };
  }, [load]);

  const upsert = useCallback(
    async (
      input: { id?: string; name: string; bodyMd: string }
    ): Promise<{ ok: boolean; error?: string }> => {
      const payload = {
        ...(input.id ? { id: input.id } : {}),
        name: input.name,
        body_md: input.bodyMd,
        merge_fields: detectMergeFields(input.bodyMd),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: e } = await (supabase.from('wk_sms_templates' as any) as any)
        .upsert(payload);
      if (e) return { ok: false, error: e.message };
      return { ok: true };
    },
    []
  );

  const remove = useCallback(async (id: string): Promise<{ ok: boolean; error?: string }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: e } = await (supabase.from('wk_sms_templates' as any) as any)
      .delete()
      .eq('id', id);
    if (e) return { ok: false, error: e.message };
    return { ok: true };
  }, []);

  return { templates, loading, error, upsert, remove, reload: load };
}
