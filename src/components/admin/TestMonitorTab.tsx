import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  ExternalLink,
  Clipboard,
  Bot,
  PauseCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MOCK_TEST_RESULTS,
  DEFAULT_AI_SYSTEM_PROMPT,
  type TestResult,
} from "./mockTestResults";
import { logActivity } from "@/lib/activityLog";

/* ── helpers ──────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

type StatusFilter = "all" | "failing" | "passing" | "stale";

/* ── component ────────────────────────────────────────── */

const RESULTS_URL =
  "https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/monitoring-results/latest.json";
const BOOKINGSITE_RESULTS_URL =
  "https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/monitoring-results/bookingsite-latest.json";
const DISPATCH_URL =
  "https://api.github.com/repos/hrds100/marketplace10/actions/workflows/monitoring-tests.yml/dispatches";

export default function TestMonitorTab() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [runningNow, setRunningNow] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());
  const [fixModalTest, setFixModalTest] = useState<TestResult | null>(null);
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(() => {
    return localStorage.getItem("testmonitor_system_prompt") || DEFAULT_AI_SYSTEM_PROMPT;
  });
  const [promptSaved, setPromptSaved] = useState(false);

  // Fetch real results from Supabase Storage on mount (marketplace10 + bookingsite)
  useEffect(() => {
    type RawResult = { id: string; name: string; suite: string; route: string; status: string; duration: number; error?: string; expected?: string; actual?: string; timestamp: string };
    const mapResults = (data: { results?: RawResult[]; timestamp?: string }): { mapped: TestResult[]; ts: string | null } => {
      const mapped: TestResult[] = (data?.results || []).map((r) => ({
        id: r.id,
        name: r.name,
        suite: r.suite,
        route: r.route,
        status: r.status === "passed" ? "passing" : r.status === "failed" ? "failing" : "stale",
        duration: r.duration,
        errorMessage: r.error,
        expected: r.expected,
        actual: r.actual,
        timestamp: r.timestamp,
      }));
      return { mapped, ts: data?.timestamp || null };
    };

    const fetchOne = (url: string) =>
      fetch(url)
        .then((res) => { if (!res.ok) throw new Error("not found"); return res.json(); })
        .then(mapResults)
        .catch(() => ({ mapped: [] as TestResult[], ts: null as string | null }));

    logActivity("info", "Test Monitor", "Fetching results from Supabase storage\u2026");
    Promise.all([fetchOne(RESULTS_URL), fetchOne(BOOKINGSITE_RESULTS_URL)]).then(
      ([mkt, bks]) => {
        const combined = [...mkt.mapped, ...bks.mapped];
        if (combined.length) setTests(combined);
        const latestTs = [mkt.ts, bks.ts].filter(Boolean).sort().pop() || null;
        if (latestTs) setLastUpdated(latestTs);

        // Log summary to activity terminal
        const passingCount = combined.filter((t) => t.status === "passing").length;
        const failingCount = combined.filter((t) => t.status === "failing").length;
        logActivity(
          failingCount > 0 ? "error" : "success",
          "Test Monitor",
          `Loaded ${combined.length.toLocaleString()} test results (${passingCount.toLocaleString()} passing, ${failingCount} failing)`
        );
        // Log each failure
        for (const t of combined.filter((t) => t.status === "failing")) {
          logActivity("error", "Test Monitor", `${t.id} FAILING — ${t.errorMessage || t.actual || "unknown error"}`);
        }
      }
    );
  }, []);

  const triggerWorkflow = useCallback(async () => {
    setRunningNow(true);
    try {
      await fetch(DISPATCH_URL, {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      });
    } catch {
      // silent — user will see results on next poll
    } finally {
      setTimeout(() => setRunningNow(false), 3000);
    }
  }, []);

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const s = params.get("status");
    if (q) setQuery(q);
    if (s && ["all", "failing", "passing", "stale"].includes(s)) {
      setStatusFilter(s as StatusFilter);
    }
  }, []);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (statusFilter !== "all") params.set("status", statusFilter);
    const search = params.toString();
    const newUrl = search
      ? `${window.location.pathname}?${search}`
      : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [query, statusFilter]);

  const handleSnooze = useCallback((id: string) => {
    setSnoozedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSuite = useCallback((suite: string) => {
    setExpandedSuites((prev) => {
      const next = new Set(prev);
      if (next.has(suite)) next.delete(suite);
      else next.add(suite);
      return next;
    });
  }, []);

  const savePrompt = useCallback(() => {
    localStorage.setItem("testmonitor_system_prompt", systemPrompt);
    setPromptSaved(true);
    setTimeout(() => setPromptSaved(false), 2000);
  }, [systemPrompt]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = tests.filter((t) => !snoozedIds.has(t.id));

    if (statusFilter !== "all") {
      list = list.filter((t) => t.status === statusFilter);
    }

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.route.toLowerCase().includes(q) ||
          (t.errorMessage && t.errorMessage.toLowerCase().includes(q))
      );
    }

    return list;
  }, [tests, query, statusFilter, snoozedIds]);

  const failing = filtered.filter((t) => t.status === "failing");
  const stale = filtered.filter((t) => t.status === "stale");
  const passing = filtered.filter((t) => t.status === "passing");

  const totalFailing = tests.filter((t) => t.status === "failing").length;
  const totalPassing = tests.filter((t) => t.status === "passing").length;

  // Group passing tests by suite
  const passingSuites = useMemo(() => {
    const map = new Map<string, TestResult[]>();
    for (const t of passing) {
      const arr = map.get(t.suite) || [];
      arr.push(t);
      map.set(t.suite, arr);
    }
    return map;
  }, [passing]);

  // Group all tests by suite for summary counts
  const suiteTotals = useMemo(() => {
    const map = new Map<string, { total: number; passing: number }>();
    for (const t of tests) {
      const entry = map.get(t.suite) || { total: 0, passing: 0 };
      entry.total++;
      if (t.status === "passing") entry.passing++;
      map.set(t.suite, entry);
    }
    return map;
  }, [tests]);

  const hasFailing = totalFailing > 0;

  return (
    <div className="space-y-6">
      {/* ── Sticky Summary Bar ────────────────────── */}
      <div
        className={`sticky top-0 z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border ${
          hasFailing
            ? "bg-red-50 border-red-200"
            : "bg-emerald-50 border-emerald-200"
        }`}
      >
        <div className="flex items-center gap-4 flex-wrap">
          {totalFailing > 0 && (
            <span className="text-sm font-semibold text-red-700">
              {totalFailing} failing
            </span>
          )}
          <span className="text-sm font-semibold text-emerald-700">
            {totalPassing.toLocaleString()} passing
          </span>
          <span className="text-xs text-muted-foreground">
            Last run: {relativeTime(lastUpdated || tests[0]?.timestamp || new Date().toISOString())}
            {lastUpdated && (
              <span className="ml-1 text-[10px]">
                ({new Date(lastUpdated).toLocaleString()})
              </span>
            )}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={runningNow}
          onClick={triggerWorkflow}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${runningNow ? "animate-spin" : ""}`} />
          {runningNow ? "Triggered..." : "Run Now"}
        </Button>
      </div>

      {/* ── Search & Filter ───────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by test ID, name, route, or error..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "failing", "passing", "stale"] as StatusFilter[]).map(
            (s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? "default" : "outline"}
                onClick={() => setStatusFilter(s)}
                className="capitalize"
              >
                {s}
              </Button>
            )
          )}
        </div>
      </div>

      {/* ── Failing Tests (pinned to top, expanded) ─ */}
      {failing.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3">
            Failing Tests
          </h3>
          <div className="space-y-3">
            {failing.map((t) => (
              <FailingTestRow
                key={t.id}
                test={t}
                onSnooze={handleSnooze}
                onFixPrompt={setFixModalTest}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Stale Tests ───────────────────────────── */}
      {stale.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3">
            Stale Tests
          </h3>
          <div className="space-y-3">
            {stale.map((t) => (
              <StaleTestRow key={t.id} test={t} />
            ))}
          </div>
        </div>
      )}

      {/* ── Passing Tests (collapsed by suite) ────── */}
      {passing.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3">
            Passing Tests
          </h3>
          <div className="space-y-2">
            {Array.from(passingSuites.entries()).map(([suite, suiteTests]) => {
              const totals = suiteTotals.get(suite);
              const expanded = expandedSuites.has(suite);
              return (
                <div
                  key={suite}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleSuite(suite)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-semibold text-foreground">
                        {suite}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {suiteTests.length}/{totals?.total ?? suiteTests.length}{" "}
                        passing
                      </span>
                    </div>
                    {expanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  {expanded && (
                    <div className="border-t border-border">
                      {suiteTests.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-3 px-4 py-2.5 text-[12px] border-b border-border last:border-b-0"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 font-mono shrink-0"
                          >
                            {t.id}
                          </Badge>
                          <span className="text-foreground font-medium truncate">
                            {t.name}
                          </span>
                          <span className="text-muted-foreground ml-auto shrink-0">
                            {t.duration ? `${t.duration}ms` : ""} ·{" "}
                            {relativeTime(t.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Empty State ───────────────────────────── */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No tests match your search.
        </div>
      )}

      {/* ── AI Prompt Settings (collapsible) ──────── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPromptSettings(!showPromptSettings)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              AI Prompt Settings
            </span>
          </div>
          {showPromptSettings ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        {showPromptSettings && (
          <div className="border-t border-border p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              This system prompt is sent to the AI when generating fix
              suggestions. Edit it to change how the AI responds.
            </p>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={savePrompt}>
                Save Prompt
              </Button>
              {promptSaved && (
                <span className="text-xs text-emerald-600 font-medium">
                  Saved
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── AI Fix Prompt Modal ───────────────────── */}
      <FixPromptModal
        test={fixModalTest}
        systemPrompt={systemPrompt}
        onClose={() => setFixModalTest(null)}
      />
    </div>
  );
}

/* ── Failing Test Row ──────────────────────────────────── */

function FailingTestRow({
  test,
  onSnooze,
  onFixPrompt,
}: {
  test: TestResult;
  onSnooze: (id: string) => void;
  onFixPrompt: (t: TestResult) => void;
}) {
  return (
    <div className="bg-card rounded-xl border border-red-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 font-mono bg-red-100 text-red-700 border-red-200"
          >
            {test.id}
          </Badge>
          <span className="text-sm font-semibold text-foreground">
            {test.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:ml-auto shrink-0">
          <span className="text-[10px] text-muted-foreground">
            {relativeTime(test.timestamp)}
          </span>
          {test.consecutiveFailures && test.consecutiveFailures > 1 && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-red-50 text-red-600 border-red-200"
            >
              {test.consecutiveFailures}x
            </Badge>
          )}
        </div>
      </div>

      {/* Route */}
      <div className="text-xs text-muted-foreground">
        Route:{" "}
        <a
          href={test.route}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {test.route}
        </a>
      </div>

      {/* Expected vs Actual */}
      {test.expected && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">
            <span className="font-semibold text-emerald-700 block mb-0.5">
              Expected
            </span>
            <span className="text-emerald-800">{test.expected}</span>
          </div>
          <div className="bg-red-50 rounded-lg p-2.5 border border-red-100">
            <span className="font-semibold text-red-700 block mb-0.5">
              Actual
            </span>
            <span className="text-red-800">{test.actual}</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {test.errorMessage && (
        <div className="bg-secondary/50 rounded-lg p-2.5 text-[11px] font-mono text-muted-foreground break-all">
          {test.errorMessage}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() =>
            copyToClipboard(
              `[${test.id}] ${test.name}\nError: ${test.errorMessage || test.actual || "Unknown"}`
            )
          }
        >
          <Clipboard className="w-3 h-3" />
          Copy Error
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => window.open(test.route, "_blank")}
        >
          <ExternalLink className="w-3 h-3" />
          Open Route
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => onFixPrompt(test)}
        >
          <Bot className="w-3 h-3" />
          Generate Fix Prompt
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => onSnooze(test.id)}
        >
          <PauseCircle className="w-3 h-3" />
          Snooze 24h
        </Button>
      </div>
    </div>
  );
}

/* ── Stale Test Row ────────────────────────────────────── */

function StaleTestRow({ test }: { test: TestResult }) {
  return (
    <div className="bg-card rounded-xl border border-amber-200 p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0 font-mono bg-amber-50 text-amber-700 border-amber-200"
        >
          {test.id}
        </Badge>
        <span className="text-sm font-medium text-foreground">{test.name}</span>
        <span className="text-xs text-amber-600 ml-auto">
          Not run for {relativeTime(test.timestamp)}
        </span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        Route:{" "}
        <a
          href={test.route}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {test.route}
        </a>
      </div>
    </div>
  );
}

/* ── Fix Prompt Modal ──────────────────────────────────── */

function FixPromptModal({
  test,
  systemPrompt,
  onClose,
}: {
  test: TestResult | null;
  systemPrompt: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  useEffect(() => {
    if (!test) {
      setResponse(null);
      return;
    }
    // Mock AI response — will be replaced with Supabase Edge Function call
    setLoading(true);
    const timer = setTimeout(() => {
      setResponse(generateMockFixPrompt(test, systemPrompt));
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [test, systemPrompt]);

  const fullPrompt = response || "";

  const handleCopyAndOpenClaude = () => {
    copyToClipboard(fullPrompt);
    window.open("https://claude.ai", "_blank");
  };

  return (
    <Dialog open={!!test} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bot className="w-4 h-4" />
            AI Fix Prompt — {test?.id}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Generating fix prompt...
            </span>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 min-h-0">
              <pre className="text-xs font-mono whitespace-pre-wrap p-4 bg-secondary/50 rounded-lg leading-relaxed">
                {fullPrompt}
              </pre>
            </ScrollArea>
            <div className="flex gap-2 pt-3 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => copyToClipboard(fullPrompt)}
              >
                <Clipboard className="w-3.5 h-3.5" />
                Copy Prompt
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleCopyAndOpenClaude}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Copy + Open Claude
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={onClose}
              >
                <X className="w-3.5 h-3.5" />
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Mock AI response generator ────────────────────────── */

function generateMockFixPrompt(test: TestResult, _systemPrompt: string): string {
  return `## Fix: ${test.id} — ${test.name}

### Error
\`\`\`
${test.errorMessage || test.actual || "Unknown error"}
\`\`\`

### Root Cause
${
  test.id === "MKT-017"
    ? "The RLS policy on the `properties` table does not allow INSERT for the `authenticated` role. The policy was likely dropped during a recent migration."
    : test.id === "INV-031"
      ? "The buy-shares flow calls `marketplace.buyShares()` without first calling `usdc.approve()` for the required amount. The approval step was skipped after a recent refactor."
      : "The Stripe secret key in the environment variables has expired. The key `sk_test_****EXPIRED` needs to be rotated in the Supabase Edge Function secrets."
}

### Fix

${
  test.id === "MKT-017"
    ? `**File:** \`supabase/migrations/XXXXXX_fix_properties_insert_policy.sql\`

\`\`\`sql
CREATE POLICY "authenticated_insert_properties"
ON properties
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = submitted_by);
\`\`\`

Run: \`supabase db push\``
    : test.id === "INV-031"
      ? `**File:** \`src/hooks/useBlockchain.ts\`

Before:
\`\`\`ts
await marketplace.buyShares(propertyId, amount);
\`\`\`

After:
\`\`\`ts
const tx = await usdc.approve(MARKETPLACE_ADDRESS, amount);
await tx.wait();
await marketplace.buyShares(propertyId, amount);
\`\`\`

This ensures the marketplace contract has allowance to transfer USDC on behalf of the user.`
      : `**Action:** Rotate the Stripe API key.

1. Go to Stripe Dashboard > Developers > API Keys
2. Roll the secret key
3. Update in Supabase: \`supabase secrets set STRIPE_SECRET_KEY=sk_test_NEW_KEY\`
4. Redeploy the edge function: \`supabase functions deploy create-payment-intent\``
}

### Verification
Re-run test \`${test.id}\` after applying the fix:
\`\`\`
npx playwright test --grep "${test.id}"
\`\`\``;
}
