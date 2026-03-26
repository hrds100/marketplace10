import { useState, useMemo } from 'react';
import { DollarSign, Users, Building2, TrendingUp, Clock, Plus, Eye, CreditCard, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useInvestProperties, useInvestOrders, useAllShareholders, useAllPayoutClaims } from '@/hooks/useInvestData';

const quickActions = [
  { icon: Plus, label: 'Add Property', variant: 'default' as const },
  { icon: Eye, label: 'View Orders', variant: 'outline' as const },
  { icon: CreditCard, label: 'Process Payouts', variant: 'outline' as const },
  { icon: Settings, label: 'Commission Settings', variant: 'outline' as const },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? 's' : ''} ago`;
}

export default function AdminInvestDashboard() {
  const [clickedAction, setClickedAction] = useState<string | null>(null);

  const { data: properties = [] } = useInvestProperties();
  const { data: orders = [] } = useInvestOrders();
  const { data: shareholders = [] } = useAllShareholders();
  const { data: claims = [] } = useAllPayoutClaims();

  const stats = useMemo(() => {
    const totalInvested = orders
      .filter((o: any) => o.status === 'completed')
      .reduce((sum: number, o: any) => sum + Number(o.amount_paid || 0), 0);
    const uniqueShareholders = new Set((shareholders as any[]).map((s: any) => s.user_id)).size;
    const pendingPayouts = claims
      .filter((c: any) => c.status === 'pending')
      .reduce((sum: number, c: any) => sum + Number(c.amount_entitled || 0), 0);

    // Monthly Revenue: sum of paid claims in the current calendar month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthlyRevenue = claims
      .filter((c: any) => c.status === 'paid' && c.created_at >= monthStart)
      .reduce((sum: number, c: any) => sum + Number(c.amount_entitled || 0), 0);

    return [
      { icon: DollarSign, label: 'Total Allocated', value: `$${totalInvested.toLocaleString()}`, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { icon: Users, label: 'Total Shareholders', value: String(uniqueShareholders), color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { icon: Building2, label: 'Active Properties', value: String(properties.length), color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { icon: TrendingUp, label: 'Monthly Revenue', value: `$${monthlyRevenue.toLocaleString()}`, color: 'text-purple-500', bg: 'bg-purple-500/10' },
      { icon: Clock, label: 'Pending Payouts', value: `$${pendingPayouts.toLocaleString()}`, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    ];
  }, [orders, shareholders, properties, claims]);

  // Real activity feed: last 10 orders (pending + completed)
  const activities = useMemo(() => {
    return (orders as any[])
      .filter((o: any) => o.status === 'completed' || o.status === 'pending')
      .slice(0, 10)
      .map((o: any) => {
        const name = o.user_name || o.user_email?.split('@')[0] || o.user_id?.slice(0, 8) || 'Partner';
        const dateStr = o.created_at
          ? new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ', ' +
            new Date(o.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          : '';
        return {
          name,
          email: o.user_email || '',
          whatsapp: o.user_whatsapp || '',
          shares: o.shares_requested || o.shares_count || o.shares || '?',
          status: o.status || 'pending',
          property: o.inv_properties?.title || 'a property',
          date: dateStr,
          timeAgo: o.created_at ? timeAgo(o.created_at) : '',
        };
      });
  }, [orders]);

  return (
    <div data-feature="ADMIN__INVEST">
      <h1 className="text-[28px] font-bold text-foreground mb-6">Partnership Dashboard</h1>

      {/* Stat cards */}
      <div data-feature="ADMIN__INVEST_STATS" className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-5">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', s.bg)}>
                <s.icon className={cn('w-5 h-5', s.color)} />
              </div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Activity — 60% */}
        <Card className="lg:col-span-3 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No orders yet.</p>
              ) : activities.map((a, i) => (
                <div
                  key={i}
                  className="py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {a.name} purchased {a.shares} share{Number(a.shares) !== 1 ? 's' : ''} of {a.property}
                      {a.status === 'pending' && <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{a.timeAgo}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{a.date}</span>
                    {a.email && <span>{a.email}</span>}
                    {a.whatsapp && <span>WhatsApp: {a.whatsapp}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions — 40% */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div data-feature="ADMIN__INVEST_ACTIONS" className="space-y-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant}
                  className="w-full justify-start gap-3 h-11"
                  onClick={() => {
                    setClickedAction(action.label);
                    setTimeout(() => setClickedAction(null), 1500);
                  }}
                >
                  <action.icon className="w-4 h-4" />
                  {action.label}
                  {clickedAction === action.label && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Navigating...
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {(() => {
              const totalSharesSold = (orders as any[])
                .filter((o: any) => o.status === 'completed')
                .reduce((sum: number, o: any) => sum + Number(o.shares_count || 0), 0);
              return (
                <div className="mt-6 p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Partnership Summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Properties</span>
                      <span className="font-medium text-foreground">{properties.length} active</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Shares Sold</span>
                      <span className="font-medium text-foreground">{totalSharesSold.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
