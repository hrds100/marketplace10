import { useState, useEffect } from 'react';
import { Settings, Globe, Bell, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast · Recommended)' },
  { value: 'gpt-4o', label: 'GPT-4o (More accurate · Higher cost)' },
  { value: 'claude-opus-4-5', label: 'Claude Opus 4.5 (Best reasoning · Premium)' },
];

interface AIForm {
  model_pricing: string;
  model_university: string;
  system_prompt_pricing: string;
  system_prompt_university: string;
}

const DEFAULT_AI: AIForm = {
  model_pricing: 'gpt-4o-mini',
  model_university: 'gpt-4o-mini',
  system_prompt_pricing: '',
  system_prompt_university: '',
};

export default function AdminSettings() {
  const { user } = useAuth();
  const [aiForm, setAiForm] = useState<AIForm>(DEFAULT_AI);
  const [existingRowId, setExistingRowId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiSaving, setAiSaving] = useState(false);

  // Load AI settings from Supabase on mount
  useEffect(() => {
    (async () => {
      // ai_settings table not in generated Supabase types — cast needed
      const { data } = await (supabase.from('ai_settings') as any)
        .select('*')
        .limit(1)
        .single();

      if (data) {
        setExistingRowId(data.id);
        setAiForm({
          model_pricing: data.model_pricing || 'gpt-4o-mini',
          model_university: data.model_university || 'gpt-4o-mini',
          system_prompt_pricing: data.system_prompt_pricing || '',
          system_prompt_university: data.system_prompt_university || '',
        });
      }
      setAiLoading(false);
    })();
  }, []);

  /**
   * Save AI settings: upsert to ai_settings table.
   * If existingRowId exists, update that row. Otherwise insert a new one.
   */
  const handleSaveAI = async () => {
    setAiSaving(true);
    try {
      if (existingRowId) {
        // ai_settings not in generated types
        const { error } = await (supabase.from('ai_settings') as any)
          .update({
            ...aiForm,
            updated_at: new Date().toISOString(),
            updated_by: user?.id || null,
          })
          .eq('id', existingRowId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase.from('ai_settings') as any)
          .insert({
            ...aiForm,
            updated_by: user?.id || null,
          })
          .select('id')
          .single();
        if (error) throw error;
        if (data) setExistingRowId(data.id);
      }
      toast.success('AI settings saved');
    } catch {
      toast.error('Failed to save AI settings');
    } finally {
      setAiSaving(false);
    }
  };

  return (
    <div className="max-w-[600px]">
      <h1 className="text-[28px] font-bold text-foreground mb-6">Admin Settings</h1>

      <div className="space-y-6">
        {/* ── Platform ── */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">Platform</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Site name</label>
              <input defaultValue="NFsTay" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Support email</label>
              <input defaultValue="support@nfstay.com" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            </div>
          </div>
        </div>

        {/* ── Notifications ── */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">Notifications</h2>
          </div>
          <div className="space-y-3">
            {['Email new submissions to admin', 'Email new signups to admin', 'Weekly analytics digest'].map(s => (
              <div key={s} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-foreground">{s}</span>
                <button className="w-11 h-6 rounded-full bg-primary relative">
                  <span className="absolute top-0.5 left-[22px] w-5 h-5 rounded-full bg-white shadow" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI Engine ── */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">AI Engine</h2>
          </div>

          {aiLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading AI settings...</div>
          ) : (
            <div className="space-y-5">
              {/* Pricing model */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Airbnb Pricing Model</label>
                <select
                  value={aiForm.model_pricing}
                  onChange={e => setAiForm(p => ({ ...p, model_pricing: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {MODEL_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* University model */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">University Consultant Model</label>
                <select
                  value={aiForm.model_university}
                  onChange={e => setAiForm(p => ({ ...p, model_university: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {MODEL_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Pricing system prompt */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Pricing AI System Prompt</label>
                <textarea
                  rows={10}
                  value={aiForm.system_prompt_pricing}
                  onChange={e => setAiForm(p => ({ ...p, system_prompt_pricing: e.target.value }))}
                  placeholder="You are NFsTay's Airbnb Revenue Estimation Engine..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">This is the instruction set sent to the AI before every pricing request. Edit carefully — changes apply immediately.</p>
              </div>

              {/* University system prompt */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">University AI System Prompt</label>
                <textarea
                  rows={10}
                  value={aiForm.system_prompt_university}
                  onChange={e => setAiForm(p => ({ ...p, system_prompt_university: e.target.value }))}
                  placeholder="You are NFsTay's AI Consultant for rent-to-rent education..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">This is the instruction set for the lesson chat assistant. Keep it focused on UK rent-to-rent.</p>
              </div>

              <button
                onClick={handleSaveAI}
                disabled={aiSaving}
                className="h-11 px-6 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {aiSaving ? 'Saving...' : 'Save AI settings'}
              </button>
            </div>
          )}
        </div>

        <button className="h-11 px-6 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm hover:opacity-90 transition-opacity">Save settings</button>
      </div>
    </div>
  );
}
