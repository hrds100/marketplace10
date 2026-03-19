// Admin: All NFStay reservations across all operators
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Calendar, Search, ChevronDown, RefreshCw,
  Loader2, AlertCircle, CheckCircle, Clock, XCircle, Users
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type ReservationStatus = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

interface AdminReservation {
  id: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  total_amount: number;
  payment_currency: string;
  status: string;
  payment_status: string;
  booking_source: string;
  created_at: string;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_email?: string;
  property?: { public_title?: string; city?: string };
  operator?: { business_name?: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  confirmed:  { label: 'Confirmed',  color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  pending:    { label: 'Pending',    color: 'bg-amber-100 text-amber-700',   icon: Clock },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-100 text-red-700',       icon: XCircle },
  completed:  { label: 'Completed',  color: 'bg-blue-100 text-blue-700',     icon: CheckCircle },
  no_show:    { label: 'No-show',    color: 'bg-gray-100 text-gray-600',     icon: AlertCircle },
  expired:    { label: 'Expired',    color: 'bg-gray-100 text-gray-500',     icon: Clock },
};

const STATUSES: ReservationStatus[] = ['all', 'pending', 'confirmed', 'cancelled', 'completed', 'no_show'];

export default function AdminNfsReservations() {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = (supabase.from('nfs_reservations') as any)
        .select(`
          id, check_in, check_out, adults, children,
          total_amount, payment_currency, status, payment_status,
          booking_source, created_at,
          guest_first_name, guest_last_name, guest_email,
          nfs_properties!property_id(public_title, city),
          nfs_operators!operator_id(business_name)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);

      const { data, error: dbError } = await query;
      if (dbError) { setError(dbError.message); return; }

      setReservations((data || []).map((r: any) => ({
        ...r,
        property: r.nfs_properties,
        operator: r.nfs_operators,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    const { error: e } = await (supabase.from('nfs_reservations') as any)
      .update({ status: newStatus })
      .eq('id', id);
    if (!e) setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    setUpdatingId(null);
  };

  // Local filter by search query
  const filtered = reservations.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.guest_email?.toLowerCase().includes(q) ||
      r.guest_first_name?.toLowerCase().includes(q) ||
      r.guest_last_name?.toLowerCase().includes(q) ||
      r.property?.public_title?.toLowerCase().includes(q) ||
      r.operator?.business_name?.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  });

  // Revenue totals
  const confirmedRevenue = filtered
    .filter(r => r.status === 'confirmed' || r.status === 'completed')
    .reduce((sum, r) => sum + (r.total_amount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">NFStay Reservations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All bookings across all operators</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReservations} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: filtered.length, color: 'text-foreground' },
          { label: 'Confirmed', value: filtered.filter(r => r.status === 'confirmed').length, color: 'text-green-600' },
          { label: 'Pending', value: filtered.filter(r => r.status === 'pending').length, color: 'text-amber-600' },
          { label: 'Revenue', value: `£${confirmedRevenue.toFixed(0)}`, color: 'text-blue-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-card border border-border/40 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by guest, property, operator or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-purple-600 text-white'
                  : 'bg-muted hover:bg-muted/70 text-muted-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No reservations found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/40">
                {['Guest', 'Property / Operator', 'Dates', 'Guests', 'Total', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map(r => {
                const statusCfg = STATUS_CONFIG[r.status] || { label: r.status, color: 'bg-gray-100 text-gray-600', icon: Clock };
                const StatusIcon = statusCfg.icon;
                const nights = Math.ceil(
                  (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 86400000
                );

                return (
                  <tr key={r.id} className="bg-white dark:bg-card hover:bg-muted/20 transition-colors">
                    {/* Guest */}
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {[r.guest_first_name, r.guest_last_name].filter(Boolean).join(' ') || '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.guest_email || '—'}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{r.id.slice(0, 8)}…</p>
                    </td>
                    {/* Property */}
                    <td className="px-4 py-3">
                      <p className="font-medium line-clamp-1">{r.property?.public_title || '—'}</p>
                      <p className="text-xs text-muted-foreground">{r.property?.city || ''}</p>
                      {r.operator?.business_name && (
                        <p className="text-xs text-purple-600">{r.operator.business_name}</p>
                      )}
                    </td>
                    {/* Dates */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{format(new Date(r.check_in), 'MMM d')} – {format(new Date(r.check_out), 'MMM d, yy')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{nights} night{nights !== 1 ? 's' : ''}</p>
                    </td>
                    {/* Guests */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{(r.adults || 0) + (r.children || 0)}</span>
                      </div>
                    </td>
                    {/* Total */}
                    <td className="px-4 py-3 font-semibold">
                      {r.payment_currency} {r.total_amount?.toFixed(2) || '—'}
                      <p className="text-xs text-muted-foreground font-normal capitalize">{r.payment_status}</p>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        onChange={e => updateStatus(r.id, e.target.value)}
                        disabled={updatingId === r.id}
                        className="text-xs border border-border/40 rounded-md px-2 py-1 bg-background disabled:opacity-50 cursor-pointer"
                      >
                        {Object.keys(STATUS_CONFIG).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
