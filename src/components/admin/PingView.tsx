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
  Map as MapIcon,
  List as ListIcon,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

/* ── constants ──────────────────────────────────────── */

const RESULTS_URL =
  "https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/monitoring-results/latest.json";
const BOOKINGSITE_RESULTS_URL =
  "https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/monitoring-results/bookingsite-latest.json";
const DISPATCH_URL =
  "https://api.github.com/repos/hrds100/marketplace10/actions/workflows/monitoring-tests.yml/dispatches";
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/* ── helpers ─────────────────────────────────────────── */

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

/** Auto-assign an icon based on cluster/suite name keywords */
function clusterIcon(suite: string): string {
  const s = suite.toLowerCase();
  if (s.includes("invest")) return "\u26d3\ufe0f";
  if (s.includes("booking") || s.includes("book")) return "\ud83c\udfe8";
  if (s.includes("market") || s.includes("core")) return "\ud83c\udfe0";
  if (s.includes("auth") || s.includes("login")) return "\ud83d\udd10";
  if (s.includes("admin")) return "\ud83d\udee0\ufe0f";
  if (s.includes("crm")) return "\ud83d\udcca";
  if (s.includes("pay") || s.includes("stripe")) return "\ud83d\udcb3";
  return "\ud83d\udce6";
}

type StatusFilter = "all" | "failing" | "passing" | "not-run";
type ViewMode = "map" | "list";

interface ClusterData {
  name: string;
  icon: string;
  tests: TestResult[];
  passing: number;
  failing: number;
  stale: number;
  status: "green" | "yellow" | "red";
  pages: Map<string, TestResult[]>;
}

/* ── main component ──────────────────────────────────── */

export default function PingView() {
  const [tests, setTests] = useState<TestResult[]>(MOCK_TEST_RESULTS);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [runningNow, setRunningNow] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    typeof window !== "undefined" && window.innerWidth < 1024 ? "list" : "map"
  );
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [fixModalTest, setFixModalTest] = useState<TestResult | null>(null);
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());
  const [pingingIds, setPingingIds] = useState<Set<string>>(new Set());
  const [allPassing, setAllPassing] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const systemPrompt = useMemo(() => {
    return localStorage.getItem("testmonitor_system_prompt") || DEFAULT_AI_SYSTEM_PROMPT;
  }, []);

  // Fetch results (marketplace10 + bookingsite)
  const fetchResults = useCallback(() => {
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

    Promise.all([fetchOne(RESULTS_URL), fetchOne(BOOKINGSITE_RESULTS_URL)]).then(
      ([mkt, bks]) => {
        const combined = [...mkt.mapped, ...bks.mapped];
        if (combined.length) setTests(combined);
        const latestTs = [mkt.ts, bks.ts].filter(Boolean).sort().pop() || null;
        if (latestTs) setLastUpdated(latestTs);
      }
    );
  }, []);

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchResults]);

  // URL sync for search
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setQuery(q);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (query) params.set("q", query);
    else params.delete("q");
    const search = params.toString();
    const newUrl = search
      ? `${window.location.pathname}?${search}`
      : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [query]);

  // Trigger workflow
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
      // silent
    } finally {
      setTimeout(() => setRunningNow(false), 3000);
    }
  }, []);

  // Simulate ping animation on a node
  const simulatePing = useCallback(
    (ids: string[]) => {
      setPingingIds(new Set(ids));
      setTimeout(() => {
        setPingingIds(new Set());
        const allPass = tests.every((t) => t.status === "passing");
        if (allPass) {
          setAllPassing(true);
          setTimeout(() => setAllPassing(false), 2000);
        }
      }, 2000);
      triggerWorkflow();
    },
    [tests, triggerWorkflow]
  );

  const handleSnooze = useCallback((id: string) => {
    setSnoozedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Build clusters from data
  const clusters = useMemo(() => {
    const map = new Map<string, ClusterData>();
    for (const t of tests) {
      if (snoozedIds.has(t.id)) continue;
      if (!map.has(t.suite)) {
        map.set(t.suite, {
          name: t.suite,
          icon: clusterIcon(t.suite),
          tests: [],
          passing: 0,
          failing: 0,
          stale: 0,
          status: "green",
          pages: new Map(),
        });
      }
      const cluster = map.get(t.suite)!;
      cluster.tests.push(t);
      if (t.status === "passing") cluster.passing++;
      else if (t.status === "failing") cluster.failing++;
      else cluster.stale++;

      // Group by route/page
      const page = t.route || "/unknown";
      if (!cluster.pages.has(page)) cluster.pages.set(page, []);
      cluster.pages.get(page)!.push(t);
    }
    // Set status
    for (const c of map.values()) {
      if (c.failing > 0) c.status = "red";
      else if (c.stale > 0) c.status = "yellow";
      else c.status = "green";
    }
    return Array.from(map.values());
  }, [tests, snoozedIds]);

  // Filtered tests for list view
  const filteredTests = useMemo(() => {
    let list = tests.filter((t) => !snoozedIds.has(t.id));

    if (statusFilter === "failing") list = list.filter((t) => t.status === "failing");
    else if (statusFilter === "passing") list = list.filter((t) => t.status === "passing");
    else if (statusFilter === "not-run") list = list.filter((t) => t.status === "stale");

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.suite.toLowerCase().includes(q) ||
          t.route.toLowerCase().includes(q) ||
          (t.errorMessage && t.errorMessage.toLowerCase().includes(q))
      );
    }

    // Failing always first
    list.sort((a, b) => {
      if (a.status === "failing" && b.status !== "failing") return -1;
      if (a.status !== "failing" && b.status === "failing") return 1;
      if (a.status === "stale" && b.status === "passing") return -1;
      if (a.status === "passing" && b.status === "stale") return 1;
      return 0;
    });

    return list;
  }, [tests, query, statusFilter, snoozedIds]);

  // Search-matched IDs for map highlighting
  const matchedIds = useMemo(() => {
    if (!query) return null;
    const q = query.toLowerCase();
    return new Set(
      tests
        .filter(
          (t) =>
            t.id.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q) ||
            t.suite.toLowerCase().includes(q) ||
            t.route.toLowerCase().includes(q)
        )
        .map((t) => t.id)
    );
  }, [tests, query]);

  // Auto-expand cluster containing search match
  useEffect(() => {
    if (matchedIds && matchedIds.size > 0 && viewMode === "map") {
      const firstMatch = tests.find((t) => matchedIds.has(t.id));
      if (firstMatch) {
        setExpandedCluster(firstMatch.suite);
      }
    }
  }, [matchedIds, tests, viewMode]);

  const totalFailing = tests.filter((t) => t.status === "failing").length;
  const totalPassing = tests.filter((t) => t.status === "passing").length;
  const hasFailing = totalFailing > 0;
  const lastPingTime = lastUpdated || tests[0]?.timestamp || new Date().toISOString();

  return (
    <div className="relative min-h-[600px]">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* All-pass flash */}
      <AnimatePresence>
        {allPassing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/10 backdrop-blur-sm pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-emerald-400 font-mono">
                ALL SYSTEMS OPERATIONAL
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative space-y-6">
        {/* ── Sticky Summary Bar ──────────────────── */}
        <div
          className={`sticky top-0 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border backdrop-blur-xl ${
            hasFailing
              ? "bg-red-950/60 border-red-500/30"
              : "bg-emerald-950/60 border-emerald-500/30"
          }`}
        >
          <div className="flex items-center gap-4 flex-wrap">
            {/* LIVE indicator */}
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    hasFailing ? "bg-red-400" : "bg-emerald-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    hasFailing ? "bg-red-500" : "bg-emerald-500"
                  }`}
                />
              </span>
              <span className="text-xs font-bold text-white font-mono tracking-wider">
                LIVE
              </span>
            </span>

            <span className="text-sm font-mono text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
              {totalPassing} PASSING
            </span>

            {totalFailing > 0 && (
              <span className="text-sm font-mono text-red-300">
                <XCircle className="w-3.5 h-3.5 inline mr-1" />
                {totalFailing} FAILING
              </span>
            )}

            <span className="text-xs text-white/50 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last ping: {relativeTime(lastPingTime)}
            </span>
          </div>

          <Button
            size="sm"
            className="gap-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 font-mono text-xs"
            disabled={runningNow}
            onClick={() =>
              simulatePing(tests.map((t) => t.id))
            }
          >
            <Zap className={`w-3.5 h-3.5 ${runningNow ? "animate-pulse" : ""}`} />
            {runningNow ? "PINGING..." : "PING EVERYTHING"}
          </Button>
        </div>

        {/* ── View Toggle + Search ────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* View toggle - hidden on mobile (list only) */}
          <div className="hidden lg:flex gap-1 bg-gray-900/50 rounded-lg p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "map"
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Map View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              List View
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              placeholder="Search tests by ID, name, suite, route..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-black/40 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-emerald-500/50"
            />
          </div>

          {/* Status filters (list view) */}
          {(viewMode === "list" || typeof window !== "undefined" && window.innerWidth < 1024) && (
            <div className="flex gap-1.5">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "failing", label: "Failing" },
                  { key: "passing", label: "Passing" },
                  { key: "not-run", label: "Not Run" },
                ] as const
              ).map((s) => (
                <Button
                  key={s.key}
                  size="sm"
                  variant="outline"
                  onClick={() => setStatusFilter(s.key)}
                  className={`text-xs ${
                    statusFilter === s.key
                      ? "bg-white/10 text-white border-white/20"
                      : "bg-transparent text-white/40 border-white/10 hover:text-white/60"
                  }`}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* ── Map View (desktop only) ─────────────── */}
        {viewMode === "map" && (
          <div className="hidden lg:block">
            <MapView
              clusters={clusters}
              expandedCluster={expandedCluster}
              expandedPage={expandedPage}
              matchedIds={matchedIds}
              pingingIds={pingingIds}
              onExpandCluster={(name) =>
                setExpandedCluster(expandedCluster === name ? null : name)
              }
              onExpandPage={(key) =>
                setExpandedPage(expandedPage === key ? null : key)
              }
              onPingCluster={(clusterTests) =>
                simulatePing(clusterTests.map((t) => t.id))
              }
              onPingTest={(id) => simulatePing([id])}
              onFixPrompt={setFixModalTest}
            />
          </div>
        )}

        {/* ── List View ───────────────────────────── */}
        {(viewMode === "list" || (typeof window !== "undefined" && window.innerWidth < 1024)) && (
          <div className={viewMode === "map" ? "lg:hidden" : ""}>
            <ListView
              tests={filteredTests}
              expandedRow={expandedRow}
              pingingIds={pingingIds}
              onExpandRow={(id) =>
                setExpandedRow(expandedRow === id ? null : id)
              }
              onPingTest={(id) => simulatePing([id])}
              onFixPrompt={setFixModalTest}
              onSnooze={handleSnooze}
            />
          </div>
        )}
      </div>

      {/* ── Fix Prompt Modal ───────────────────── */}
      <FixPromptModal
        test={fixModalTest}
        systemPrompt={systemPrompt}
        onClose={() => setFixModalTest(null)}
      />
    </div>
  );
}

/* ── MAP VIEW ─────────────────────────────────────────── */

function MapView({
  clusters,
  expandedCluster,
  expandedPage,
  matchedIds,
  pingingIds,
  onExpandCluster,
  onExpandPage,
  onPingCluster,
  onPingTest,
  onFixPrompt,
}: {
  clusters: ClusterData[];
  expandedCluster: string | null;
  expandedPage: string | null;
  matchedIds: Set<string> | null;
  pingingIds: Set<string>;
  onExpandCluster: (name: string) => void;
  onExpandPage: (key: string) => void;
  onPingCluster: (tests: TestResult[]) => void;
  onPingTest: (id: string) => void;
  onFixPrompt: (t: TestResult) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Cluster grid */}
      <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {clusters.map((cluster) => {
          const isExpanded = expandedCluster === cluster.name;
          const isDimmed =
            matchedIds !== null &&
            !cluster.tests.some((t) => matchedIds.has(t.id));
          const isPinging = cluster.tests.some((t) => pingingIds.has(t.id));

          return (
            <div key={cluster.name} className={`${isExpanded ? "col-span-full" : ""}`}>
              {/* Cluster card */}
              <button
                type="button"
                onClick={() => onExpandCluster(cluster.name)}
                className={`
                  w-full text-left relative overflow-hidden rounded-xl p-5
                  bg-black/40 backdrop-blur-xl border transition-all duration-300
                  ${isDimmed ? "opacity-30" : ""}
                  ${
                    cluster.status === "red"
                      ? "border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                      : cluster.status === "yellow"
                        ? "border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                        : "border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                  }
                  ${isPinging ? "animate-pulse border-yellow-400/50" : ""}
                  hover:border-white/20 hover:bg-black/50
                `}
              >
                {/* Sonar ring on ping */}
                {isPinging && (
                  <span className="absolute inset-0 rounded-xl border-2 border-yellow-400/40 animate-[sonar_1.5s_ease-out_infinite]" />
                )}

                {/* Status glow bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-0.5 ${
                    cluster.status === "red"
                      ? "bg-red-500"
                      : cluster.status === "yellow"
                        ? "bg-yellow-500"
                        : "bg-emerald-500"
                  }`}
                />

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cluster.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-white">
                        {cluster.name}
                      </div>
                      <div className="text-xs text-white/40 font-mono mt-0.5">
                        {cluster.tests.length} tests
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-emerald-400">
                      {cluster.passing}
                    </span>
                    <span className="text-white/20">/</span>
                    {cluster.failing > 0 && (
                      <span className="text-xs font-mono text-red-400">
                        {cluster.failing}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-white/30" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-white/30" />
                    )}
                  </div>
                </div>

                {/* Mini status bar */}
                <div className="mt-3 flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-white/5">
                  {cluster.passing > 0 && (
                    <div
                      className="bg-emerald-500 rounded-full"
                      style={{
                        width: `${(cluster.passing / cluster.tests.length) * 100}%`,
                      }}
                    />
                  )}
                  {cluster.failing > 0 && (
                    <div
                      className="bg-red-500 rounded-full"
                      style={{
                        width: `${(cluster.failing / cluster.tests.length) * 100}%`,
                      }}
                    />
                  )}
                  {cluster.stale > 0 && (
                    <div
                      className="bg-yellow-500 rounded-full"
                      style={{
                        width: `${(cluster.stale / cluster.tests.length) * 100}%`,
                      }}
                    />
                  )}
                </div>
              </button>

              {/* Expanded: pages inside cluster */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-2 pl-4 border-l-2 border-white/10 ml-6">
                      {/* Ping section button */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/40 font-mono uppercase tracking-wider">
                          Pages / Routes
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-[10px] h-6 bg-transparent text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPingCluster(cluster.tests);
                          }}
                        >
                          <Zap className="w-3 h-3" />
                          Ping Section
                        </Button>
                      </div>

                      {Array.from(cluster.pages.entries()).map(
                        ([pageName, pageTests]) => {
                          const pageKey = `${cluster.name}::${pageName}`;
                          const isPageExpanded = expandedPage === pageKey;
                          const pageFailing = pageTests.filter(
                            (t) => t.status === "failing"
                          ).length;
                          const pagePassing = pageTests.filter(
                            (t) => t.status === "passing"
                          ).length;

                          return (
                            <div key={pageKey}>
                              <button
                                type="button"
                                onClick={() => onExpandPage(pageKey)}
                                className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-white/5 hover:border-white/10 transition-colors"
                              >
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    pageFailing > 0
                                      ? "bg-red-500"
                                      : "bg-emerald-500"
                                  }`}
                                />
                                <span className="text-xs text-white/70 font-mono flex-1 truncate">
                                  {pageName}
                                </span>
                                <span className="text-[10px] font-mono text-white/30">
                                  {pagePassing}/{pageTests.length}
                                </span>
                                {isPageExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-white/20" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-white/20" />
                                )}
                              </button>

                              {/* Test points */}
                              <AnimatePresence>
                                {isPageExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{
                                      height: "auto",
                                      opacity: 1,
                                    }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{
                                      duration: 0.2,
                                      ease: "easeInOut",
                                    }}
                                    className="overflow-hidden"
                                  >
                                    <div className="ml-5 mt-1 space-y-1">
                                      {pageTests.map((t) => (
                                        <TestPointRow
                                          key={t.id}
                                          test={t}
                                          isPinging={pingingIds.has(t.id)}
                                          isHighlighted={
                                            matchedIds !== null &&
                                            matchedIds.has(t.id)
                                          }
                                          onPing={() => onPingTest(t.id)}
                                          onFixPrompt={() => onFixPrompt(t)}
                                        />
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Test Point Row (Map View) ───────────────────────── */

function TestPointRow({
  test,
  isPinging,
  isHighlighted,
  onPing,
  onFixPrompt,
}: {
  test: TestResult;
  isPinging: boolean;
  isHighlighted: boolean;
  onPing: () => void;
  onFixPrompt: () => void;
}) {
  const isFailing = test.status === "failing";

  return (
    <div
      className={`
        flex items-center gap-2 p-2 rounded-md text-xs transition-all
        ${isPinging ? "bg-yellow-500/10 border border-yellow-500/20" : ""}
        ${isFailing ? "bg-red-500/5 border border-red-500/10" : "bg-white/[0.02]"}
        ${isHighlighted ? "ring-1 ring-emerald-500/40" : ""}
      `}
    >
      {/* Status icon */}
      {isFailing ? (
        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
      ) : test.status === "stale" ? (
        <Clock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
      ) : (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      )}

      {/* ID badge */}
      <Badge
        variant="secondary"
        className="text-[9px] px-1 py-0 font-mono bg-white/5 text-white/50 border-white/10 shrink-0"
      >
        {test.id}
      </Badge>

      {/* Name */}
      <span className="text-white/60 truncate flex-1">{test.name}</span>

      {/* Duration */}
      {test.duration && (
        <span className="text-[10px] font-mono text-white/25 shrink-0">
          {test.duration}ms
        </span>
      )}

      {/* Actions */}
      <div className="flex gap-1 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPing();
          }}
          className="p-1 rounded hover:bg-yellow-500/10 text-yellow-400/60 hover:text-yellow-400 transition-colors"
          title="Ping this test"
        >
          <Zap className="w-3 h-3" />
        </button>
        {isFailing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFixPrompt();
            }}
            className="p-1 rounded hover:bg-blue-500/10 text-blue-400/60 hover:text-blue-400 transition-colors"
            title="Generate fix prompt"
          >
            <Bot className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── LIST VIEW ────────────────────────────────────────── */

function ListView({
  tests,
  expandedRow,
  pingingIds,
  onExpandRow,
  onPingTest,
  onFixPrompt,
  onSnooze,
}: {
  tests: TestResult[];
  expandedRow: string | null;
  pingingIds: Set<string>;
  onExpandRow: (id: string) => void;
  onPingTest: (id: string) => void;
  onFixPrompt: (t: TestResult) => void;
  onSnooze: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="hidden sm:grid grid-cols-[40px_80px_120px_1fr_80px_90px_80px] gap-3 px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-white/30">
        <span />
        <span>ID</span>
        <span>Suite</span>
        <span>Test Name</span>
        <span>Status</span>
        <span>Last Run</span>
        <span>Time</span>
      </div>

      {tests.map((t) => {
        const isExpanded = expandedRow === t.id;
        const isPinging = pingingIds.has(t.id);
        const isFailing = t.status === "failing";
        const isStale = t.status === "stale";

        return (
          <div key={t.id}>
            <button
              type="button"
              onClick={() => onExpandRow(t.id)}
              className={`
                w-full text-left grid grid-cols-[40px_1fr] sm:grid-cols-[40px_80px_120px_1fr_80px_90px_80px] gap-3 px-4 py-3
                rounded-lg border transition-all
                ${isPinging ? "bg-yellow-500/5 border-yellow-500/20" : ""}
                ${isFailing ? "bg-red-500/5 border-red-500/10 hover:border-red-500/20" : ""}
                ${isStale ? "bg-yellow-500/5 border-yellow-500/10" : ""}
                ${!isFailing && !isStale && !isPinging ? "bg-black/20 border-white/5 hover:border-white/10" : ""}
              `}
            >
              {/* Status dot */}
              <span className="flex items-center justify-center">
                {isFailing ? (
                  <XCircle className="w-4 h-4 text-red-400" />
                ) : isStale ? (
                  <Clock className="w-4 h-4 text-yellow-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </span>

              {/* Mobile: combined info */}
              <div className="sm:hidden">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1 py-0 font-mono bg-white/5 text-white/50 border-white/10"
                  >
                    {t.id}
                  </Badge>
                  <span className="text-xs text-white/70 truncate">
                    {t.name}
                  </span>
                </div>
                <div className="text-[10px] text-white/30 mt-1">
                  {t.suite} &middot; {t.route} &middot;{" "}
                  {t.duration ? `${t.duration}ms` : "-"}
                </div>
              </div>

              {/* Desktop columns */}
              <span className="hidden sm:flex items-center">
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1 py-0 font-mono bg-white/5 text-white/50 border-white/10"
                >
                  {t.id}
                </Badge>
              </span>
              <span className="hidden sm:flex items-center text-xs text-white/40 truncate">
                {t.suite}
              </span>
              <span className="hidden sm:flex items-center text-xs text-white/60 truncate">
                {t.name}
              </span>
              <span className="hidden sm:flex items-center">
                <span
                  className={`text-[10px] font-mono font-bold ${
                    isFailing
                      ? "text-red-400"
                      : isStale
                        ? "text-yellow-400"
                        : "text-emerald-400"
                  }`}
                >
                  {t.status === "passing"
                    ? "PASS"
                    : t.status === "failing"
                      ? "FAIL"
                      : "STALE"}
                </span>
              </span>
              <span className="hidden sm:flex items-center text-[10px] text-white/30 font-mono">
                {relativeTime(t.timestamp)}
              </span>
              <span className="hidden sm:flex items-center text-[10px] text-white/30 font-mono">
                {t.duration ? `${t.duration}ms` : "-"}
              </span>
            </button>

            {/* Expanded row */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-10 mr-4 mb-2 p-4 rounded-lg bg-black/30 border border-white/5 space-y-3">
                    {/* Route */}
                    <div className="text-xs text-white/40">
                      Route:{" "}
                      <span className="text-white/60 font-mono">
                        {t.route}
                      </span>
                    </div>

                    {/* Expected vs Actual */}
                    {t.expected && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-emerald-500/5 rounded-lg p-2.5 border border-emerald-500/10">
                          <span className="font-semibold text-emerald-400 block mb-0.5">
                            Expected
                          </span>
                          <span className="text-emerald-300/70">
                            {t.expected}
                          </span>
                        </div>
                        <div className="bg-red-500/5 rounded-lg p-2.5 border border-red-500/10">
                          <span className="font-semibold text-red-400 block mb-0.5">
                            Actual
                          </span>
                          <span className="text-red-300/70">{t.actual}</span>
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {t.errorMessage && (
                      <div className="bg-white/[0.02] rounded-lg p-2.5 text-[11px] font-mono text-red-300/60 break-all">
                        {t.errorMessage}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-[10px] h-7 bg-transparent text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/10"
                        onClick={() => onPingTest(t.id)}
                      >
                        <Zap className="w-3 h-3" />
                        Re-ping
                      </Button>
                      {isFailing && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-[10px] h-7 bg-transparent text-blue-300 border-blue-500/30 hover:bg-blue-500/10"
                          onClick={() => onFixPrompt(t)}
                        >
                          <Bot className="w-3 h-3" />
                          Fix Prompt
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-[10px] h-7 bg-transparent text-white/40 border-white/10 hover:bg-white/5"
                        onClick={() => onSnooze(t.id)}
                      >
                        <PauseCircle className="w-3 h-3" />
                        Snooze 24h
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-[10px] h-7 bg-transparent text-white/40 border-white/10 hover:bg-white/5"
                        onClick={() =>
                          copyToClipboard(
                            `[${t.id}] ${t.name}\nError: ${t.errorMessage || t.actual || "Unknown"}`
                          )
                        }
                      >
                        <Clipboard className="w-3 h-3" />
                        Copy Error
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {tests.length === 0 && (
        <div className="text-center py-12 text-sm text-white/30">
          No tests match your search.
        </div>
      )}
    </div>
  );
}

/* ── Fix Prompt Modal ─────────────────────────────────── */

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
    setLoading(true);
    const timer = setTimeout(() => {
      setResponse(generateFixPrompt(test, systemPrompt));
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [test, systemPrompt]);

  const fullPrompt = response || "";

  const handleCopyAndOpenClaude = () => {
    copyToClipboard(fullPrompt);
    window.open("https://claude.ai", "_blank");
  };

  return (
    <Dialog open={!!test} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-gray-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-white">
            <Bot className="w-4 h-4" />
            AI Fix Prompt -- {test?.id}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 animate-spin text-white/40" />
            <span className="ml-2 text-sm text-white/40">
              Generating fix prompt...
            </span>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 min-h-0">
              <pre className="text-xs font-mono whitespace-pre-wrap p-4 bg-black/40 rounded-lg leading-relaxed text-white/70">
                {fullPrompt}
              </pre>
            </ScrollArea>
            <div className="flex gap-2 pt-3 border-t border-white/10">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 bg-transparent text-white/60 border-white/10 hover:bg-white/5"
                onClick={() => copyToClipboard(fullPrompt)}
              >
                <Clipboard className="w-3.5 h-3.5" />
                Copy Prompt
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCopyAndOpenClaude}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Copy + Open Claude
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto bg-transparent text-white/40 border-white/10 hover:bg-white/5"
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

/* ── Fix prompt generator ─────────────────────────────── */

function generateFixPrompt(test: TestResult, _systemPrompt: string): string {
  return `## Fix: ${test.id} -- ${test.name}

### Error
\`\`\`
${test.errorMessage || test.actual || "Unknown error"}
\`\`\`

### Route
${test.route}

### Suite
${test.suite}

### What happened
- Test ID: ${test.id}
- Expected: ${test.expected || "N/A"}
- Actual: ${test.actual || "N/A"}
- Duration: ${test.duration || 0}ms
- Last run: ${test.timestamp}

### Instructions
1. Identify the root cause from the error message above
2. Find the exact file(s) that need changing
3. Provide a minimal code fix with before/after
4. Explain why this fixes the issue in one sentence
5. Note any RLS policy, env var, or migration changes needed

### Verification
Re-run test \`${test.id}\` after applying the fix:
\`\`\`
npx playwright test --grep "${test.id}"
\`\`\``;
}
