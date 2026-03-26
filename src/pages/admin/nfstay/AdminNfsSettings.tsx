// Admin: System settings - saves to admin_audit_log as JSON blob
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface PlatformSettings {
  platform_name: string;
  support_email: string;
  commission_rate: string;
  maintenance_mode: boolean;
  auto_approve: boolean;
  email_new_booking: boolean;
  email_cancellation: boolean;
  welcome_template: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platform_name: 'nfstay',
  support_email: 'support@nfstay.app',
  commission_rate: '3',
  maintenance_mode: false,
  auto_approve: false,
  email_new_booking: true,
  email_cancellation: true,
  welcome_template: 'Welcome to nfstay, {{name}}!\n\nYour account has been created successfully. Start exploring amazing vacation rentals from verified hosts.\n\nBest regards,\nThe nfstay Team',
};

export default function AdminNfsSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Load the most recent settings from admin_audit_log
  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const { data } = await (supabase.from('admin_audit_log') as any)
        .select('metadata')
        .eq('action', 'platform_settings_update')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.metadata) {
        setSettings({ ...DEFAULT_SETTINGS, ...(data.metadata as Record<string, unknown>) });
      }
    } catch {
      // First time - no settings saved yet, use defaults
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase.from('admin_audit_log') as any)
        .insert({
          action: 'platform_settings_update',
          user_id: user?.id || '',
          target_table: 'platform_settings',
          target_id: 'global',
          metadata: settings,
        });

      if (error) {
        toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Settings saved' });
      }
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loadingSettings) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div data-feature="ADMIN__NFSTAY" className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">Configure platform-wide settings and policies.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="fees">Fees & Billing</TabsTrigger>
          <TabsTrigger value="emails">Email Templates</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Platform Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Platform Name</Label>
                <Input value={settings.platform_name} onChange={e => update('platform_name', e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Support Email</Label>
                <Input type="email" value={settings.support_email} onChange={e => update('support_email', e.target.value)} className="mt-1.5" />
              </div>
            </div>
          </section>
          <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-semibold">Operator Policies</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-approve operators</p>
                <p className="text-xs text-muted-foreground">Skip manual review for new operator applications.</p>
              </div>
              <Switch data-feature="ADMIN__NFS_SETTINGS_AUTO_APPROVE" checked={settings.auto_approve} onCheckedChange={v => update('auto_approve', v)} />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="fees" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Commission & Fees</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Platform Commission (%)</Label>
                <Input data-feature="ADMIN__NFS_SETTINGS_COMMISSION" type="number" min={0} max={100} value={settings.commission_rate} onChange={e => update('commission_rate', e.target.value)} className="mt-1.5" />
                <p className="text-xs text-muted-foreground mt-1">Applied to each booking as a platform fee.</p>
              </div>
              <div>
                <Label>Payment Processor</Label>
                <Input value="Stripe" disabled className="mt-1.5 bg-muted" />
              </div>
            </div>
            <div className="bg-accent-light border border-primary/20 rounded-xl p-4">
              <p className="text-sm text-primary font-medium">Current commission: {settings.commission_rate}% per booking</p>
              <p className="text-xs text-muted-foreground mt-1">Revenue is split between the operator ({100 - Number(settings.commission_rate)}%) and the platform ({settings.commission_rate}%).</p>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="emails" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Email Templates</h2>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">New booking notification</p>
                  <p className="text-xs text-muted-foreground">Email sent to operators when a new booking is made.</p>
                </div>
                <Switch checked={settings.email_new_booking} onCheckedChange={v => update('email_new_booking', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Cancellation notification</p>
                  <p className="text-xs text-muted-foreground">Email sent when a booking is cancelled.</p>
                </div>
                <Switch checked={settings.email_cancellation} onCheckedChange={v => update('email_cancellation', v)} />
              </div>
              <hr className="border-border" />
              <div>
                <Label>Welcome Email Template</Label>
                <Textarea value={settings.welcome_template} onChange={e => update('welcome_template', e.target.value)} rows={6} className="mt-1.5 font-mono text-xs" />
                <p className="text-xs text-muted-foreground mt-1">Available variables: {"{{name}}, {{email}}, {{date}}"}</p>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="advanced" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-semibold">Advanced Settings</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" /> Maintenance Mode
                </p>
                <p className="text-xs text-muted-foreground">Show a maintenance page to all visitors. Only admins can access the site.</p>
              </div>
              <Switch data-feature="ADMIN__NFS_SETTINGS_MAINTENANCE" checked={settings.maintenance_mode} onCheckedChange={v => update('maintenance_mode', v)} />
            </div>
            {settings.maintenance_mode && (
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-3">
                <p className="text-xs font-medium text-warning">Maintenance mode is ON. The public site is inaccessible.</p>
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button data-feature="ADMIN__NFS_SETTINGS_SAVE" onClick={handleSave} className="rounded-lg" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
