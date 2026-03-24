import { useState } from 'react';
import { toast } from 'sonner';
import { useInvestOrders } from '@/hooks/useInvestData';
import { supabase } from '@/integrations/supabase/client';
import { Check, Pencil, X, Link2, Search, Download, Loader2 } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

interface Order {
  id: string;
  user_id: string;
  user_email: string;
  investor_wallet: string;
  property_id: number;
  property_title: string;
  shares: number;
  amount: number;
  payment_method: string;
  agent_wallet: string;
  status: string;
  tx_hash: string;
  wallet_address: string;
  created_at: string;
}

const paymentColors: Record<string, string> = {
  card: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  crypto_usdc: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  crypto_bnb: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  refunded: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const paymentLabels: Record<string, string> = {
  card: 'Card',
  crypto_usdc: 'USDC',
  crypto_bnb: 'BNB',
};

export default function AdminInvestOrders() {
  const qc = useQueryClient();
  const {
    data: realOrders = [],
    isLoading: ordersLoading,
    isError: ordersError,
    error: ordersQueryError,
  } = useInvestOrders();

  const [statusFilter, setStatusFilter] = useState('All');
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ property_id: 0, wallet_address: '', agent_wallet: '' });

  // Map real data to display format
  const orders: Order[] = realOrders.map((o: any) => ({
    id: o.id?.toString() || '',
    user_id: o.user_id || '',
    user_email: o.user_email || o.email || '',
    investor_wallet: o.investor_wallet || '',
    property_id: o.property_id || 0,
    property_title: o.inv_properties?.title || `Property #${o.property_id}`,
    shares: o.shares_requested ?? o.shares ?? 0,
    amount: o.amount_paid ?? o.amount ?? 0,
    payment_method: o.payment_method || 'card',
    agent_wallet: o.agent_wallet || '',
    status: o.status || 'pending',
    tx_hash: o.tx_hash || '',
    wallet_address: o.wallet_address || '',
    created_at: o.created_at
      ? new Date(o.created_at).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'medium',
        })
      : '',
  }));

  // Get unique property names for filter
  const propertyOptions = ['All', ...Array.from(new Set(orders.map((o) => o.property_title)))];

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'All' && o.status !== statusFilter.toLowerCase()) return false;
    if (propertyFilter !== 'All' && o.property_title !== propertyFilter) return false;
    if (search && !o.user_email.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleComplete = async (id: string) => {
    try {
      const { error } = await (supabase.from('inv_orders') as any)
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['inv_orders'] });
      toast.success('Order marked as completed');
    } catch {
      toast.error('Failed to update order');
    }
  };

  const handleRefund = async (id: string) => {
    try {
      const { error } = await (supabase.from('inv_orders') as any)
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['inv_orders'] });
      toast.success('Order marked as refunded');
    } catch {
      toast.error('Failed to update order');
    }
  };

  const openEdit = (order: Order) => {
    setEditForm({
      property_id: order.property_id,
      wallet_address: order.investor_wallet || order.wallet_address,
      agent_wallet: order.agent_wallet,
    });
    setEditModal(order);
  };

  const saveEdit = async () => {
    if (!editModal) return;
    try {
      const { error } = await (supabase.from('inv_orders') as any)
        .update({
          property_id: editForm.property_id,
          wallet_address: editForm.wallet_address,
          agent_wallet: editForm.agent_wallet,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editModal.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['inv_orders'] });
      toast.success('Order updated');
    } catch {
      toast.error('Failed to save changes');
    }
    setEditModal(null);
  };

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (ordersError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Failed to load orders: {(ordersQueryError as Error)?.message ?? 'Unknown error'}
      </div>
    );
  }

  return (
    <div data-feature="ADMIN__INVEST">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">Investment Orders</h1>
        <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered as any[], 'investment-orders')}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All</option>
          <option>Pending</option>
          <option>Completed</option>
          <option>Refunded</option>
        </select>
        <select
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
        >
          {propertyOptions.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm w-64"
            placeholder="Search by email or order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4 max-w-3xl">
        Rows are newest first. <strong>Investor wallet</strong> comes from the user&apos;s profile (same wallet used for JV).{' '}
        On-chain shares are sent by the <strong>SamCart webhook</strong> when payment succeeds (see Tx Hash).{' '}
        <strong>Mark complete</strong> only updates status in the database — it does not send a blockchain transaction.
      </p>

      <Card className="border-border">
        <CardContent className="p-0 overflow-x-auto">
          <Table data-feature="ADMIN__INVEST_ORDERS_TABLE">
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Investor wallet</TableHead>
                <TableHead>Property</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tx Hash</TableHead>
                <TableHead>Date & time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">{o.user_email || o.user_id?.slice(0, 8)}</div>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] max-w-[140px] truncate" title={o.investor_wallet || undefined}>
                    {o.investor_wallet ? (
                      <span>{o.investor_wallet.slice(0, 6)}…{o.investor_wallet.slice(-4)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{o.property_title}</TableCell>
                  <TableCell className="text-right">{o.shares}</TableCell>
                  <TableCell className="text-right font-medium">${o.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs', paymentColors[o.payment_method] || '')}>
                      {paymentLabels[o.payment_method] || o.payment_method || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell data-feature="ADMIN__INVEST_ORDERS_STATUS">
                    <Badge variant="outline" className={cn('text-xs capitalize', statusColors[o.status] || '')}>
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {o.tx_hash ? (
                      <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                        {o.tx_hash.slice(0, 8)}...
                        <Link2 className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{'\u2014'}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{o.created_at}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {o.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs shrink-0"
                          onClick={() => handleComplete(o.id)}
                          title="Sets status to completed in the database only (does not send on-chain)"
                        >
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Mark complete
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(o)} title="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {o.status === 'completed' && (
                        <Button variant="ghost" size="sm" onClick={() => handleRefund(o.id)} title="Refund">
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    No orders yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Order {editModal?.id?.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Property ID</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={editForm.property_id}
                onChange={(e) => setEditForm((f) => ({ ...f, property_id: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Wallet Address</label>
              <input
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono"
                value={editForm.wallet_address}
                onChange={(e) => setEditForm((f) => ({ ...f, wallet_address: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Agent Wallet</label>
              <input
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono"
                value={editForm.agent_wallet}
                onChange={(e) => setEditForm((f) => ({ ...f, agent_wallet: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
