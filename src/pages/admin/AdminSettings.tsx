import { useState, useEffect, useCallback } from 'react';
import { Settings, Globe, Bell, Sparkles, Mail, Loader2 } from 'lucide-react';
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
  model_description: string;
  system_prompt_pricing: string;
  system_prompt_university: string;
  system_prompt_description: string;
}

const DEFAULT_AI: AIForm = {
  model_pricing: 'gpt-4o-mini',
  model_university: 'gpt-4o-mini',
  model_description: 'gpt-4o-mini',
  system_prompt_pricing: '',
  system_prompt_university: '',
  system_prompt_description: '',
};

interface NotifSetting {
  id: string;
  event_key: string;
  label: string;
  category: string;
  bell_enabled: boolean;
  email_enabled: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  deals: 'Deals & Listings',
  affiliate: 'Affiliates & Payouts',
  investment: 'Investment',
  nfstay: 'nfstay App',
};

const CATEGORY_ORDER = ['general', 'deals', 'affiliate', 'investment', 'nfstay'];

export default function AdminSettings() {
  const { user } = useAuth();
  const [aiForm, setAiForm] = useState<AIForm>(DEFAULT_AI);
  const [existingRowId, setExistingRowId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiSaving, setAiSaving] = useState(false);

  // Notification settings state
  const [notifSettings, setNotifSettings] = useState<NotifSetting[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);

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
          model_description: data.model_description || 'gpt-4o-mini',
          system_prompt_pricing: data.system_prompt_pricing || '',
          system_prompt_university: data.system_prompt_university || '',
          system_prompt_description: data.system_prompt_description || '',
        });
      }
      setAiLoading(false);
    })();
  }, []);

  // Load notification settings
  const fetchNotifSettings = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from('notification_settings') as any)
        .select('*')
        .order('category')
        .order('label');
      if (error) throw error;
      if (data) setNotifSettings(data as NotifSetting[]);
    } catch {
      // Table may not exist yet — show empty
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifSettings(); }, [fetchNotifSettings]);

  // Toggle a notification setting
  const toggleNotif = async (id: string, field: 'bell_enabled' | 'email_enabled', current: boolean) => {
    // Optimistic update
    setNotifSettings(prev =>
      prev.map(n => n.id === id ? { ...n, [field]: !current } : n)
    );
    try {
      const { error } = await (supabase.from('notification_settings') as any)
        .update({ [field]: !current, updated_at: new Date().toISOString(), updated_by: user?.id || null })
        .eq('id', id);
      if (error) throw error;
    } catch {
      // Revert on error
      setNotifSettings(prev =>
        prev.map(n => n.id === id ? { ...n, [field]: current } : n)
      );
      toast.error('Failed to update notification setting');
    }
  };

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

  // Group notification settings by category
  const grouped = CATEGORY_ORDER
    .map(cat => ({
      category: cat,
      label: CATEGORY_LABELS[cat] || cat,
      items: notifSettings.filter(n => n.category === cat),
    }))
    .filter(g => g.items.length > 0);

  return (
    <div data-feature="ADMIN" className="max-w-[600px]">
      <h1 className="text-[28px] font-bold text-foreground mb-6">Admin Settings</h1>

      <div className="space-y-6">
        {/* -- Platform -- */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">Platform</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Site name</label>
              <input defaultValue="nfstay" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Support email</label>
              <input defaultValue="support@nfstay.com" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            </div>
          </div>
        </div>

        {/* -- Notifications -- */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">Notifications</h2>
          </div>

          {notifLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading notification settings...
            </div>
          ) : notifSettings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No notification settings found. Run the migration to seed the notification_settings table.
            </p>
          ) : (
            <div className="space-y-5">
              {/* Column headers */}
              <div className="flex items-center justify-end gap-6 pr-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Bell className="w-3 h-3" /> Bell
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </span>
              </div>

              {grouped.map(group => (
                <div key={group.category}>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    {group.label}
                  </h3>
                  <div className="space-y-0">
                    {group.items.map(setting => (
                      <div
                        key={setting.id}
                        className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                      >
                        <span className="text-sm text-foreground">{setting.label}</span>
                        <div className="flex items-center gap-6">
                          {/* Bell toggle */}
                          <button
                            onClick={() => toggleNotif(setting.id, 'bell_enabled', setting.bell_enabled)}
                            className={`w-9 h-5 rounded-full relative transition-colors ${
                              setting.bell_enabled ? 'bg-primary' : 'bg-border'
                            }`}
                            aria-label={`Bell notification for ${setting.label}`}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                setting.bell_enabled ? 'left-[18px]' : 'left-0.5'
                              }`}
                            />
                          </button>
                          {/* Email toggle */}
                          <button
                            onClick={() => toggleNotif(setting.id, 'email_enabled', setting.email_enabled)}
                            className={`w-9 h-5 rounded-full relative transition-colors ${
                              setting.email_enabled ? 'bg-primary' : 'bg-border'
                            }`}
                            aria-label={`Email notification for ${setting.label}`}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                setting.email_enabled ? 'left-[18px]' : 'left-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Admin email recipients */}
              <div className="pt-3 border-t border-border">
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Admin email recipients
                </label>
                <input
                  defaultValue="hugo@nfstay.com, chris@nfstay.com, hello@nfstay.com"
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  placeholder="Comma-separated admin emails"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  These addresses receive all admin notification emails. Change via ADMIN_EMAIL env var in Supabase.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* -- AI Engine -- */}
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
              <div data-feature="ADMIN__SETTINGS_MODEL">
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
              <div data-feature="ADMIN__SETTINGS_PROMPT">
                <label className="text-xs font-semibold text-foreground block mb-1.5">Pricing AI System Prompt</label>
                <textarea
                  rows={10}
                  value={aiForm.system_prompt_pricing}
                  onChange={e => setAiForm(p => ({ ...p, system_prompt_pricing: e.target.value }))}
                  placeholder="You are nfstay's Airbnb Revenue Estimation Engine..."
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
                  placeholder="You are nfstay's AI Consultant for rent-to-rent education..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">This is the instruction set for the lesson chat assistant. Keep it focused on UK rent-to-rent.</p>
              </div>

              {/* Description model */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Description Generator Model</label>
                <select
                  value={aiForm.model_description}
                  onChange={e => setAiForm(p => ({ ...p, model_description: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {MODEL_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Description system prompt */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Description AI System Prompt</label>
                <textarea
                  rows={10}
                  value={aiForm.system_prompt_description}
                  onChange={e => setAiForm(p => ({ ...p, system_prompt_description: e.target.value }))}
                  placeholder="You are nfstay's property listing writer..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">This prompt generates listing descriptions when users click "Generate description with AI". Keep it UK-focused and partner-oriented.</p>
              </div>

              <button
                data-feature="ADMIN__SETTINGS_SAVE"
                onClick={handleSaveAI}
                disabled={aiSaving}
                className="h-11 px-6 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {aiSaving ? 'Saving...' : 'Save AI settings'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
