// useSmsTemplates — list + CRUD wk_sms_templates with the new
// stage-coupling field (move_to_stage_id) added in Phase 1 migration.
//
// Hugo 2026-04-30: dropped the auto-stage-advance idea entirely. Stage
// progression is now driven by SMS templates: pick a template that has
// move_to_stage_id set, send it, and the contact moves to that stage
// deterministically. Replaces "AI detects stage from coach output".
//
// Read scope (RLS-gated in 20260430000000_smsv2_workspace_state):
//   - is_global = true (shared)
//   - owner_agent_id = auth.uid() (own)

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SmsTemplate {
  id: string;
  name: string;
  body_md: string;
  is_global: boolean;
  owner_agent_id: string | null;
  move_to_stage_id: string | null;
  created_at: string;
  updated_at: string;
}

type TemplateInsert = Omit<SmsTemplate, 'id' | 'created_at' | 'updated_at'>;
type TemplatePatch = Partial<TemplateInsert>;

interface TmplTable {
  from: (t: string) => {
    select: (c: string) => {
      order: (
        col: string,
        opts: { ascending: boolean }
      ) => Promise<{ data: SmsTemplate[] | null; error: { message: string } | null }>;
    };
    insert: (v: Record<string, unknown>) => {
      select: (c: string) => {
        single: () => Promise<{
          data: SmsTemplate | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (v: Record<string, unknown>) => {
      eq: (c: string, v: string) => Promise<{
        error: { message: string } | null;
      }>;
    };
    delete: () => {
      eq: (c: string, v: string) => Promise<{
        error: { message: string } | null;
      }>;
    };
  };
}

export function useSmsTemplates() {
  const [items, setItems] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const { data, error: e } = await (supabase as unknown as TmplTable)
        .from('wk_sms_templates')
        .select('id, name, body_md, is_global, owner_agent_id, move_to_stage_id, created_at, updated_at')
        .order('name', { ascending: true });
      if (e) setError(e.message);
      else setItems(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = useCallback(async (row: TemplateInsert) => {
    const { data, error: e } = await (supabase as unknown as TmplTable)
      .from('wk_sms_templates')
      .insert(row)
      .select('id, name, body_md, is_global, owner_agent_id, move_to_stage_id, created_at, updated_at')
      .single();
    if (e) throw new Error(e.message);
    if (!data) throw new Error('insert returned no row');
    await reload();
    return data;
  }, [reload]);

  const patch = useCallback(async (id: string, p: TemplatePatch) => {
    const { error: e } = await (supabase as unknown as TmplTable)
      .from('wk_sms_templates')
      .update(p)
      .eq('id', id);
    if (e) throw new Error(e.message);
    await reload();
  }, [reload]);

  const remove = useCallback(async (id: string) => {
    const { error: e } = await (supabase as unknown as TmplTable)
      .from('wk_sms_templates')
      .delete()
      .eq('id', id);
    if (e) throw new Error(e.message);
    await reload();
  }, [reload]);

  return { items, loading, error, reload, add, patch, remove };
}
