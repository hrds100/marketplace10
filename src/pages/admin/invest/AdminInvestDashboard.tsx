import { useState, useMemo } from 'react';
import { DollarSign, Users, Building2, TrendingUp, Clock, Plus, Eye, CreditCard, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useInvestProperties, useInvestOrders, useAllShareholders, useAllPayoutClaims } from '@/hooks/useInvestData';

const activities = [
  'Hugo Souza purchased 5 shares of Seseh Beachfront Villa · 2 min ago',
  'Commission earned: $25 → John Smith · 8 min ago',
  'Rent deposited: $8,500 for Seseh Beachfront Villa · 22 min ago',
  'Payout claimed: $127.50 by Sarah Chen · 1 hr ago',
  'Ahmed Ali purchased 10 shares of KAEC Waterfront Residence · 2 hrs ago',
  'New property listed: Marina Gate Apartment · 3 hrs ago',
  'Commission earned: $50 → Maria Garcia · 4 hrs ago',
  'Payout processed: $340 to Hugo Souza via USDC · 6 hrs ago',
  'Property fully funded: Marina Gate Apartment · 8 hrs ago',
  'John Smith purchased 20 shares of Seseh Beachfront Villa · 12 hrs ago',
];

const quickActions = [
  { icon: Plus, label: 'Add Property', variant: 'default' as const },
  { icon: Eye, label: 'View Orders', variant: 'outline' as const },
  { icon: CreditCard, label: 'Process Payouts', variant: 'outline' as const },
  { icon: Settings, label: 'Commission Settings', variant: 'outline' as const },
];

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

    return [
      { icon: DollarSign, label: 'Total Invested', value: `$${totalInvested.toLocaleString()}`, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { icon: Users, label: 'Total Shareholders', value: String(uniqueShareholders), color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { icon: Building2, label: 'Active Properties', value: String(properties.length), color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { icon: TrendingUp, label: 'Monthly Revenue', value: '$8,500', color: 'text-purple-500', bg: 'bg-purple-500/10' },
      { icon: Clock, label: 'Pending Payouts', value: `$${pendingPayouts.toLocaleString()}`, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    ];
  }, [orders, shareholders, properties, claims]);

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground mb-6">Investment Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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
              {activities.map((a, i) => {
                const parts = a.split(' · ');
                const text = parts[0];
                const time = parts[1];
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                  >
                    <span className="text-sm text-foreground">{text}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{time}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions — 40% */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
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

            <div className="mt-6 p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Investment Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Properties</span>
                  <span className="font-medium text-foreground">3 active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg. Yield</span>
                  <span className="font-medium text-emerald-600">12.1%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Shares Sold</span>
                  <span className="font-medium text-foreground">1,860</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
