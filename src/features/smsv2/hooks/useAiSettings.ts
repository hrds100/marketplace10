// useAiSettings — admin hook for the wk_ai_settings singleton row.
//
// One row only (name='default'). Admin reads it on the Settings page,
// edits, hits Save → upsert by name. Edge functions (wk-ai-postcall,
// wk-ai-live-coach) read this server-side via wk_get_ai_settings RPC.

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AiSettings {
  openai_api_key: string;
  postcall_model: string;
  live_coach_model: string;
  whisper_model: string;
  ai_enabled: boolean;
  live_coach_enabled: boolean;
  postcall_system_prompt: string;
  /** @deprecated 2026-04-29 — replaced by coach_style_prompt + coach_script_prompt + wk_coach_facts. Kept as fallback only. */
  live_coach_system_prompt: string;
  /** Voice / tone / bans layer. Hugo 2026-04-29 three-layer split. */
  coach_style_prompt: string;
  /** Call stages + decision rules + retrieval instruction layer. */
  coach_script_prompt: string;
}

const DEFAULTS: AiSettings = {
  openai_api_key: '',
  postcall_model: 'gpt-4o-mini',
  live_coach_model: 'gpt-5.4-mini',
  whisper_model: 'whisper-1',
  ai_enabled: true,
  live_coach_enabled: true,
  postcall_system_prompt:
    'You are a sales-call analyst. Summarise the call, score sentiment 0-100, list next steps.',
  live_coach_system_prompt: '', // legacy, deprecated
  coach_style_prompt: '',
  coach_script_prompt: '',
};

export function useAiSettings(): {
  settings: AiSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saved: boolean;
  setField: <K extends keyof AiSettings>(k: K, v: AiSettings[K]) => void;
  save: () => Promise<void>;
} {
  const [settings, setSettings] = useState<AiSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Use the table directly (RLS gates admins); fall back to defaults.
        const { data, error: e } = await (supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              eq: (c: string, v: string) => {
                maybeSingle: () => Promise<{ data: AiSettings | null; error: { message: string } | null }>;
              };
            };
          };
        })
          .from('wk_ai_settings')
          .select(
            'openai_api_key, postcall_model, live_coach_model, whisper_model, ai_enabled, live_coach_enabled, postcall_system_prompt, live_coach_system_prompt, coach_style_prompt, coach_script_prompt'
          )
          .eq('name', 'default')
          .maybeSingle();
        if (cancelled) return;
        if (e) {
          setError(e.message);
        } else if (data) {
          setSettings({ ...DEFAULTS, ...data });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'load failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setField = useCallback(
    <K extends keyof AiSettings>(k: K, v: AiSettings[K]) => {
      setSettings((s) => ({ ...s, [k]: v }));
      setSaved(false);
    },
    []
  );

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { error: e } = await (supabase as unknown as {
        from: (t: string) => {
          upsert: (
            v: Record<string, unknown>,
            o: { onConflict: string }
          ) => Promise<{ error: { message: string } | null }>;
        };
      })
        .from('wk_ai_settings')
        .upsert({ name: 'default', ...settings }, { onConflict: 'name' });
      if (e) {
        setError(e.message);
      } else {
        setSaved(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  return { settings, loading, saving, error, saved, setField, save };
}
