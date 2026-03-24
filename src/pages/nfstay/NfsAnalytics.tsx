// Operator analytics dashboard
import { useState } from 'react';
import { useNfsOperator } from '@/hooks/nfstay/use-nfs-operator';
import { useNfsAnalyticsSummary } from '@/hooks/nfstay/use-nfs-analytics';
import { BarChart3, Eye, Home, ShoppingCart, TrendingUp } from 'lucide-react';

export default function NfsAnalytics() {
  const { operator, loading: opLoading } = useNfsOperator();
  const [days, setDays] = useState(30);
  const { summary, loading, error } = useNfsAnalyticsSummary(operator?.id, days);

  if (opLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div data-feature="BOOKING_NFSTAY__OPERATOR_DASHBOARD" className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <select
          data-feature="BOOKING_NFSTAY__ANALYTICS_FILTER"
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="h-9 rounded-lg border border-border/40 bg-background px-3 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {!summary ? (
        <div className="text-center py-16">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No analytics data yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Data will appear once your storefront gets traffic.</p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Eye} label="Page Views" value={summary.totalPageViews} data-feature="BOOKING_NFSTAY__ANALYTICS_VIEWS" />
            <StatCard icon={Home} label="Property Views" value={summary.totalPropertyViews} />
            <StatCard icon={ShoppingCart} label="Bookings Started" value={summary.totalBookingStarts} data-feature="BOOKING_NFSTAY__ANALYTICS_BOOKINGS" />
            <StatCard icon={TrendingUp} label="Conversion Rate" value={`${summary.conversionRate.toFixed(1)}%`} data-feature="BOOKING_NFSTAY__ANALYTICS_REVENUE" />
          </div>

          {/* Views by day (simple bar chart) */}
          {summary.viewsByDay.length > 0 && (
            <div className="rounded-xl border border-border/40 p-5">
              <h3 className="font-semibold text-sm mb-4">Daily Activity</h3>
              <div className="flex items-end gap-1 h-32">
                {summary.viewsByDay.map(d => {
                  const max = Math.max(...summary.viewsByDay.map(v => v.views), 1);
                  const height = (d.views / max) * 100;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 bg-primary/70 rounded-t hover:bg-primary transition-colors"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${d.date}: ${d.views} events`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{summary.viewsByDay[0]?.date}</span>
                <span>{summary.viewsByDay[summary.viewsByDay.length - 1]?.date}</span>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top properties */}
            {summary.topProperties.length > 0 && (
              <div className="rounded-xl border border-border/40 p-5">
                <h3 className="font-semibold text-sm mb-3">Top Properties</h3>
                <div className="space-y-2">
                  {summary.topProperties.map((p, i) => (
                    <div key={p.propertyId} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {i + 1}. {p.propertyId.slice(0, 8)}...
                      </span>
                      <span className="font-medium">{p.views} views</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Traffic sources */}
            {summary.viewsBySource.length > 0 && (
              <div className="rounded-xl border border-border/40 p-5">
                <h3 className="font-semibold text-sm mb-3">Traffic Sources</h3>
                <div className="space-y-2">
                  {summary.viewsBySource.map(s => (
                    <div key={s.source} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{s.source}</span>
                      <span className="font-medium">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border/40 p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
