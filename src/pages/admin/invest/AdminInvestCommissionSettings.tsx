import { useState } from 'react';
import { Save, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useCommissionSettings, useUpdateCommissionRate } from '@/hooks/useInvestData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface GlobalRate {
  key: string;
  label: string;
  description: string;
  rate: number;
  dbId?: string;
}

interface AgentOverride {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  subscriptionRate: number;
  firstPurchaseRate: number;
  recurringRate: number;
  isCustom: boolean;
}

const fallbackGlobalRates: GlobalRate[] = [
  { key: 'subscription', label: 'Subscription Commission', description: 'Percentage of subscription fee paid to the referring agent when their referral subscribes to any paid plan.', rate: 40 },
  { key: 'investment_first', label: 'Investment First Purchase', description: 'One-time commission on the first share purchase made by a referred investor. Applied once per referred user per property.', rate: 5 },
  { key: 'investment_recurring', label: 'Investment Recurring', description: 'Ongoing commission on subsequent share purchases by a referred investor. Applied on every purchase after the first.', rate: 2 },
];

const rateLabels: Record<string, { label: string; description: string }> = {
  subscription: { label: 'Subscription Commission', description: 'Percentage of subscription fee paid to the referring agent when their referral subscribes to any paid plan.' },
  investment_first: { label: 'Investment First Purchase', description: 'One-time commission on the first share purchase made by a referred investor. Applied once per referred user per property.' },
  investment_recurring: { label: 'Investment Recurring', description: 'Ongoing commission on subsequent share purchases by a referred investor. Applied on every purchase after the first.' },
};

const initialAgents: AgentOverride[] = [
  { id: 'a1', name: 'Hugo Souza', email: 'hugo@nfstay.com', referralCode: 'HUGO2026', subscriptionRate: 40, firstPurchaseRate: 7, recurringRate: 3, isCustom: true },
  { id: 'a2', name: 'John Smith', email: 'john@gmail.com', referralCode: 'JOHN100', subscriptionRate: 40, firstPurchaseRate: 5, recurringRate: 2, isCustom: false },
  { id: 'a3', name: 'Sarah Chen', email: 'sarah@outlook.com', referralCode: 'SARAH88', subscriptionRate: 40, firstPurchaseRate: 5, recurringRate: 2, isCustom: false },
  { id: 'a4', name: 'Ahmed Ali', email: 'ahmed@yahoo.com', referralCode: 'AHMED55', subscriptionRate: 50, firstPurchaseRate: 6, recurringRate: 2.5, isCustom: true },
  { id: 'a5', name: 'Maria Garcia', email: 'maria@gmail.com', referralCode: 'MARIA77', subscriptionRate: 40, firstPurchaseRate: 5, recurringRate: 2, isCustom: false },
];

const allUsers = [
  { id: 'u1', name: 'Hugo Souza', email: 'hugo@nfstay.com' },
  { id: 'u2', name: 'John Smith', email: 'john@gmail.com' },
  { id: 'u3', name: 'Sarah Chen', email: 'sarah@outlook.com' },
  { id: 'u4', name: 'Ahmed Ali', email: 'ahmed@yahoo.com' },
  { id: 'u5', name: 'Maria Garcia', email: 'maria@gmail.com' },
  { id: 'u6', name: 'David Park', email: 'david@proton.me' },
];

export default function AdminInvestCommissionSettings() {
  const { data: commissionRows = [], isLoading: isLoadingSettings } = useCommissionSettings();
  const updateCommissionRate = useUpdateCommissionRate();

  // Map DB rows (global defaults only: user_id IS NULL) to GlobalRate shape
  // DB stores rate as decimal (0.40), UI shows as percentage (40)
  const globalRates: GlobalRate[] = (() => {
    const globalRows = commissionRows.filter((r: Record<string, unknown>) => r.user_id === null);
    if (globalRows.length === 0) return fallbackGlobalRates;
    return globalRows.map((r: Record<string, unknown>) => ({
      key: r.commission_type as string,
      label: rateLabels[r.commission_type as string]?.label || (r.commission_type as string),
      description: rateLabels[r.commission_type as string]?.description || '',
      rate: Number(r.rate) * 100,
      dbId: r.id as string,
    }));
  })();

  const [agents, setAgents] = useState<AgentOverride[]>(initialAgents);
  const [editingGlobal, setEditingGlobal] = useState<Record<string, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<AgentOverride | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    userId: '',
    subscriptionRate: 40,
    firstPurchaseRate: 5,
    recurringRate: 2,
  });
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const handleGlobalEdit = (key: string, value: number) => {
    setEditingGlobal((prev) => ({ ...prev, [key]: value }));
  };

  const handleGlobalSave = async (key: string) => {
    const value = editingGlobal[key];
    if (value === undefined) return;
    // Find the DB row id for this commission type
    const row = globalRates.find((r) => r.key === key);
    if (row?.dbId) {
      try {
        await updateCommissionRate.mutateAsync({ id: row.dbId, rate: value / 100 });
      } catch (err) {
        console.error('Failed to update commission rate:', err);
        return;
      }
    }
    setEditingGlobal((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 1500);
  };

  const openAddOverride = () => {
    setEditAgent(null);
    setOverrideForm({ userId: '', subscriptionRate: 40, firstPurchaseRate: 5, recurringRate: 2 });
    setModalOpen(true);
  };

  const openEditOverride = (agent: AgentOverride) => {
    setEditAgent(agent);
    setOverrideForm({
      userId: agent.id,
      subscriptionRate: agent.subscriptionRate,
      firstPurchaseRate: agent.firstPurchaseRate,
      recurringRate: agent.recurringRate,
    });
    setModalOpen(true);
  };

  const saveOverride = () => {
    if (editAgent) {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === editAgent.id
            ? { ...a, subscriptionRate: overrideForm.subscriptionRate, firstPurchaseRate: overrideForm.firstPurchaseRate, recurringRate: overrideForm.recurringRate, isCustom: true }
            : a
        )
      );
    } else {
      const selectedUser = allUsers.find((u) => u.id === overrideForm.userId);
      if (!selectedUser) return;
      setAgents((prev) => [
        ...prev,
        {
          id: selectedUser.id,
          name: selectedUser.name,
          email: selectedUser.email,
          referralCode: selectedUser.name.split(' ')[0].toUpperCase() + '99',
          subscriptionRate: overrideForm.subscriptionRate,
          firstPurchaseRate: overrideForm.firstPurchaseRate,
          recurringRate: overrideForm.recurringRate,
          isCustom: true,
        },
      ]);
    }
    setModalOpen(false);
  };

  const removeOverride = (id: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              subscriptionRate: globalRates.find((r) => r.key === 'subscription')!.rate,
              firstPurchaseRate: globalRates.find((r) => r.key === 'investment_first')!.rate,
              recurringRate: globalRates.find((r) => r.key === 'investment_recurring')!.rate,
              isCustom: false,
            }
          : a
      )
    );
  };

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground mb-6">Commission Settings</h1>

      {/* Global Defaults */}
      <Card className="border-border mb-8">
        <CardHeader>
          <CardTitle className="text-base">Global Default Rates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingSettings ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading rates...
            </div>
          ) : globalRates.map((r) => {
            const editValue = editingGlobal[r.key];
            const hasEdit = editValue !== undefined && editValue !== r.rate;
            return (
              <div key={r.key} className="flex items-start gap-6 pb-6 border-b border-border last:border-0 last:pb-0">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground mb-1">{r.label}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{r.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative w-24">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      className="w-full h-10 px-3 pr-7 rounded-md border border-input bg-background text-sm text-right font-medium"
                      value={editValue !== undefined ? editValue : r.rate}
                      onChange={(e) => handleGlobalEdit(r.key, Number(e.target.value))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                  <Button
                    size="sm"
                    disabled={!hasEdit}
                    onClick={() => handleGlobalSave(r.key)}
                    className="gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savedKey === r.key ? 'Saved' : 'Save'}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Per-User Overrides (mock data — no user-commission junction data yet) */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">Per-User Overrides</h2>
        <Button onClick={openAddOverride} variant="outline" className="gap-2">
          <Plus className="w-4 h-4" /> Add Override
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent Name</TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead className="text-right">Subscription Rate</TableHead>
                <TableHead className="text-right">First Purchase Rate</TableHead>
                <TableHead className="text-right">Recurring Rate</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm', a.isCustom && 'font-bold')}>{a.name}</span>
                      {a.isCustom && (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Custom
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{a.email}</div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{a.referralCode}</TableCell>
                  <TableCell className={cn('text-right text-sm', a.isCustom && 'font-bold')}>{a.subscriptionRate}%</TableCell>
                  <TableCell className={cn('text-right text-sm', a.isCustom && 'font-bold')}>{a.firstPurchaseRate}%</TableCell>
                  <TableCell className={cn('text-right text-sm', a.isCustom && 'font-bold')}>{a.recurringRate}%</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditOverride(a)} title="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {a.isCustom && (
                        <Button variant="ghost" size="sm" onClick={() => removeOverride(a.id)} title="Remove Override">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Override Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editAgent ? `Edit Override: ${editAgent.name}` : 'Add Override'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editAgent && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Select User</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={overrideForm.userId}
                  onChange={(e) => setOverrideForm((f) => ({ ...f, userId: e.target.value }))}
                >
                  <option value="">Choose a user...</option>
                  {allUsers
                    .filter((u) => !agents.some((a) => a.id === u.id && a.isCustom))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Subscription Rate (%)</label>
              <input
                type="number"
                step="0.5"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={overrideForm.subscriptionRate}
                onChange={(e) => setOverrideForm((f) => ({ ...f, subscriptionRate: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">First Purchase Rate (%)</label>
              <input
                type="number"
                step="0.5"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={overrideForm.firstPurchaseRate}
                onChange={(e) => setOverrideForm((f) => ({ ...f, firstPurchaseRate: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Recurring Rate (%)</label>
              <input
                type="number"
                step="0.5"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={overrideForm.recurringRate}
                onChange={(e) => setOverrideForm((f) => ({ ...f, recurringRate: Number(e.target.value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={saveOverride} disabled={!editAgent && !overrideForm.userId}>
              {editAgent ? 'Save Changes' : 'Add Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
