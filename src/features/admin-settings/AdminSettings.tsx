import { useState, useEffect, useCallback } from 'react';
import { Globe, Bell, Sparkles, Mail, Loader2, Send, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
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

interface EmailTemplate {
  id: string;
  type: string;
  label: string;
  category: string;
  subject: string;
  html_body: string;
  variables: string[];
}

const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  affiliate: 'Affiliate',
  investment: 'Investment',
  inquiry: 'Inquiry',
};

const TEMPLATE_CATEGORY_ORDER = ['admin', 'member', 'affiliate', 'investment', 'inquiry'];

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

  // Email template state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<{ subject: string; html_body: string } | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [testSending, setTestSending] = useState<string | null>(null);

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

  // Load email templates
  useEffect(() => {
    (async () => {
      try {
        // email_templates table not in generated types — cast needed
        const { data } = await (supabase.from('email_templates') as any)
          .select('*')
          .order('category')
          .order('label');
        if (data) setEmailTemplates(data as EmailTemplate[]);
      } catch {
        // Table may not exist yet
      } finally {
        setTemplateLoading(false);
      }
    })();
  }, []);

  // Save edited template
  const handleSaveTemplate = async (templateId: string) => {
    if (!editingTemplate) return;
    setTemplateSaving(true);
    try {
      const { error } = await (supabase.from('email_templates') as any)
        .update({
          subject: editingTemplate.subject,
          html_body: editingTemplate.html_body,
          updated_at: new Date().toISOString(),
          updated_by: user?.id || null,
        })
        .eq('id', templateId);
      if (error) throw error;
      setEmailTemplates(prev =>
        prev.map(t => t.id === templateId ? { ...t, ...editingTemplate } : t)
      );
      setExpandedTemplate(null);
      setEditingTemplate(null);
      toast.success('Template saved');
    } catch {
      toast.error('Failed to save template');
    } finally {
      setTemplateSaving(false);
    }
  };

  // Send test email
  const handleSendTest = async (template: EmailTemplate) => {
    setTestSending(template.id);
    try {
      const testData: Record<string, string> = {};
      template.variables.forEach(v => { testData[v] = `[TEST ${v}]`; });
      testData.email = user?.email || 'admin@hub.nfstay.com';
      testData.tenant_email = user?.email || 'admin@hub.nfstay.com';
      testData.memberEmail = user?.email || 'admin@hub.nfstay.com';
      testData.agentEmail = user?.email || 'admin@hub.nfstay.com';
      testData.lister_email = user?.email || 'admin@hub.nfstay.com';

      const { error } = await supabase.functions.invoke('send-email', {
        body: { type: template.type, data: testData },
      });
      if (error) throw error;
      toast.success(`Test email sent to ${user?.email}`);
    } catch {
      toast.error('Failed to send test email');
    } finally {
      setTestSending(null);
    }
  };

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

  // Group email templates by category
  const templateGroups = TEMPLATE_CATEGORY_ORDER
    .map(cat => ({
      category: cat,
      label: TEMPLATE_CATEGORY_LABELS[cat] || cat,
      items: emailTemplates.filter(t => t.category === cat),
    }))
    .filter(g => g.items.length > 0);

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
              <div className="flex items-center justify-end gap-4 pr-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 w-12 justify-center">
                  <Bell className="w-3 h-3" /> Bell
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 w-12 justify-center">
                  <Mail className="w-3 h-3" /> Email
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 w-16 justify-center">
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 w-10 justify-center">
                  SMS
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
                        <div className="flex items-center gap-4">
                          {/* Bell toggle */}
                          <div className="w-12 flex justify-center">
                            <button
                              onClick={() => toggleNotif(setting.id, 'bell_enabled', setting.bell_enabled)}
                              className={`w-9 h-5 rounded-full relative transition-colors ${
                                setting.bell_enabled ? 'bg-primary' : 'bg-border'
                              }`}
                              aria-label={`Bell notification for ${setting.label}`}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${setting.bell_enabled ? 'left-[18px]' : 'left-0.5'}`} />
                            </button>
                          </div>
                          {/* Email toggle */}
                          <div className="w-12 flex justify-center">
                            <button
                              onClick={() => toggleNotif(setting.id, 'email_enabled', setting.email_enabled)}
                              className={`w-9 h-5 rounded-full relative transition-colors ${
                                setting.email_enabled ? 'bg-primary' : 'bg-border'
                              }`}
                              aria-label={`Email notification for ${setting.label}`}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${setting.email_enabled ? 'left-[18px]' : 'left-0.5'}`} />
                            </button>
                          </div>
                          {/* WhatsApp toggle (coming soon — disabled) */}
                          <div className="w-16 flex justify-center">
                            <button disabled className="w-9 h-5 rounded-full relative bg-border opacity-40 cursor-not-allowed" title="WhatsApp — coming soon">
                              <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow" />
                            </button>
                          </div>
                          {/* SMS toggle (coming soon — disabled) */}
                          <div className="w-10 flex justify-center">
                            <button disabled className="w-9 h-5 rounded-full relative bg-border opacity-40 cursor-not-allowed" title="SMS — coming soon">
                              <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Notification Timing */}
              <div className="pt-3 border-t border-border mb-4">
                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="text-sm text-foreground">Notification scheduling</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Set quiet hours and batch notifications</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">Coming soon</span>
                </div>
              </div>

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

        {/* -- Email Templates -- */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">Email Templates</h2>
          </div>

          {templateLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading templates...
            </div>
          ) : emailTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No email templates found. Run the email_templates migration first.
            </p>
          ) : (
            <div className="space-y-5">
              {templateGroups.map(group => (
                <div key={group.category}>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    {group.label}
                  </h3>
                  <div className="space-y-0">
                    {group.items.map(template => (
                      <div key={template.id} className="border-b border-border last:border-0">
                        <div className="flex items-center justify-between py-2.5">
                          <span className="text-sm text-foreground">{template.label}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSendTest(template)}
                              disabled={testSending === template.id}
                              className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              {testSending === template.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              Send Test
                            </button>
                            <button
                              onClick={() => {
                                if (expandedTemplate === template.id) {
                                  setExpandedTemplate(null);
                                  setEditingTemplate(null);
                                } else {
                                  setExpandedTemplate(template.id);
                                  setEditingTemplate({ subject: template.subject, html_body: template.html_body });
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
                            >
                              {expandedTemplate === template.id ? (
                                <><ChevronUp className="w-3 h-3" /> Close</>
                              ) : (
                                <><ChevronDown className="w-3 h-3" /> Edit</>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expanded editor */}
                        {expandedTemplate === template.id && editingTemplate && (
                          <div className="pb-4 space-y-3">
                            <div>
                              <label className="text-xs font-semibold text-foreground block mb-1">Subject</label>
                              <input
                                value={editingTemplate.subject}
                                onChange={e => setEditingTemplate(prev => prev ? { ...prev, subject: e.target.value } : prev)}
                                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-foreground block mb-1">HTML Body</label>
                              <textarea
                                rows={12}
                                value={editingTemplate.html_body}
                                onChange={e => setEditingTemplate(prev => prev ? { ...prev, html_body: e.target.value } : prev)}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                              />
                            </div>
                            {/* Variable chips */}
                            {template.variables.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Variables:</span>
                                {template.variables.map(v => (
                                  <span key={v} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-primary">
                                    {`{{${v}}}`}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setExpandedTemplate(null); setEditingTemplate(null); }}
                                className="px-4 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveTemplate(template.id)}
                                disabled={templateSaving}
                                className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                              >
                                {templateSaving ? 'Saving...' : 'Save Template'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
