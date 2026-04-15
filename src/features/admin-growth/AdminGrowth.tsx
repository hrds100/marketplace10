import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  BarChart3, Users, MousePointerClick, Eye, Clock, ArrowUpRight,
  Megaphone, Trophy, Download, Monitor, Smartphone, Tablet,
  Globe, TrendingUp, ArrowDown, CheckCircle2, UserPlus, ChevronRight,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────

interface RawEvent {
  variant: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface VariantMetrics {
  variant: string;
  page_views: number;
  unique_visitors: number;
  button_clicks: number;
  signup_page: number;
  signup_complete: number;
  avg_time_seconds: number;
  bounce_count: number;
  scroll_25: number;
  scroll_50: number;
  scroll_75: number;
  scroll_100: number;
  buttons: Record<string, number>;
  sections: Record<string, number>;
  devices: { desktop: number; mobile: number; tablet: number };
  referrers: Record<string, number>;
}

interface DailyWinner {
  date: string;
  a_signups: number;
  b_signups: number;
  a_views: number;
  b_views: number;
  winner: 'a' | 'b' | 'tie';
}

interface ABConfig {
  enabled: boolean;
  variants: string[];
  weights: number[];
}

interface SocialProofConfig {
  enabled: boolean;
  intervalSeconds: number;
}

// ── Growth config edge function ──────────────────────────────────────

const GROWTH_CONFIG_URL = 'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/growth-config';

interface GrowthConfigRow {
  id: number;
  ab_enabled: boolean;
  ab_weights: number[];
  social_proof_enabled: boolean;
  social_proof_interval_seconds: number;
  updated_at: string;
  updated_by: string | null;
}

async function fetchGrowthConfig(): Promise<GrowthConfigRow | null> {
  try {
    const res = await fetch(GROWTH_CONFIG_URL, { method: 'GET' });
    if (!res.ok) return null;
    const data = (await res.json()) as GrowthConfigRow;
    if (typeof data?.ab_enabled !== 'boolean') return null;
    return data;
  } catch (err) {
    console.error('growth-config GET failed:', err);
    return null;
  }
}

async function postGrowthConfig(
  patch: Partial<Pick<GrowthConfigRow, 'ab_enabled' | 'ab_weights' | 'social_proof_enabled' | 'social_proof_interval_seconds'>>
): Promise<GrowthConfigRow> {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  if (!token) throw new Error('Not signed in');

  const res = await fetch(GROWTH_CONFIG_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as GrowthConfigRow;
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
  if (n >= 1000) return n.toLocaleString();
  return n.toString();
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return '0.0%';
  return ((numerator / denominator) * 100).toFixed(1) + '%';
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function deviceType(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  if (/mobile|iphone|android/i.test(ua)) return 'mobile';
  return 'desktop';
}

function referrerLabel(ref: string): string {
  if (!ref || ref === 'direct') return 'Direct';
  try {
    const host = new URL(ref).hostname.replace('www.', '');
    if (host.includes('google')) return 'Google';
    if (host.includes('facebook') || host.includes('fb.')) return 'Facebook';
    if (host.includes('instagram')) return 'Instagram';
    if (host.includes('tiktok')) return 'TikTok';
    if (host.includes('youtube')) return 'YouTube';
    if (host.includes('twitter') || host.includes('x.com')) return 'X / Twitter';
    if (host.includes('linkedin')) return 'LinkedIn';
    return host;
  } catch {
    return ref.slice(0, 30);
  }
}

// ── Main Component ───────────────────────────────────────────────────

export default function AdminGrowth() {
  const [activeTab, setActiveTab] = useState('ab-tests');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Growth</h1>
        <p className="text-sm text-[#6B7280] mt-1">A/B testing, conversion tracking, and social proof</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ab-tests" className="gap-2">
            <BarChart3 className="w-4 h-4" /> A/B Tests
          </TabsTrigger>
          <TabsTrigger value="social-proof" className="gap-2">
            <Megaphone className="w-4 h-4" /> Social Proof
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ab-tests" className="mt-6">
          <ABTestsTab />
        </TabsContent>

        <TabsContent value="social-proof" className="mt-6">
          <SocialProofTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  A/B TESTS TAB — Full analytics dashboard
// ═══════════════════════════════════════════════════════════════════════

function ABTestsTab() {
  const [rawEvents, setRawEvents] = useState<RawEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ABConfig>({
    enabled: true,
    variants: ['a', 'b'],
    weights: [50, 50],
  });
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');

  // Load config — try remote, fall back to localStorage, then defaults
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchGrowthConfig();
        if (cancelled) return;
        if (remote) {
          const next: ABConfig = {
            enabled: remote.ab_enabled,
            variants: ['a', 'b'],
            weights: remote.ab_weights,
          };
          setConfig(next);
          try { localStorage.setItem('nfs_ab_config', JSON.stringify(next)); } catch {}
          return;
        }
      } catch (err) {
        console.error('Failed to load AB config from edge function:', err);
      }
      // Fallback: localStorage → defaults
      try {
        const raw = localStorage.getItem('nfs_ab_config');
        if (raw && !cancelled) setConfig(JSON.parse(raw));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ab_events')
        .select('variant, event_type, metadata, created_at')
        .order('created_at', { ascending: true });

      if (dateRange !== 'all') {
        const days = dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        query = query.gte('created_at', since);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRawEvents((data || []) as RawEvent[]);
    } catch (err) {
      console.error('Failed to fetch AB events:', err);
      toast.error('Failed to load A/B data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Aggregate metrics ──────────────────────────────────────────────
  const { metrics, dailyWinners } = useMemo(() => {
    const map: Record<string, VariantMetrics> = {};
    for (const v of config.variants) {
      map[v] = {
        variant: v,
        page_views: 0,
        unique_visitors: 0,
        button_clicks: 0,
        signup_page: 0,
        signup_complete: 0,
        avg_time_seconds: 0,
        bounce_count: 0,
        scroll_25: 0,
        scroll_50: 0,
        scroll_75: 0,
        scroll_100: 0,
        buttons: {},
        sections: {},
        devices: { desktop: 0, mobile: 0, tablet: 0 },
        referrers: {},
      };
    }

    const timeBuckets: Record<string, { sum: number; count: number }> = {};
    const visitorSets: Record<string, Set<string>> = { a: new Set(), b: new Set() };
    const visitorEvents: Record<string, Set<string>> = {}; // visitor_id → set of event_types
    const dailyMap: Record<string, { a_signups: number; b_signups: number; a_views: number; b_views: number }> = {};

    for (const row of rawEvents) {
      const m = map[row.variant];
      if (!m) continue;

      const meta = (row.metadata || {}) as Record<string, unknown>;
      const visitorId = (meta.visitor_id as string) || '';
      const day = dateKey(row.created_at);

      // Track unique visitors
      if (visitorSets[row.variant]) visitorSets[row.variant].add(visitorId || row.created_at);

      // Track visitor event types for bounce detection
      if (visitorId) {
        const key = row.variant + ':' + visitorId;
        if (!visitorEvents[key]) visitorEvents[key] = new Set();
        visitorEvents[key].add(row.event_type);
      }

      // Daily tracking
      if (!dailyMap[day]) dailyMap[day] = { a_signups: 0, b_signups: 0, a_views: 0, b_views: 0 };

      switch (row.event_type) {
        case 'page_view': {
          m.page_views++;
          if (row.variant === 'a') dailyMap[day].a_views++;
          else dailyMap[day].b_views++;

          // Device detection
          const ua = (meta.user_agent as string) || '';
          if (ua) {
            const dt = deviceType(ua);
            m.devices[dt]++;
          }

          // Referrer tracking
          const ref = referrerLabel((meta.referrer as string) || 'direct');
          m.referrers[ref] = (m.referrers[ref] || 0) + 1;
          break;
        }

        case 'button_click': {
          m.button_clicks++;
          const btnText = (meta.text as string) || 'Unknown';
          m.buttons[btnText] = (m.buttons[btnText] || 0) + 1;
          break;
        }

        case 'section_view': {
          const sectionId = (meta.section_id as string) || 'unknown';
          m.sections[sectionId] = (m.sections[sectionId] || 0) + 1;
          break;
        }

        case 'signup_page': {
          m.signup_page++;
          if (row.variant === 'a') dailyMap[day].a_signups++;
          else dailyMap[day].b_signups++;
          break;
        }

        case 'signup_complete':
          m.signup_complete++;
          break;

        case 'time_on_page': {
          const seconds = meta.seconds as number;
          if (seconds) {
            if (!timeBuckets[row.variant]) timeBuckets[row.variant] = { sum: 0, count: 0 };
            timeBuckets[row.variant].sum += seconds;
            timeBuckets[row.variant].count++;
          }
          break;
        }

        case 'scroll_depth': {
          const p = meta.percent as number;
          if (p === 25) m.scroll_25++;
          if (p === 50) m.scroll_50++;
          if (p === 75) m.scroll_75++;
          if (p === 100) m.scroll_100++;
          break;
        }
      }
    }

    // Compute avg time + unique visitors + bounce
    for (const v of config.variants) {
      if (timeBuckets[v] && timeBuckets[v].count > 0) {
        map[v].avg_time_seconds = Math.round(timeBuckets[v].sum / timeBuckets[v].count);
      }
      map[v].unique_visitors = visitorSets[v]?.size || 0;
    }

    // Bounce = visitors who only had page_view (no clicks, no scroll, no signup)
    for (const [key, events] of Object.entries(visitorEvents)) {
      const variant = key.split(':')[0];
      if (events.size === 1 && events.has('page_view')) {
        if (map[variant]) map[variant].bounce_count++;
      }
    }

    // Daily winners
    const dailyWinners: DailyWinner[] = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => {
        const aRate = d.a_views > 0 ? d.a_signups / d.a_views : 0;
        const bRate = d.b_views > 0 ? d.b_signups / d.b_views : 0;
        return {
          date,
          a_signups: d.a_signups,
          b_signups: d.b_signups,
          a_views: d.a_views,
          b_views: d.b_views,
          winner: aRate === bRate ? 'tie' as const : aRate > bRate ? 'a' as const : 'b' as const,
        };
      });

    return { metrics: Object.values(map), dailyWinners };
  }, [rawEvents, config.variants]);

  // ── Config controls ────────────────────────────────────────────────

  async function saveConfig(updated: ABConfig) {
    // Optimistic local update + cache
    setConfig(updated);
    try { localStorage.setItem('nfs_ab_config', JSON.stringify(updated)); } catch {}
    try {
      await postGrowthConfig({
        ab_enabled: updated.enabled,
        ab_weights: updated.weights,
      });
      toast.success('Saved — live for all visitors within 30s.');
    } catch (err) {
      console.error('Failed to save AB config:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Save failed: ${msg}`);
    }
  }

  function updateWeight(index: number, value: number) {
    const w = [...config.weights];
    w[index] = value;
    if (config.variants.length === 2) w[1 - index] = 100 - value;
    saveConfig({ ...config, weights: w });
  }

  // ── CSV Export ─────────────────────────────────────────────────────

  function exportCSV() {
    const headers = ['timestamp', 'variant', 'event_type', 'metadata'];
    const rows = rawEvents.map(e =>
      [e.created_at, e.variant, e.event_type, JSON.stringify(e.metadata || {})].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nfstay-ab-data-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  }

  // ── Determine winner ───────────────────────────────────────────────

  const a = metrics.find(m => m.variant === 'a');
  const b = metrics.find(m => m.variant === 'b');
  const totalViews = (a?.page_views || 0) + (b?.page_views || 0);
  const hasEnoughData = totalViews > 50;
  const aConvRate = a && a.page_views > 0 ? a.signup_page / a.page_views : 0;
  const bConvRate = b && b.page_views > 0 ? b.signup_page / b.page_views : 0;
  const winnerVariant = aConvRate === bConvRate ? null : aConvRate > bConvRate ? 'a' : 'b';
  const winnerLift = winnerVariant && aConvRate > 0 && bConvRate > 0
    ? Math.abs(((Math.max(aConvRate, bConvRate) / Math.min(aConvRate, bConvRate)) - 1) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-8">

      {/* ── Config Card ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Test Configuration</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-normal text-[#6B7280]">
                {config.enabled ? 'Active' : 'Paused'}
              </span>
              <Switch
                checked={config.enabled}
                onCheckedChange={(v) => saveConfig({ ...config, enabled: v })}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {config.variants.map((v, i) => (
              <div key={v} className="space-y-2">
                <Label>Variant {v.toUpperCase()} — Traffic</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={config.weights[i]}
                    onChange={(e) => updateWeight(i, parseInt(e.target.value) || 0)}
                    className="w-24"
                  />
                  <span className="text-sm text-[#6B7280]">%</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#9CA3AF]">
            Variant A = <code>variant-a.html</code> &nbsp;|&nbsp; Variant B = <code>variant-b.html</code>
          </p>
        </CardContent>
      </Card>

      {/* ── Date filter + export ───────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-[#6B7280]">Period:</span>
        {(['today', '7d', '30d', 'all'] as const).map((range) => (
          <Button
            key={range}
            variant={dateRange === range ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange(range)}
          >
            {range === 'today' ? 'Today' : range === '7d' ? '7 days' : range === '30d' ? '30 days' : 'All time'}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchEvents}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#6B7280]">Loading metrics…</div>
      ) : totalViews === 0 ? (
        <div className="text-center py-16 text-[#6B7280]">
          No data yet — events will appear once visitors hit the landing page
        </div>
      ) : (
        <>
          {/* ── Winner Banner ─────────────────────────────────────── */}
          {hasEnoughData && winnerVariant && (
            <Card className="border-[#1E9A80] bg-[#ECFDF5]">
              <CardContent className="py-5 flex items-center gap-4">
                <Trophy className="w-8 h-8 text-[#1E9A80]" />
                <div>
                  <p className="font-semibold text-[#1A1A1A] text-lg">
                    Variant {winnerVariant.toUpperCase()} is winning
                  </p>
                  <p className="text-sm text-[#6B7280]">
                    {winnerLift}% higher conversion rate based on {fmt(totalViews)} total views
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Side-by-Side Comparison ───────────────────────────── */}
          <SideBySideComparison a={a!} b={b!} hasEnoughData={hasEnoughData} winnerVariant={winnerVariant} />

          {/* ── Conversion Funnel ─────────────────────────────────── */}
          <ConversionFunnel a={a!} b={b!} />

          {/* ── Section Engagement ────────────────────────────────── */}
          <SectionEngagement a={a!} b={b!} />

          {/* ── Button Breakdown ──────────────────────────────────── */}
          <ButtonBreakdown a={a!} b={b!} />

          {/* ── Device Breakdown ──────────────────────────────────── */}
          <DeviceBreakdown a={a!} b={b!} />

          {/* ── Referrer Sources ──────────────────────────────────── */}
          <ReferrerSources a={a!} b={b!} />

          {/* ── Daily Winner Timeline ─────────────────────────────── */}
          <DailyWinnerTimeline days={dailyWinners} />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  SIDE-BY-SIDE COMPARISON
// ═══════════════════════════════════════════════════════════════════════

function SideBySideComparison({ a, b, hasEnoughData, winnerVariant }: {
  a: VariantMetrics; b: VariantMetrics; hasEnoughData: boolean; winnerVariant: string | null;
}) {
  const rows: { label: string; icon: React.ReactNode; aVal: number; bVal: number; format?: 'number' | 'pct' | 'time' }[] = [
    { label: 'Page Views', icon: <Eye className="w-4 h-4" />, aVal: a.page_views, bVal: b.page_views },
    { label: 'Unique Visitors', icon: <Users className="w-4 h-4" />, aVal: a.unique_visitors, bVal: b.unique_visitors },
    { label: 'CTA Clicks', icon: <MousePointerClick className="w-4 h-4" />, aVal: a.button_clicks, bVal: b.button_clicks },
    { label: 'Reached Signup', icon: <UserPlus className="w-4 h-4" />, aVal: a.signup_page, bVal: b.signup_page },
    { label: 'Signed Up', icon: <CheckCircle2 className="w-4 h-4" />, aVal: a.signup_complete, bVal: b.signup_complete },
    { label: 'Conversion Rate', icon: <ArrowUpRight className="w-4 h-4" />, aVal: a.page_views > 0 ? (a.signup_page / a.page_views) * 100 : 0, bVal: b.page_views > 0 ? (b.signup_page / b.page_views) * 100 : 0, format: 'pct' },
    { label: 'Bounce Rate', icon: <ArrowDown className="w-4 h-4" />, aVal: a.unique_visitors > 0 ? (a.bounce_count / a.unique_visitors) * 100 : 0, bVal: b.unique_visitors > 0 ? (b.bounce_count / b.unique_visitors) * 100 : 0, format: 'pct' },
    { label: 'Avg Time on Page', icon: <Clock className="w-4 h-4" />, aVal: a.avg_time_seconds, bVal: b.avg_time_seconds, format: 'time' },
  ];

  function fmtVal(val: number, format?: string): string {
    if (format === 'pct') return val.toFixed(1) + '%';
    if (format === 'time') {
      if (val < 60) return val + 's';
      return Math.floor(val / 60) + 'm ' + (val % 60) + 's';
    }
    return fmt(val);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Side-by-Side Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Metric</TableHead>
              <TableHead className="text-center">
                <span className={hasEnoughData && winnerVariant === 'a' ? 'text-[#1E9A80] font-bold' : ''}>
                  Variant A {hasEnoughData && winnerVariant === 'a' && '👑'}
                </span>
              </TableHead>
              <TableHead className="text-center w-[120px]">vs</TableHead>
              <TableHead className="text-center">
                <span className={hasEnoughData && winnerVariant === 'b' ? 'text-[#1E9A80] font-bold' : ''}>
                  Variant B {hasEnoughData && winnerVariant === 'b' && '👑'}
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const aFormatted = fmtVal(row.aVal, row.format);
              const bFormatted = fmtVal(row.bVal, row.format);
              const max = Math.max(row.aVal, row.bVal) || 1;
              const isLowerBetter = row.label === 'Bounce Rate';
              const aWins = isLowerBetter ? row.aVal < row.bVal : row.aVal > row.bVal;
              const bWins = isLowerBetter ? row.bVal < row.aVal : row.bVal > row.aVal;

              return (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2 text-[#6B7280]">
                      {row.icon} <span className="text-[#1A1A1A]">{row.label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <span className={`text-lg font-semibold ${aWins && hasEnoughData ? 'text-[#1E9A80]' : 'text-[#1A1A1A]'}`}>
                        {aFormatted}
                      </span>
                      <div className="mt-1">
                        <div className="h-2 bg-[#F3F3EE] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: (row.aVal / max) * 100 + '%',
                              backgroundColor: aWins ? '#1E9A80' : '#9CA3AF',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs text-[#9CA3AF]">
                    {row.aVal === row.bVal ? '=' :
                      aWins ? <span className="text-[#1E9A80]">A +{Math.abs(((row.aVal - row.bVal) / (row.bVal || 1)) * 100).toFixed(0)}%</span> :
                      <span className="text-[#1E9A80]">B +{Math.abs(((row.bVal - row.aVal) / (row.aVal || 1)) * 100).toFixed(0)}%</span>
                    }
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <span className={`text-lg font-semibold ${bWins && hasEnoughData ? 'text-[#1E9A80]' : 'text-[#1A1A1A]'}`}>
                        {bFormatted}
                      </span>
                      <div className="mt-1">
                        <div className="h-2 bg-[#F3F3EE] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: (row.bVal / max) * 100 + '%',
                              backgroundColor: bWins ? '#1E9A80' : '#9CA3AF',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CONVERSION FUNNEL
// ═══════════════════════════════════════════════════════════════════════

function ConversionFunnel({ a, b }: { a: VariantMetrics; b: VariantMetrics }) {
  const steps = [
    { label: 'Landed on page', aVal: a.page_views, bVal: b.page_views },
    { label: 'Scrolled past 50%', aVal: a.scroll_50, bVal: b.scroll_50 },
    { label: 'Clicked a CTA', aVal: a.button_clicks, bVal: b.button_clicks },
    { label: 'Reached signup page', aVal: a.signup_page, bVal: b.signup_page },
    { label: 'Completed signup', aVal: a.signup_complete, bVal: b.signup_complete },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> Conversion Funnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, i) => {
            const maxVal = Math.max(step.aVal, step.bVal) || 1;
            const aDropPct = i > 0 && steps[i - 1].aVal > 0
              ? ((steps[i - 1].aVal - step.aVal) / steps[i - 1].aVal * 100).toFixed(0)
              : null;
            const bDropPct = i > 0 && steps[i - 1].bVal > 0
              ? ((steps[i - 1].bVal - step.bVal) / steps[i - 1].bVal * 100).toFixed(0)
              : null;

            return (
              <div key={step.label}>
                {i > 0 && (
                  <div className="flex items-center gap-2 py-1 text-xs text-[#9CA3AF] pl-4">
                    <ChevronRight className="w-3 h-3" />
                    <span>A dropped {aDropPct}%</span>
                    <span className="mx-2">|</span>
                    <span>B dropped {bDropPct}%</span>
                  </div>
                )}
                <div className="grid grid-cols-[180px_1fr_60px_1fr_60px] gap-3 items-center">
                  <span className="text-sm font-medium text-[#1A1A1A]">{step.label}</span>
                  <div className="h-7 bg-[#F3F3EE] rounded-lg overflow-hidden relative">
                    <div
                      className="h-full bg-[#1E9A80] rounded-lg transition-all flex items-center justify-end pr-2"
                      style={{ width: Math.max((step.aVal / maxVal) * 100, 2) + '%', opacity: 0.8 }}
                    >
                      {step.aVal > 0 && <span className="text-[11px] font-medium text-white">{fmt(step.aVal)}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-center text-[#6B7280] font-medium">A</span>
                  <div className="h-7 bg-[#F3F3EE] rounded-lg overflow-hidden relative">
                    <div
                      className="h-full bg-[#6B7280] rounded-lg transition-all flex items-center justify-end pr-2"
                      style={{ width: Math.max((step.bVal / maxVal) * 100, 2) + '%', opacity: 0.7 }}
                    >
                      {step.bVal > 0 && <span className="text-[11px] font-medium text-white">{fmt(step.bVal)}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-center text-[#6B7280] font-medium">B</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  SECTION ENGAGEMENT
// ═══════════════════════════════════════════════════════════════════════

function SectionEngagement({ a, b }: { a: VariantMetrics; b: VariantMetrics }) {
  const sectionLabels: Record<string, string> = {
    hero: 'Hero',
    deals: 'Deals',
    'how-it-works': 'How It Works',
    pricing: 'Pricing',
    university: 'University',
    cta: 'Final CTA',
  };

  const allSections = new Set([...Object.keys(a.sections), ...Object.keys(b.sections)]);
  const orderedSections = ['hero', 'deals', 'how-it-works', 'pricing', 'university', 'cta'].filter(s => allSections.has(s));

  if (orderedSections.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Section-by-Section Engagement</CardTitle>
        <p className="text-sm text-[#6B7280]">How many visitors saw each section (scrolled into view)</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead className="text-center">Variant A</TableHead>
              <TableHead className="text-center">% of visitors</TableHead>
              <TableHead className="text-center">Variant B</TableHead>
              <TableHead className="text-center">% of visitors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderedSections.map((section) => {
              const aCount = a.sections[section] || 0;
              const bCount = b.sections[section] || 0;
              const aPct = a.page_views > 0 ? (aCount / a.page_views) * 100 : 0;
              const bPct = b.page_views > 0 ? (bCount / b.page_views) * 100 : 0;
              return (
                <TableRow key={section}>
                  <TableCell className="font-medium">{sectionLabels[section] || section}</TableCell>
                  <TableCell className="text-center">{fmt(aCount)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={aPct} className="h-2 flex-1" />
                      <span className="text-sm text-[#6B7280] w-12 text-right">{aPct.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{fmt(bCount)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={bPct} className="h-2 flex-1" />
                      <span className="text-sm text-[#6B7280] w-12 text-right">{bPct.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  BUTTON BREAKDOWN
// ═══════════════════════════════════════════════════════════════════════

function ButtonBreakdown({ a, b }: { a: VariantMetrics; b: VariantMetrics }) {
  const allButtons = new Set([...Object.keys(a.buttons), ...Object.keys(b.buttons)]);
  if (allButtons.size === 0) return null;

  const sorted = Array.from(allButtons).sort((x, y) =>
    ((a.buttons[y] || 0) + (b.buttons[y] || 0)) - ((a.buttons[x] || 0) + (b.buttons[x] || 0))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MousePointerClick className="w-5 h-5" /> Button Clicks Breakdown
        </CardTitle>
        <p className="text-sm text-[#6B7280]">Which buttons visitors clicked — sorted by popularity</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Button</TableHead>
              <TableHead className="text-center">Variant A</TableHead>
              <TableHead className="text-center">Variant B</TableHead>
              <TableHead className="text-center">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((btn) => {
              const aCount = a.buttons[btn] || 0;
              const bCount = b.buttons[btn] || 0;
              return (
                <TableRow key={btn}>
                  <TableCell className="font-medium max-w-[200px] truncate">{btn}</TableCell>
                  <TableCell className="text-center">{fmt(aCount)}</TableCell>
                  <TableCell className="text-center">{fmt(bCount)}</TableCell>
                  <TableCell className="text-center font-semibold">{fmt(aCount + bCount)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  DEVICE BREAKDOWN
// ═══════════════════════════════════════════════════════════════════════

function DeviceBreakdown({ a, b }: { a: VariantMetrics; b: VariantMetrics }) {
  const devices = [
    { key: 'desktop' as const, label: 'Desktop', icon: <Monitor className="w-4 h-4" /> },
    { key: 'mobile' as const, label: 'Mobile', icon: <Smartphone className="w-4 h-4" /> },
    { key: 'tablet' as const, label: 'Tablet', icon: <Tablet className="w-4 h-4" /> },
  ];

  const aTotal = a.devices.desktop + a.devices.mobile + a.devices.tablet;
  const bTotal = b.devices.desktop + b.devices.mobile + b.devices.tablet;

  if (aTotal === 0 && bTotal === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Monitor className="w-5 h-5" /> Device Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {['a', 'b'].map((variant) => {
            const m = variant === 'a' ? a : b;
            const total = m.devices.desktop + m.devices.mobile + m.devices.tablet || 1;
            return (
              <div key={variant}>
                <p className="text-sm font-semibold text-[#1A1A1A] mb-3">Variant {variant.toUpperCase()}</p>
                <div className="space-y-3">
                  {devices.map((d) => {
                    const count = m.devices[d.key];
                    const p = (count / total) * 100;
                    return (
                      <div key={d.key} className="flex items-center gap-3">
                        <div className="text-[#6B7280] w-5">{d.icon}</div>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-[#1A1A1A]">{d.label}</span>
                            <span className="text-[#6B7280]">{fmt(count)} ({p.toFixed(0)}%)</span>
                          </div>
                          <div className="h-2 bg-[#F3F3EE] rounded-full overflow-hidden">
                            <div className="h-full bg-[#1E9A80] rounded-full" style={{ width: p + '%', opacity: 0.7 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  REFERRER SOURCES
// ═══════════════════════════════════════════════════════════════════════

function ReferrerSources({ a, b }: { a: VariantMetrics; b: VariantMetrics }) {
  const allRefs = new Set([...Object.keys(a.referrers), ...Object.keys(b.referrers)]);
  if (allRefs.size === 0) return null;

  const sorted = Array.from(allRefs).sort((x, y) =>
    ((a.referrers[y] || 0) + (b.referrers[y] || 0)) - ((a.referrers[x] || 0) + (b.referrers[x] || 0))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="w-5 h-5" /> Traffic Sources
        </CardTitle>
        <p className="text-sm text-[#6B7280]">Where your visitors are coming from</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="text-center">Variant A</TableHead>
              <TableHead className="text-center">Variant B</TableHead>
              <TableHead className="text-center">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.slice(0, 10).map((ref) => (
              <TableRow key={ref}>
                <TableCell className="font-medium">{ref}</TableCell>
                <TableCell className="text-center">{fmt(a.referrers[ref] || 0)}</TableCell>
                <TableCell className="text-center">{fmt(b.referrers[ref] || 0)}</TableCell>
                <TableCell className="text-center font-semibold">
                  {fmt((a.referrers[ref] || 0) + (b.referrers[ref] || 0))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  DAILY WINNER TIMELINE
// ═══════════════════════════════════════════════════════════════════════

function DailyWinnerTimeline({ days }: { days: DailyWinner[] }) {
  if (days.length === 0) return null;

  const aWins = days.filter(d => d.winner === 'a').length;
  const bWins = days.filter(d => d.winner === 'b').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5" /> Daily Winner Timeline
        </CardTitle>
        <p className="text-sm text-[#6B7280]">
          Which variant won each day by conversion rate — A won {aWins} days, B won {bWins} days
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {days.map((d) => {
            const aRate = d.a_views > 0 ? (d.a_signups / d.a_views * 100) : 0;
            const bRate = d.b_views > 0 ? (d.b_signups / d.b_views * 100) : 0;
            return (
              <div key={d.date} className="flex items-center gap-3 py-1.5">
                <span className="text-xs text-[#6B7280] w-20 font-mono">{d.date}</span>
                <div className="flex-1 flex items-center gap-2">
                  {/* A bar */}
                  <span className="text-xs text-[#6B7280] w-6 text-right">A</span>
                  <div className="flex-1 h-5 bg-[#F3F3EE] rounded overflow-hidden relative">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: Math.max(aRate * 3, 2) + '%',
                        backgroundColor: d.winner === 'a' ? '#1E9A80' : '#9CA3AF',
                        opacity: d.winner === 'a' ? 0.9 : 0.4,
                      }}
                    />
                    <span className="absolute right-2 top-0 h-full flex items-center text-[10px] text-[#6B7280]">
                      {aRate.toFixed(1)}% ({d.a_signups}/{d.a_views})
                    </span>
                  </div>
                </div>
                <div className="w-6 text-center">
                  {d.winner === 'tie' ? (
                    <span className="text-xs text-[#9CA3AF]">=</span>
                  ) : (
                    <span className={`text-xs font-bold ${d.winner === 'a' ? 'text-[#1E9A80]' : 'text-[#1A1A1A]'}`}>
                      {d.winner.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs text-[#6B7280] w-6 text-right">B</span>
                  <div className="flex-1 h-5 bg-[#F3F3EE] rounded overflow-hidden relative">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: Math.max(bRate * 3, 2) + '%',
                        backgroundColor: d.winner === 'b' ? '#1E9A80' : '#9CA3AF',
                        opacity: d.winner === 'b' ? 0.9 : 0.4,
                      }}
                    />
                    <span className="absolute right-2 top-0 h-full flex items-center text-[10px] text-[#6B7280]">
                      {bRate.toFixed(1)}% ({d.b_signups}/{d.b_views})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  SOCIAL PROOF TAB
// ═══════════════════════════════════════════════════════════════════════

function SocialProofTab() {
  const [config, setConfig] = useState<SocialProofConfig>({
    enabled: true,
    intervalSeconds: 30,
  });
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchGrowthConfig();
        if (cancelled) return;
        if (remote) {
          const next: SocialProofConfig = {
            enabled: remote.social_proof_enabled,
            intervalSeconds: remote.social_proof_interval_seconds,
          };
          setConfig(next);
          try { localStorage.setItem('nfs_social_proof_config', JSON.stringify(next)); } catch {}
          return;
        }
      } catch (err) {
        console.error('Failed to load social proof config from edge function:', err);
      }
      try {
        const raw = localStorage.getItem('nfs_social_proof_config');
        if (raw && !cancelled) setConfig(JSON.parse(raw));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  async function saveConfig(updated: SocialProofConfig) {
    setConfig(updated);
    try { localStorage.setItem('nfs_social_proof_config', JSON.stringify(updated)); } catch {}
    try {
      await postGrowthConfig({
        social_proof_enabled: updated.enabled,
        social_proof_interval_seconds: updated.intervalSeconds,
      });
      toast.success('Saved — live for all visitors within 30s.');
    } catch (err) {
      console.error('Failed to save social proof config:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Save failed: ${msg}`);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Social Proof Notifications</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-normal text-[#6B7280]">
                {config.enabled ? 'Active' : 'Paused'}
              </span>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => saveConfig({ ...config, enabled: checked })}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Show notification every</Label>
            <Select
              value={config.intervalSeconds.toString()}
              onValueChange={(val) => saveConfig({ ...config, intervalSeconds: parseInt(val) })}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 seconds</SelectItem>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="120">2 minutes</SelectItem>
                <SelectItem value="180">3 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>How it works</Label>
            <ul className="text-sm text-[#6B7280] space-y-1 list-disc list-inside">
              <li>First 2 notifications show the visitor's own city (detected from IP)</li>
              <li>Next few show nearby cities in the same region</li>
              <li>Then random UK cities</li>
              <li>300 names rotate — never repeats in a session</li>
              <li>Shows on landing page only, bottom-left corner</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewVisible(!previewVisible)}
            >
              {previewVisible ? 'Hide preview' : 'Show preview'}
            </Button>

            {previewVisible && (
              <div className="mt-3 space-y-3">
                {[
                  { name: 'Sarah T.', city: 'Manchester' },
                  { name: 'James R.', city: 'Manchester' },
                  { name: 'Oliver W.', city: 'Salford' },
                ].map((example, i) => (
                  <div key={i} className="p-4 bg-[#F3F3EE] rounded-lg inline-block">
                    <div
                      className="inline-flex items-center gap-2.5 bg-white border border-[#E5E7EB] rounded-xl px-4 py-3"
                      style={{ boxShadow: 'rgba(0,0,0,0.08) 0 4px 24px -2px' }}
                    >
                      <div
                        className="w-2 h-2 rounded-full bg-[#1E9A80] shrink-0"
                        style={{ animation: 'pulse 2s ease-in-out infinite' }}
                      />
                      <div>
                        <div className="text-[13px] text-[#1A1A1A]">
                          <strong>{example.name}</strong> from <strong>{example.city}</strong>
                        </div>
                        <div className="text-xs text-[#6B7280]">just signed up</div>
                      </div>
                    </div>
                    {i < 2 && (
                      <p className="text-[10px] text-[#9CA3AF] mt-1 ml-1">
                        {i === 0 ? '← visitor\'s city' : i === 1 ? '← same city again' : '← nearby city'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
