import { Link } from "react-router-dom";
import { Users, Building2, CalendarDays, TrendingUp, ArrowUpRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NfsStatusBadge } from "@/components/nfstay/NfsStatusBadge";
import { mockPlatformStats, mockPlatformRevenue, mockOperatorApplications, mockUsers } from "@/data/nfstay/mock-admin";
import { mockReservations } from "@/data/nfstay/mock-reservations";
import { useCurrency } from "@/contexts/NfsCurrencyContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const stats = mockPlatformStats;

export default function AdminNfsDashboard() {
  const { formatPrice } = useCurrency();
  const pendingApps = mockOperatorApplications.filter(a => a.status === 'pending');
  const recentUsers = mockUsers.slice(0, 5);

  const statCards = [
    { label: "Total Users", value: stats.totalUsers.toLocaleString(), icon: Users, change: `+${stats.monthlyGrowth}%`, color: "text-primary" },
    { label: "Operators", value: stats.totalOperators, icon: Building2, change: `${stats.pendingApprovals} pending`, color: "text-warning" },
    { label: "Total Bookings", value: stats.totalBookings.toLocaleString(), icon: CalendarDays, change: "+8.2%", color: "text-info" },
    { label: "Platform Revenue", value: formatPrice(stats.totalRevenue), icon: TrendingUp, change: "+15.3%", color: "text-primary" },
  ];

  // satisfy unused import
  void mockReservations;

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform overview and key metrics.</p>
      </div>

      {pendingApps.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-warning" />
            <div>
              <p className="text-sm font-semibold">{pendingApps.length} operator application{pendingApps.length > 1 ? 's' : ''} pending review</p>
              <p className="text-xs text-muted-foreground">New operators are waiting for approval to start listing properties.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="rounded-lg">
            <Link to="/admin/nfstay/operators">Review now</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center">
                <s.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className={`text-xs mt-1 font-medium ${s.color}`}>{s.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">Platform Revenue</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mockPlatformRevenue}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(145, 63%, 42%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(145, 63%, 42%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="hsl(145, 63%, 42%)" fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">Monthly Bookings</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockPlatformRevenue}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="bookings" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent Users</h2>
            <Button variant="ghost" size="sm" asChild className="text-primary gap-1">
              <Link to="/admin/nfstay/users">View all <ArrowUpRight className="w-3 h-3" /></Link>
            </Button>
          </div>
          <div className="space-y-3">
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                    {u.full_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <NfsStatusBadge status={u.role} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Pending Operator Approvals</h2>
            <Button variant="ghost" size="sm" asChild className="text-primary gap-1">
              <Link to="/admin/nfstay/operators">View all <ArrowUpRight className="w-3 h-3" /></Link>
            </Button>
          </div>
          {pendingApps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No pending applications.</p>
          ) : (
            <div className="space-y-3">
              {pendingApps.map(app => (
                <div key={app.id} className="flex items-center justify-between border border-border rounded-xl p-3">
                  <div>
                    <p className="text-sm font-medium">{app.business_name}</p>
                    <p className="text-xs text-muted-foreground">{app.country} · {app.property_count} properties · Applied {app.applied_at}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="rounded-lg h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/5">Reject</Button>
                    <Button size="sm" className="rounded-lg h-7 text-xs">Approve</Button>
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
