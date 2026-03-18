import { Link } from 'react-router-dom';
import { LayoutGrid, TrendingUp, Globe, ArrowRight, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const workspaces = [
  {
    id: 'marketplace',
    title: 'Marketplace',
    description: 'Deals, users, CRM, university, affiliates, notifications',
    icon: LayoutGrid,
    to: '/admin/marketplace',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20 hover:border-primary/40',
    active: true,
  },
  {
    id: 'invest',
    title: 'Investments',
    description: 'Properties, orders, shareholders, commissions, payouts, boost',
    icon: TrendingUp,
    to: '/admin/invest',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    active: true,
  },
  {
    id: 'booking',
    title: 'Booking Site',
    description: 'Vacation rental booking management',
    icon: Globe,
    to: '/admin/booking',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    active: false,
  },
];

export default function AdminWorkspaceSelector() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mt-2">Choose a workspace to manage</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl w-full">
        {workspaces.map((ws) => {
          const Icon = ws.icon;
          if (!ws.active) {
            return (
              <Card key={ws.id} className={`rounded-2xl border-2 ${ws.border} opacity-50 cursor-not-allowed`}>
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                  <div className={`h-14 w-14 rounded-2xl ${ws.bg} flex items-center justify-center`}>
                    <Icon className={`h-7 w-7 ${ws.color}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{ws.title}</h2>
                    <p className="text-xs text-muted-foreground mt-1">{ws.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    Coming Soon
                  </div>
                </CardContent>
              </Card>
            );
          }
          return (
            <Link key={ws.id} to={ws.to} className="block">
              <Card className={`rounded-2xl border-2 ${ws.border} transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer h-full`}>
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                  <div className={`h-14 w-14 rounded-2xl ${ws.bg} flex items-center justify-center`}>
                    <Icon className={`h-7 w-7 ${ws.color}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{ws.title}</h2>
                    <p className="text-xs text-muted-foreground mt-1">{ws.description}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${ws.color}`}>
                    Enter <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
