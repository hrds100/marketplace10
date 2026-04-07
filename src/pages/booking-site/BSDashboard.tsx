import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Building2, CalendarCheck, Star, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import { supabase } from '@/integrations/supabase/client';

export default function BSDashboard() {
  const { isAdmin } = useAuth();
  const { operator } = useNfsOperator();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ properties: 0, reservations: 0, revenue: 0, operators: 0 });

  useEffect(() => {
    if (!isAdmin && !operator?.id) return;
    setLoading(true);

    const propsQuery = isAdmin
      ? (supabase.from('nfs_properties') as any).select('id', { count: 'exact', head: true })
      : (supabase.from('nfs_properties') as any).select('id', { count: 'exact', head: true }).eq('operator_id', operator!.id);

    const resQuery = isAdmin
      ? (supabase.from('nfs_reservations') as any).select('id, total_price')
      : (supabase.from('nfs_reservations') as any).select('id, total_price').eq('operator_id', operator!.id);

    const opsQuery = isAdmin
      ? (supabase.from('nfs_operators') as any).select('id', { count: 'exact', head: true })
      : Promise.resolve({ count: 0 });

    Promise.all([propsQuery, resQuery, opsQuery]).then(([propRes, resRes, opsRes]) => {
      const resList = resRes.data || [];
      const revenue = resList.reduce((sum: number, r: Record<string, unknown>) => sum + (Number(r.total_price) || 0), 0);
      setStats({ properties: propRes.count || 0, reservations: resList.length, revenue, operators: opsRes.count || 0 });
      setLoading(false);
    });
  }, [operator?.id, isAdmin]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? 'Platform overview across all operators.' : `Welcome back${operator?.brand_name ? `, ${operator.brand_name}` : ''}! Here's your property overview.`}
        </p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: `$${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, change: `${stats.reservations} bookings`, sub: 'all time' },
            { label: 'Active Listings', value: stats.properties, icon: Building2, change: `${stats.properties} total`, sub: 'properties' },
            { label: 'Reservations', value: stats.reservations, icon: CalendarCheck, change: `${stats.reservations} total`, sub: 'reservations' },
            ...(isAdmin
              ? [{ label: 'Active Operators', value: stats.operators, icon: Users, change: `${stats.operators} total`, sub: 'operators' }]
              : [{ label: 'Avg Rating', value: '-', icon: Star, change: '-', sub: 'coming soon' }]),
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center">
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-primary font-medium">{s.change}</span> {s.sub}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
