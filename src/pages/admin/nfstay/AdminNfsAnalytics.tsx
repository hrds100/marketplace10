// Admin: Platform analytics - wired to real Supabase data
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/NfsCurrencyContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface AnalyticsStats {
  totalRevenue: number;
  totalBookings: number;
  totalProperties: number;
  totalUsers: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  bookings: number;
}

interface CityData {
  city: string;
  bookings: number;
}

export default function AdminNfsAnalytics() {
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState<AnalyticsStats>({ totalRevenue: 0, totalBookings: 0, totalProperties: 0, totalUsers: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [topCities, setTopCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, propsRes, resAll] = await Promise.all([
        (supabase.from('profiles') as any).select('*', { count: 'exact', head: true }),
        (supabase.from('nfs_properties') as any).select('*', { count: 'exact', head: true }),
        (supabase.from('nfs_reservations') as any).select('total_amount, created_at, status'),
      ]);

      const allRes = resAll.data || [];
      const totalRevenue = allRes
        .filter((r: any) => r.status === 'confirmed' || r.status === 'completed')
        .reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0);

      setStats({
        totalRevenue,
        totalBookings: allRes.length,
        totalProperties: propsRes.count || 0,
        totalUsers: usersRes.count || 0,
      });

      // Monthly revenue/bookings
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

      // Top cities from properties
      const { data: propsData } = await (supabase.from('nfs_properties') as any)
        .select('city')
        .not('city', 'is', null);

      if (propsData && propsData.length > 0) {
        const cityMap: Record<string, number> = {};
        for (const p of propsData) {
          if (p.city) {
            cityMap[p.city] = (cityMap[p.city] || 0) + 1;
          }
        }
        setTopCities(
          Object.entries(cityMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([city, bookings]) => ({ city, bookings }))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div data-feature="ADMIN__NFSTAY" className="p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Analytics</h1>
          <p className="text-sm text-muted-foreground">Detailed metrics and trends across the platform.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatPrice(stats.totalRevenue) },
          { label: 'Total Bookings', value: stats.totalBookings.toLocaleString() },
          { label: 'Properties', value: stats.totalProperties.toLocaleString() },
          { label: 'Users', value: stats.totalUsers.toLocaleString() },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div data-feature="ADMIN__NFS_ANALYTICS_CHARTS" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">Revenue Trend</h2>
          {monthlyData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No revenue data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(145, 63%, 42%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(145, 63%, 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="hsl(145, 63%, 42%)" fill="url(#adminRevGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">Monthly Bookings</h2>
          {monthlyData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No booking data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
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

      {topCities.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">Top Cities (by property count)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topCities} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="city" type="category" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip />
              <Bar dataKey="bookings" fill="hsl(145, 63%, 42%)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
