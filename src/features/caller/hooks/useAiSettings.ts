// Caller — useAiSettings.
// Reads / writes the singleton wk_ai_settings row (name='default').
// Phase 5 skeleton: covers the four most-edited fields:
//   - coach_style_prompt   (Layer 1: voice)
//   - coach_script_prompt  (Layer 2: call logic)
//   - ai_enabled
//   - live_coach_enabled
// API key + model selection + per-campaign overrides land in a future
// admin-only PR. Logged in docs/caller/LOG.md.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AiSettings {
  coachStylePrompt: string;
  coachScriptPrompt: string;
  aiEnabled: boolean;
  liveCoachEnabled: boolean;
}

const DEFAULTS: AiSettings = {
  coachStylePrompt: '',
  coachScriptPrompt: '',
  aiEnabled: true,
  liveCoachEnabled: true,
};

interface AiSettingsRow {
  coach_style_prompt: string | null;
  coach_script_prompt: string | null;
  ai_enabled: boolean | null;
  live_coach_enabled: boolean | null;
}

export function useAiSettings() {
  const [settings, setSettings] = useState<AiSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: e } = await (supabase.from('wk_ai_settings' as any) as any)
      .select(
        'coach_style_prompt, coach_script_prompt, ai_enabled, live_coach_enabled'
      )
      .eq('name', 'default')
      .maybeSingle();
    if (e) {
      setError(e.message);
      setLoading(false);
      return;
    }
    const r = (data as AiSettingsRow | null) ?? null;
    setSettings({
      coachStylePrompt: r?.coach_style_prompt ?? '',
      coachScriptPrompt: r?.coach_script_prompt ?? '',
      aiEnabled: r?.ai_enabled ?? true,
      liveCoachEnabled: r?.live_coach_enabled ?? true,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = useCallback(<K extends keyof AiSettings>(k: K, v: AiSettings[K]) => {
    setSettings((s) => ({ ...s, [k]: v }));
    setSaved(false);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: e } = await (supabase.from('wk_ai_settings' as any) as any).upsert(
      {
        name: 'default',
        coach_style_prompt: settings.coachStylePrompt,
        coach_script_prompt: settings.coachScriptPrompt,
        ai_enabled: settings.aiEnabled,
        live_coach_enabled: settings.liveCoachEnabled,
      },
      { onConflict: 'name' }
    );
    if (e) setError(e.message);
    else setSaved(true);
    setSaving(false);
  }, [settings]);

  return { settings, setField, save, saving, saved, loading, error, reload: load };
}
