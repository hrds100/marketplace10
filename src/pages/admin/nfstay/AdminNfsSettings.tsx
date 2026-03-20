import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

export default function AdminNfsSettings() {
  const [saving, setSaving] = useState(false);
  const [platformName, setPlatformName] = useState('NFStay');
  const [supportEmail, setSupportEmail] = useState('support@nfstay.app');
  const [commissionRate, setCommissionRate] = useState('3');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [emailNewBooking, setEmailNewBooking] = useState(true);
  const [emailCancellation, setEmailCancellation] = useState(true);
  const [welcomeTemplate, setWelcomeTemplate] = useState('Welcome to NFStay, {{name}}!\n\nYour account has been created successfully. Start exploring amazing vacation rentals from verified hosts.\n\nBest regards,\nThe NFStay Team');

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); toast({ title: "Settings saved ✓" }); }, 800);
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
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
                <Input value={platformName} onChange={e => setPlatformName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Support Email</Label>
                <Input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className="mt-1.5" />
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
              <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="fees" className="mt-6 space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Commission & Fees</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Platform Commission (%)</Label>
                <Input type="number" min={0} max={100} value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className="mt-1.5" />
                <p className="text-xs text-muted-foreground mt-1">Applied to each booking as a platform fee.</p>
              </div>
              <div>
                <Label>Payment Processor</Label>
                <Input value="Stripe" disabled className="mt-1.5 bg-muted" />
              </div>
            </div>
            <div className="bg-accent-light border border-primary/20 rounded-xl p-4">
              <p className="text-sm text-primary font-medium">Current commission: {commissionRate}% per booking</p>
              <p className="text-xs text-muted-foreground mt-1">Revenue is split between the operator ({100 - Number(commissionRate)}%) and the platform ({commissionRate}%).</p>
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
                <Switch checked={emailNewBooking} onCheckedChange={setEmailNewBooking} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Cancellation notification</p>
                  <p className="text-xs text-muted-foreground">Email sent when a booking is cancelled.</p>
                </div>
                <Switch checked={emailCancellation} onCheckedChange={setEmailCancellation} />
              </div>
              <hr className="border-border" />
              <div>
                <Label>Welcome Email Template</Label>
                <Textarea value={welcomeTemplate} onChange={e => setWelcomeTemplate(e.target.value)} rows={6} className="mt-1.5 font-mono text-xs" />
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
              <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
            </div>
            {maintenanceMode && (
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-3">
                <p className="text-xs font-medium text-warning">⚠ Maintenance mode is ON. The public site is inaccessible.</p>
              </div>
            )}
          </section>
          <section className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground">These actions are irreversible. Please proceed with caution.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-lg text-destructive border-destructive/30">Clear all cache</Button>
              <Button variant="outline" className="rounded-lg text-destructive border-destructive/30">Reset analytics</Button>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="rounded-lg" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
      </div>
    </div>
  );
}
