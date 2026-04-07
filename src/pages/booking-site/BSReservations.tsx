import { useState, useEffect } from 'react';
import { CalendarCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import { supabase } from '@/integrations/supabase/client';

export default function BSReservations() {
  const { isAdmin } = useAuth();
  const { operator } = useNfsOperator();
  const [reservations, setReservations] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin && !operator?.id) return;
    setLoading(true);

    const query = isAdmin
      ? (supabase.from('nfs_reservations') as any)
          .select('id, guest_name, check_in, check_out, status, total_price, nfs_properties(name), nfs_operators(brand_name)')
          .order('check_in', { ascending: false })
      : (supabase.from('nfs_reservations') as any)
          .select('id, guest_name, check_in, check_out, status, total_price, nfs_properties(name)')
          .eq('operator_id', operator!.id)
          .order('check_in', { ascending: false });

    query.then(({ data }: { data: Array<Record<string, unknown>> | null }) => {
      setReservations(data || []);
      setLoading(false);
    });
  }, [operator?.id, isAdmin]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
        <p className="text-sm text-muted-foreground">{reservations.length} total reservations</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-12">
          <CalendarCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No reservations found</p>
          <p className="text-sm text-muted-foreground">Reservations will appear here once guests book your properties.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left bg-muted/30">
                  <th className="p-4 font-medium text-muted-foreground">Guest</th>
                  <th className="p-4 font-medium text-muted-foreground">Property</th>
                  {isAdmin && <th className="p-4 font-medium text-muted-foreground">Operator</th>}
                  <th className="p-4 font-medium text-muted-foreground">Check-in</th>
                  <th className="p-4 font-medium text-muted-foreground">Check-out</th>
                  <th className="p-4 font-medium text-muted-foreground">Amount</th>
                  <th className="p-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((res) => {
                  const propData = res.nfs_properties as Record<string, unknown> | null;
                  const resOpData = res.nfs_operators as Record<string, unknown> | null;
                  return (
                    <tr key={String(res.id)} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-medium">{String(res.guest_name || '-')}</td>
                      <td className="p-4 text-muted-foreground truncate max-w-[160px]">{propData ? String(propData.name) : '-'}</td>
                      {isAdmin && <td className="p-4 text-muted-foreground">{resOpData ? String(resOpData.brand_name || 'Unknown') : '-'}</td>}
                      <td className="p-4 text-muted-foreground whitespace-nowrap">{res.check_in ? new Date(String(res.check_in)).toLocaleDateString() : '-'}</td>
                      <td className="p-4 text-muted-foreground whitespace-nowrap">{res.check_out ? new Date(String(res.check_out)).toLocaleDateString() : '-'}</td>
                      <td className="p-4 font-medium">${Number(res.total_price || 0).toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${res.status === 'confirmed' ? 'bg-green-100 text-green-700' : res.status === 'cancelled' ? 'bg-red-100 text-red-700' : res.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {String(res.status || 'pending')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
