import { useCurrency } from "@/contexts/NfsCurrencyContext";
import { mockPlatformStats, mockPlatformRevenue, mockUserGrowth } from "@/data/nfstay/mock-admin";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line, Legend, PieChart, Pie, Cell } from "recharts";

const COLORS = ['hsl(145, 63%, 42%)', 'hsl(217, 91%, 60%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

const bookingsByType = [
  { name: 'Apartment', value: 340 },
  { name: 'Villa', value: 220 },
  { name: 'Loft/Studio', value: 180 },
  { name: 'Other', value: 152 },
];

const topDestinations = [
  { city: 'London', bookings: 142 },
  { city: 'Dubai', bookings: 118 },
  { city: 'Barcelona', bookings: 95 },
  { city: 'Lisbon', bookings: 87 },
  { city: 'Paris', bookings: 76 },
  { city: 'Amsterdam', bookings: 68 },
];

export default function AdminNfsAnalytics() {
  const { formatPrice } = useCurrency();
  const stats = mockPlatformStats;

  return (
    <div className="p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Analytics</h1>
        <p className="text-sm text-muted-foreground">Detailed metrics and trends across the platform.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatPrice(stats.totalRevenue) },
          { label: 'Total Bookings', value: stats.totalBookings.toLocaleString() },
          { label: 'Active Listings', value: stats.activeListings },
          { label: 'Monthly Growth', value: `${stats.monthlyGrowth}%` },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={mockPlatformRevenue}>
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
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">User Growth</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={mockUserGrowth}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="travelers" stroke="hsl(145, 63%, 42%)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="operators" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">Bookings by Property Type</h2>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={bookingsByType} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={2}>
                  {bookingsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {bookingsByType.map((b, i) => (
                <div key={b.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{b.name}</span>
                  <span className="font-medium ml-auto">{b.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">Top Destinations</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topDestinations} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="city" type="category" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip />
              <Bar dataKey="bookings" fill="hsl(145, 63%, 42%)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
