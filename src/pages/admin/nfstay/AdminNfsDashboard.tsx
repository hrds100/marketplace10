// Admin: nfstay Dashboard - wired to real Supabase data
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Users, Building2, CalendarDays, TrendingUp, ArrowUpRight, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/NfsCurrencyContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DashboardStats {
  totalUsers: number;
  totalOperators: number;
  totalReservations: number;
  totalRevenue: number;
}

interface RecentUser {
  id: string;
  name: string | null;
  email: string | null;
  wallet_address: string | null;
}

interface PendingOperator {
  id: string;
  brand_name: string | null;
  contact_email: string | null;
  created_at: string;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  bookings: number;
}

export default function AdminNfsDashboard() {
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, totalOperators: 0, totalReservations: 0, totalRevenue: 0 });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [pendingOps, setPendingOps] = useState<PendingOperator[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Counts
      const [usersRes, opsRes, resRes, revRes] = await Promise.all([
        (supabase.from('profiles') as any).select('*', { count: 'exact', head: true }),
        (supabase.from('nfs_operators') as any).select('*', { count: 'exact', head: true }),
        (supabase.from('nfs_reservations') as any).select('*', { count: 'exact', head: true }),
        (supabase.from('nfs_reservations') as any).select('total_amount'),
      ]);

      const totalRevenue = (revRes.data || []).reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0);

      setStats({
        totalUsers: usersRes.count || 0,
        totalOperators: opsRes.count || 0,
        totalReservations: resRes.count || 0,
        totalRevenue,
      });

      // Recent users (profiles may not have created_at, so order by id desc as fallback)
      const { data: usersData } = await (supabase.from('profiles') as any)
        .select('id, name, email, wallet_address')
        .order('id', { ascending: false })
        .limit(5);
      setRecentUsers(usersData || []);

      // Pending operators - check for onboarding_step as a proxy since no status column
      const { data: opsData } = await (supabase.from('nfs_operators') as any)
        .select('id, brand_name, contact_email, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      setPendingOps(opsData || []);

      // Monthly revenue from reservations (group client-side)
      const { data: allRes } = await (supabase.from('nfs_reservations') as any)
        .select('total_amount, created_at, status')
        .order('created_at', { ascending: true });

      if (allRes && allRes.length > 0) {
        const monthMap: Record<string, { revenue: number; bookings: number }> = {};
        for (const r of allRes) {
          const d = new Date(r.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!monthMap[key]) monthMap[key] = { revenue: 0, bookings: 0 };
          monthMap[key].bookings++;
          if (r.status === 'confirmed' || r.status === 'completed') {
            monthMap[key].revenue += r.total_amount || 0;
          }
        }
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        setMonthlyData(
          Object.entries(monthMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-9)
            .map(([key, val]) => ({
              month: months[parseInt(key.split('-')[1]) - 1],
              revenue: Math.round(val.revenue),
              bookings: val.bookings,
            }))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'text-primary' },
    { label: 'Operators', value: stats.totalOperators, icon: Building2, color: 'text-warning' },
    { label: 'Total Bookings', value: stats.totalReservations.toLocaleString(), icon: CalendarDays, color: 'text-info' },
    { label: 'Platform Revenue', value: formatPrice(stats.totalRevenue), icon: TrendingUp, color: 'text-primary' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div data-feature="ADMIN__NFSTAY" className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Platform overview and key metrics.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div data-feature="ADMIN__NFS_STATS" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center">
                <s.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">Platform Revenue</h2>
          {monthlyData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No revenue data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(164, 73%, 34%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(164, 73%, 34%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="hsl(164, 73%, 34%)" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">Monthly Bookings</h2>
          {monthlyData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No booking data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="bookings" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div data-feature="ADMIN__NFS_RECENT" className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent Users</h2>
            <Button variant="ghost" size="sm" asChild className="text-primary gap-1">
              <Link to="/admin/nfstay/users">View all <ArrowUpRight className="w-3 h-3" /></Link>
            </Button>
          </div>
          <div className="space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No users yet.</p>
            ) : recentUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                    {(u.name || u.email || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{u.name || 'Unnamed'}</p>
                    <p className="text-xs text-muted-foreground">{u.email || u.wallet_address?.slice(0, 10) || '--'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div data-feature="ADMIN__NFS_PENDING" className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent Operators</h2>
            <Button variant="ghost" size="sm" asChild className="text-primary gap-1">
              <Link to="/admin/nfstay/operators">View all <ArrowUpRight className="w-3 h-3" /></Link>
            </Button>
          </div>
          {pendingOps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No operators yet.</p>
          ) : (
            <div className="space-y-3">
              {pendingOps.map(op => (
                <div key={op.id} className="flex items-center justify-between border border-border rounded-xl p-3">
                  <div>
                    <p className="text-sm font-medium">{op.brand_name || 'Unnamed operator'}</p>
                    <p className="text-xs text-muted-foreground">{op.contact_email || '--'} -- Joined {new Date(op.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
