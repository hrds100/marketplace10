import { useCallback, useEffect, useRef, useState } from "react";
import {
  Database,
  CreditCard,
  Workflow,
  MessageSquare,
  Coins,
  Bug,
  Activity,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  HealthCheckResult,
  ServiceDef,
  FlowDef,
  FlowStep,
  ExecutionEntry,
} from "@/lib/healthChecks";
import {
  MARKETPLACE_SERVICES,
  MARKETPLACE_FLOWS,
  runAllChecks,
  getLatestExecution,
  getAllExecutionsForFlow,
} from "@/lib/healthChecks";

/* ── icon map ─────────────────────────────────────────── */

const ICON_MAP: Record<string, typeof Database> = {
  Database,
  CreditCard,
  Workflow,
  MessageSquare,
  Coins,
  Bug,
  Activity,
  Globe,
};

/* ── relative time helper ─────────────────────────────── */

function relativeTime(d: Date): string {
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 120) return "1 minute ago";
  return `${Math.floor(diff / 60)} minutes ago`;
}

function relativeTimeShort(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function shortWorkflowName(name: string): string {
  return name
    .replace(/^(NFsTay|marketplace10|nfs-)\s*[–—-]\s*/i, "")
    .replace(/^nfs-/, "");
}

/* ── component ────────────────────────────────────────── */

export default function SystemHealthTab() {
  const [results, setResults] = useState<Map<string, HealthCheckResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const map = await runAllChecks(MARKETPLACE_SERVICES);
    setResults(map);
    setLastRefresh(new Date());
    setSecondsAgo(0);
    setLoading(false);
  }, []);

  /* initial fetch + 30 s auto-refresh */
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  /* tick the "last updated" counter every second */
  useEffect(() => {
    intervalRef.current = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const issueCount = Array.from(results.values()).filter(
    (r) => r.status !== "healthy",
  ).length;

  return (
    <div className="space-y-8">
      {/* ── Status Bar ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {issueCount === 0 && !loading ? (
            <>
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-foreground">
                All systems working
              </span>
            </>
          ) : loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Checking services…</span>
            </>
          ) : (
            <>
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm font-semibold text-red-600">
                {issueCount} {issueCount === 1 ? "issue" : "issues"} detected
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              Updated {secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Section 1: Service Status Grid ──────────── */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-4">Service Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MARKETPLACE_SERVICES.map((svc) => (
            <ServiceCard
              key={svc.key}
              service={svc}
              result={results.get(svc.key)}
              loading={loading && !results.has(svc.key)}
            />
          ))}
        </div>
      </div>

      {/* ── Section 2: Critical Flow Status ─────────── */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-4">Critical Flows</h3>
        <div className="space-y-3">
          {MARKETPLACE_FLOWS.map((flow) => (
            <FlowCard key={flow.name} flow={flow} results={results} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Service Card ─────────────────────────────────────── */

function ServiceCard({
  service,
  result,
  loading,
}: {
  service: ServiceDef;
  result?: HealthCheckResult;
  loading: boolean;
}) {
  const Icon = ICON_MAP[service.icon] ?? Globe;

  const statusDot =
    !result || loading ? (
      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" />
    ) : result.status === "healthy" ? (
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
    ) : result.status === "degraded" ? (
      <span className="w-2 h-2 rounded-full bg-amber-500" />
    ) : (
      <span className="w-2 h-2 rounded-full bg-red-500" />
    );

  const statusLabel =
    !result || loading
      ? "Checking…"
      : result.status === "healthy"
        ? "Connected"
        : result.status === "degraded"
          ? "Slow"
          : "Down";

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{service.name}</span>
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        {statusDot}
        <span className="text-xs font-medium text-foreground">{statusLabel}</span>
      </div>
      {result?.details && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">{result.details}</p>
      )}
      {result?.lastChecked && (
        <p className="text-[10px] text-muted-foreground mt-1">
          Checked {relativeTime(result.lastChecked)}
        </p>
      )}
    </div>
  );
}

/* ── Step status from execution data ──────────────────── */

function getStepStatus(
  step: FlowStep,
  results: Map<string, HealthCheckResult>,
): { dotColor: string; statusText: string; statusTextColor: string } {
  // If step has a workflowName, try execution data first
  if (step.workflowName) {
    const exec = getLatestExecution(step.workflowName);
    if (exec) {
      if (exec.status === "success") {
        const duration = exec.duration != null ? ` (${exec.duration.toFixed(1)}s)` : "";
        return {
          dotColor: "bg-emerald-500",
          statusText: `Last run: ${relativeTimeShort(exec.startedAt)}, succeeded${duration}`,
          statusTextColor: "text-emerald-600",
        };
      }
      if (exec.status === "error" || exec.status === "crashed") {
        return {
          dotColor: "bg-red-500",
          statusText: `Last run: ${relativeTimeShort(exec.startedAt)}, FAILED`,
          statusTextColor: "text-red-600",
        };
      }
      if (exec.status === "running") {
        return {
          dotColor: "bg-amber-500",
          statusText: "Running now\u2026",
          statusTextColor: "text-amber-600",
        };
      }
      if (exec.status === "waiting") {
        return {
          dotColor: "bg-amber-500",
          statusText: "Waiting\u2026",
          statusTextColor: "text-amber-600",
        };
      }
    }
  }

  // Fallback: derive from service status
  const svcResult = results.get(step.dependsOn);
  if (!svcResult) return { dotColor: "bg-muted-foreground/40", statusText: "Checking\u2026", statusTextColor: "text-muted-foreground" };
  if (svcResult.status === "healthy") return { dotColor: "bg-emerald-500", statusText: "OK", statusTextColor: "text-emerald-600" };
  if (svcResult.status === "down") return { dotColor: "bg-red-500", statusText: svcResult.details ?? "Down", statusTextColor: "text-red-600" };
  if (svcResult.status === "degraded") return { dotColor: "bg-amber-500", statusText: svcResult.details ?? "Slow", statusTextColor: "text-amber-600" };
  return { dotColor: "bg-muted-foreground/40", statusText: "Unknown", statusTextColor: "text-muted-foreground" };
}

/* ── Flow Card ────────────────────────────────────────── */

function FlowCard({
  flow,
  results,
}: {
  flow: FlowDef;
  results: Map<string, HealthCheckResult>;
}) {
  const [showActivity, setShowActivity] = useState(false);

  const allHealthy = flow.steps.every(
    (s) => results.get(s.dependsOn)?.status === "healthy",
  );
  const hasDown = flow.steps.some(
    (s) => results.get(s.dependsOn)?.status === "down",
  );

  const SummaryIcon = allHealthy
    ? CheckCircle2
    : hasDown
      ? XCircle
      : AlertTriangle;
  const summaryColor = allHealthy
    ? "text-emerald-600"
    : hasDown
      ? "text-red-600"
      : "text-amber-600";

  const recentExecutions = getAllExecutionsForFlow(flow).slice(0, 5);

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <SummaryIcon className={`w-4 h-4 ${summaryColor}`} />
        <span className="text-sm font-semibold text-foreground">{flow.name}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {flow.steps.map((step, i) => {
          const { dotColor, statusText, statusTextColor } = getStepStatus(step, results);

          return (
            <div key={step.label} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                <span className="text-[11px] font-medium text-foreground whitespace-nowrap">
                  {step.label}
                </span>
                <span className={`text-[10px] ${statusTextColor} truncate`}>
                  — {statusText}
                </span>
              </div>
              {i < flow.steps.length - 1 && (
                <span className="text-muted-foreground text-[10px] shrink-0">→</span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Recent activity (collapsible) ─────────────── */}
      {recentExecutions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => setShowActivity(!showActivity)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {showActivity ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {showActivity ? "Hide recent activity" : "Show recent activity"}
          </button>
          {showActivity && (
            <div className="mt-2 flex flex-col gap-1 select-text">
              {recentExecutions.map((exec, i) => {
                const icon = exec.status === "success" ? "\u2705" : "\u274C";
                const duration = exec.duration != null ? ` (${exec.duration.toFixed(1)}s)` : "";
                const statusLabel = exec.status === "success" ? "succeeded" : exec.status;
                return (
                  <span
                    key={`${exec.workflowName}-${exec.startedAt}-${i}`}
                    className="text-[10px] text-muted-foreground leading-relaxed"
                  >
                    {icon} {relativeTimeShort(exec.startedAt)} — {shortWorkflowName(exec.workflowName)} — {statusLabel}{duration}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
