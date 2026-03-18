import { useState } from 'react';
import { Check, Pencil, X, Link2, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  user: string;
  email: string;
  property: string;
  propertyId: number;
  shares: number;
  amount: number;
  paymentMethod: 'card' | 'crypto_usdc' | 'crypto_bnb';
  agent: string;
  status: 'pending' | 'completed' | 'refunded';
  txHash: string;
  walletAddress: string;
  agentAddress: string;
  date: string;
}

const mockOrders: Order[] = [
  { id: 'ORD-001', user: 'Hugo Souza', email: 'hugo@nfstay.com', property: 'Seseh Beachfront Villa', propertyId: 1, shares: 5, amount: 500, paymentMethod: 'crypto_usdc', agent: 'John Smith', status: 'completed', txHash: '0x8f3a...e2c1a9b7', walletAddress: '0x6eb0...1436', agentAddress: '0x8f3a...e2c1', date: '2026-03-18' },
  { id: 'ORD-002', user: 'John Smith', email: 'john@gmail.com', property: 'Marina Gate Apartment', propertyId: 2, shares: 10, amount: 2500, paymentMethod: 'card', agent: 'Hugo Souza', status: 'completed', txHash: '0x2b7c...f9a3d4e8', walletAddress: '0x8f3a...e2c1', agentAddress: '0x6eb0...1436', date: '2026-03-17' },
  { id: 'ORD-003', user: 'Sarah Chen', email: 'sarah@outlook.com', property: 'Seseh Beachfront Villa', propertyId: 1, shares: 20, amount: 2000, paymentMethod: 'crypto_bnb', agent: 'Hugo Souza', status: 'pending', txHash: '0x9c2f...a1d7b3f5', walletAddress: '0x2b7c...f9a3', agentAddress: '0x6eb0...1436', date: '2026-03-17' },
  { id: 'ORD-004', user: 'Ahmed Ali', email: 'ahmed@yahoo.com', property: 'KAEC Waterfront Residence', propertyId: 3, shares: 15, amount: 2250, paymentMethod: 'card', agent: 'Maria Garcia', status: 'completed', txHash: '0x1d4e...b8f2c6a9', walletAddress: '0x9c2f...a1d7', agentAddress: '0x1d4e...b8f2', date: '2026-03-16' },
  { id: 'ORD-005', user: 'Maria Garcia', email: 'maria@gmail.com', property: 'Seseh Beachfront Villa', propertyId: 1, shares: 8, amount: 800, paymentMethod: 'crypto_usdc', agent: 'John Smith', status: 'refunded', txHash: '0x4e7b...d2a8f1c3', walletAddress: '0x1d4e...b8f2', agentAddress: '0x8f3a...e2c1', date: '2026-03-15' },
  { id: 'ORD-006', user: 'Hugo Souza', email: 'hugo@nfstay.com', property: 'KAEC Waterfront Residence', propertyId: 3, shares: 30, amount: 4500, paymentMethod: 'crypto_bnb', agent: '', status: 'pending', txHash: '0x6c9d...e3b5a7f2', walletAddress: '0x6eb0...1436', agentAddress: '', date: '2026-03-15' },
  { id: 'ORD-007', user: 'Sarah Chen', email: 'sarah@outlook.com', property: 'Marina Gate Apartment', propertyId: 2, shares: 4, amount: 1000, paymentMethod: 'card', agent: 'Ahmed Ali', status: 'completed', txHash: '0x3a8f...c1d9e5b7', walletAddress: '0x2b7c...f9a3', agentAddress: '0x9c2f...a1d7', date: '2026-03-14' },
  { id: 'ORD-008', user: 'Ahmed Ali', email: 'ahmed@yahoo.com', property: 'Seseh Beachfront Villa', propertyId: 1, shares: 12, amount: 1200, paymentMethod: 'crypto_usdc', agent: 'Hugo Souza', status: 'pending', txHash: '0x7b2e...f4a6c8d1', walletAddress: '0x9c2f...a1d7', agentAddress: '0x6eb0...1436', date: '2026-03-13' },
];

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

const propertyOptions = ['All', 'Seseh Beachfront Villa', 'Marina Gate Apartment', 'KAEC Waterfront Residence'];

export default function AdminInvestOrders() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [statusFilter, setStatusFilter] = useState('All');
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState({ propertyId: 0, walletAddress: '', agentAddress: '' });

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'All' && o.status !== statusFilter.toLowerCase()) return false;
    if (propertyFilter !== 'All' && o.property !== propertyFilter) return false;
    if (search && !o.user.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleComplete = (id: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'completed' as const } : o)));
  };

  const handleRefund = (id: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'refunded' as const } : o)));
  };

  const openEdit = (order: Order) => {
    setEditForm({ propertyId: order.propertyId, walletAddress: order.walletAddress, agentAddress: order.agentAddress });
    setEditModal(order);
  };

  const saveEdit = () => {
    if (!editModal) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === editModal.id
          ? { ...o, propertyId: editForm.propertyId, walletAddress: editForm.walletAddress, agentAddress: editForm.agentAddress }
          : o
      )
    );
    setEditModal(null);
  };

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground mb-6">Investment Orders</h1>

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
            placeholder="Search by user or order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Property</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tx Hash</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{o.user}</div>
                    <div className="text-xs text-muted-foreground">{o.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">{o.property}</TableCell>
                  <TableCell className="text-right">{o.shares}</TableCell>
                  <TableCell className="text-right font-medium">${o.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs', paymentColors[o.paymentMethod])}>
                      {paymentLabels[o.paymentMethod]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.agent || '\u2014'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs capitalize', statusColors[o.status])}>
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                      {o.txHash.slice(0, 8)}...
                      <Link2 className="w-3 h-3" />
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{o.date}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {o.status === 'pending' && (
                        <Button variant="ghost" size="sm" onClick={() => handleComplete(o.id)} title="Complete">
                          <Check className="w-4 h-4 text-emerald-600" />
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
                    No orders found
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
            <DialogTitle>Edit Order {editModal?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Property ID</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={editForm.propertyId}
                onChange={(e) => setEditForm((f) => ({ ...f, propertyId: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Wallet Address</label>
              <input
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono"
                value={editForm.walletAddress}
                onChange={(e) => setEditForm((f) => ({ ...f, walletAddress: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Agent Address</label>
              <input
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono"
                value={editForm.agentAddress}
                onChange={(e) => setEditForm((f) => ({ ...f, agentAddress: e.target.value }))}
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
