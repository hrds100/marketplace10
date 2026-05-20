import { useEffect, useState } from 'react';
import { BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePipelines } from '../hooks/usePipelines';
import { useStages } from '../hooks/useStages';
import { useStageFunnel } from '../hooks/useStageFunnel';

const STORAGE_KEY = 'sms-reports-active-pipeline-id';

export default function SmsReportsPage() {
  const { pipelines, isLoading: pipelinesLoading } = usePipelines();

  const [activePipelineId, setActivePipelineId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

  // Default to first pipeline if none selected
  useEffect(() => {
    if (!pipelines.length) return;
    if (!activePipelineId || !pipelines.some((p) => p.id === activePipelineId)) {
      const def = pipelines[0].id;
      setActivePipelineId(def);
      try { localStorage.setItem(STORAGE_KEY, def); } catch { /* ignore */ }
    }
  }, [pipelines, activePipelineId]);

  const activePipeline = pipelines.find((p) => p.id === activePipelineId) ?? null;
  const { stages, isLoading: stagesLoading } = useStages(activePipelineId ?? undefined);
  const { rows, isLoading: funnelLoading, error: funnelError, refetch } = useStageFunnel(activePipeline, stages);

  const totalEntries = rows.length > 0 ? rows[0].count : 0;
  const loading = pipelinesLoading || stagesLoading || funnelLoading;

  function selectPipeline(id: string) {
    setActivePipelineId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  }

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <BarChart3 className="h-6 w-6 text-[#1E9A80] flex-shrink-0" />
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Report</h1>

        <select
          value={activePipelineId ?? ''}
          onChange={(e) => selectPipeline(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-[10px] border border-[#E5E7EB] bg-white text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30"
        >
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <span className="text-sm text-[#6B7280]">
          {rows.length} stages
        </span>

        <div className="flex-1" />

        <Button
          size="sm"
          variant="outline"
          onClick={() => void refetch()}
          disabled={loading}
          className="rounded-lg gap-1.5 border-[#E5E7EB] text-[#1A1A1A]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {funnelError ? (
        <div className="bg-white border border-[#FECACA] rounded-2xl px-4 py-6 text-center">
          <p className="text-sm font-medium text-[#B91C1C] mb-1">Couldn't load the funnel</p>
          <p className="text-xs text-[#6B7280] mb-3">
            {funnelError instanceof Error ? funnelError.message : 'Unknown error'}
          </p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>Try again</Button>
        </div>
      ) : loading && rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#1E9A80]" />
          <p className="text-xs text-[#9CA3AF]">
            Computing funnel for {activePipeline?.name ?? 'pipeline'}…
          </p>
        </div>
      ) : !activePipeline ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart3 className="h-12 w-12 text-[#9CA3AF] mb-4" />
          <p className="text-lg font-medium text-[#1A1A1A] mb-1">No pipeline selected</p>
          <p className="text-sm text-[#6B7280]">Create a pipeline first to see the funnel.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Funnel rows */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#1A1A1A]">
                {activePipeline.name} funnel
              </h2>
              <span className="text-[11px] text-[#6B7280]">
                Counts every contact that ever reached each stage
              </span>
            </div>

            <div className="divide-y divide-[#E5E7EB]">
              {rows.map((r) => {
                const pct = totalEntries > 0 ? (r.count / totalEntries) * 100 : 0;
                return (
                  <div key={r.stageId} className="px-4 py-3 flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: r.colour }}
                    />
                    <div className="w-44 text-sm font-medium text-[#1A1A1A] truncate">
                      {r.stageName}
                    </div>

                    <div className="flex-1 h-2 rounded-full bg-[#F3F3EE] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{ width: `${pct}%`, backgroundColor: r.colour }}
                      />
                    </div>

                    <div className="w-12 text-right tabular-nums text-sm font-semibold text-[#1A1A1A]">
                      {r.count}
                    </div>
                    <div className="w-14 text-right tabular-nums text-[11px] text-[#6B7280]">
                      {pct.toFixed(0)}%
                    </div>
                    <div className="w-32 text-right text-[10px] text-[#9CA3AF] uppercase tracking-wide">
                      {r.source === 'current_position' ? 'now in stage' : r.source.replace(/_/g, ' ')}
                    </div>
                  </div>
                );
              })}
              {rows.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-[#9CA3AF]">
                  No stages in this pipeline yet.
                </div>
              )}
            </div>
          </div>

          {/* Methodology note */}
          <div className="text-[11px] text-[#9CA3AF] leading-relaxed max-w-3xl">
            <p className="mb-1 font-semibold text-[#6B7280]">How counts are derived</p>
            <ul className="space-y-0.5 list-disc pl-4">
              <li><b>Cold SMS Sent</b> — contacts with at least one outbound SMS linked to a campaign.</li>
              <li><b>Brochure Sent</b> — outbound messages containing <code>nfstay.com/brochure</code>.</li>
              <li><b>Day2 Sent</b> — outbound messages matching the Day 2 Check-in template.</li>
              <li><b>Moved CRM / Scheduled Call</b> — phone matches a <code>wk_contacts</code> row whose source starts with <code>sms_automation_</code>.</li>
              <li><b>Closed</b> — automation state with exit_reason of <code>opted_out</code> / <code>stop_node</code>.</li>
              <li>Any other custom stage name falls back to <em>contacts currently in that stage</em>.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
