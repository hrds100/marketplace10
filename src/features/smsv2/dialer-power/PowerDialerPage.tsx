// PowerDialerPage — the new /crm/dialer surface.
//
// Mechanism: usePowerDialer (cloned from the working caller dialer).
// Surface: smsv2's existing UI panes (AI coach, transcript, script,
// glossary, mid-call SMS) — Hugo: "Our UI is beautiful, it's great...
// but the functionality of when you click next, pick outcome, etc.
// We only gonna have power dialer."
//
// Modes available: POWER DIALER ONLY. No parallel-line dialer, no
// manual mode.
// Pacing options: auto (default, with delay) or paused.

import { useEffect, useMemo, useState } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  SkipForward,
  Zap,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSmsV2 } from '../store/SmsV2Store';
import { useDialerCampaigns } from '../hooks/useDialerCampaigns';
import { useSpendLimit } from '../hooks/useSpendLimit';
import { useKillSwitch } from '../hooks/useKillSwitch';
import { useCurrentAgent } from '../hooks/useCurrentAgent';
import CallScriptPane from '../components/live-call/CallScriptPane';
import LiveTranscriptPane from '../components/live-call/LiveTranscriptPane';
import TerminologyPane from '../components/live-call/TerminologyPane';
import MidCallSmsSender from '../components/live-call/MidCallSmsSender';
import { usePowerDialer, type PacingMode } from './usePowerDialer';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PipelineCol {
  id: string;
  name: string;
  position: number;
  colour: string | null;
}

export default function PowerDialerPage() {
  const { user, isAdmin } = useAuth();
  const { pushToast } = useSmsV2();
  const { firstName: agentFirstName } = useCurrentAgent();

  // Workspace role check (mirrors smsv2 PR 119 — admins see all).
  const [workspaceRole, setWorkspaceRole] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('profiles' as any) as any)
        .select('workspace_role')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setWorkspaceRole((data?.workspace_role as string | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);
  const isEffectiveAdmin = workspaceRole === 'admin' || (workspaceRole === null && isAdmin);

  // Campaigns.
  const { campaigns } = useDialerCampaigns({
    scopedToAgentId: !isEffectiveAdmin && user ? user.id : null,
    includeInactive: true,
  });
  const [activeId, setActiveId] = useState('');
  useEffect(() => {
    if (campaigns.length === 0) return;
    if (!campaigns.some((c) => c.id === activeId)) setActiveId(campaigns[0].id);
  }, [campaigns, activeId]);
  const camp = useMemo(
    () => campaigns.find((c) => c.id === activeId) ?? campaigns[0] ?? null,
    [campaigns, activeId]
  );
  const queueCampaignId = UUID_RE.test(activeId) ? activeId : null;

  // Pacing.
  const [pacing, setPacing] = useState<PacingMode>('auto');
  const [pacingDelaySec, setPacingDelaySec] = useState(5);

  // Spend / kill switch.
  const spend = useSpendLimit();
  const ks = useKillSwitch();

  // Pipeline columns for the outcome picker.
  const [columns, setColumns] = useState<PipelineCol[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_pipeline_columns' as any) as any)
        .select('id, name, position, colour')
        .order('position', { ascending: true });
      if (!cancelled) setColumns((data ?? []) as PipelineCol[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── The engine. ─────────────────────────────────────────────────
  const dialer = usePowerDialer({
    campaignId: queueCampaignId,
    agentId: user?.id ?? null,
    isAdmin: isEffectiveAdmin,
    pacing,
    pacingDelaySec,
    onToast: (msg, tone) => pushToast(msg, tone),
  });

  const isLive =
    dialer.phase === 'dialing' || dialer.phase === 'ringing' || dialer.phase === 'connected';
  const isWrap = dialer.phase === 'wrap_up';

  // 1Hz tick for duration + countdown.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isLive && dialer.pacingDeadlineMs === null) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [isLive, dialer.pacingDeadlineMs]);

  const elapsedSec =
    dialer.startedAt !== null ? Math.floor((Date.now() - dialer.startedAt) / 1000) : 0;
  const countdownSec =
    dialer.pacingDeadlineMs !== null
      ? Math.max(0, Math.ceil((dialer.pacingDeadlineMs - Date.now()) / 1000))
      : null;

  const blockedReason: string | null = spend.isLimitReached
    ? 'Daily spend limit reached'
    : ks.allDialers
      ? 'Dialer paused (kill switch)'
      : null;

  const contactFirstName = (dialer.lead?.name ?? '').trim().split(/\s+/)[0] ?? '';

  return (
    <div className="p-4 max-w-[1400px] mx-auto space-y-3" data-testid="power-dialer-page">
      {/* Header — campaign + pacing + session controls */}
      <header className="bg-white border border-[#E5E7EB] rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-1 min-w-[200px]">
          <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
            Campaign
          </span>
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            disabled={dialer.sessionStarted && dialer.phase !== 'idle' && dialer.phase !== 'paused'}
            className="px-2.5 py-1.5 text-[13px] font-medium bg-white border border-[#E5E7EB] rounded-[10px] cursor-pointer min-w-[180px] disabled:opacity-50"
            data-testid="power-campaign"
          >
            {campaigns.length === 0 && <option value="">No campaigns</option>}
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.isActive === false ? ' (paused)' : ''} · {c.pendingLeads} left
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
            Pacing
          </span>
          <div className="flex items-center gap-1.5">
            <select
              value={pacing}
              onChange={(e) => setPacing(e.target.value as PacingMode)}
              className="px-2 py-1 text-[12px] bg-white border border-[#E5E7EB] rounded-[8px]"
              data-testid="power-pacing-mode"
            >
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
            </select>
            {pacing === 'auto' && (
              <select
                value={pacingDelaySec}
                onChange={(e) => setPacingDelaySec(parseInt(e.target.value, 10))}
                className="px-2 py-1 text-[12px] bg-white border border-[#E5E7EB] rounded-[8px]"
                data-testid="power-pacing-delay"
              >
                <option value="0">No delay</option>
                <option value="3">3s</option>
                <option value="5">5s</option>
                <option value="10">10s</option>
              </select>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {dialer.sessionStarted && dialer.phase !== 'idle' && dialer.phase !== 'paused' && (
            <span className="text-[11px] text-[#6B7280]">
              {dialer.phase === 'connected' && (
                <span className="tabular-nums">
                  Connected · {Math.floor(elapsedSec / 60)}:
                  {(elapsedSec % 60).toString().padStart(2, '0')}
                </span>
              )}
            </span>
          )}
          {!dialer.sessionStarted ? (
            <button
              onClick={() => void dialer.start()}
              disabled={!camp || !!blockedReason}
              title={blockedReason ?? 'Start power dialer'}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#1E9A80] text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(30,154,128,0.35)] disabled:opacity-50 hover:bg-[#1E9A80]/90"
              data-testid="power-start"
            >
              <Zap className="w-4 h-4" /> Start power dialer
            </button>
          ) : dialer.phase === 'paused' ? (
            <button
              onClick={() => void dialer.resume()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#1E9A80] text-white text-[12px] font-semibold"
              data-testid="power-resume"
            >
              <Play className="w-3.5 h-3.5" /> Resume
            </button>
          ) : (
            <button
              onClick={() => dialer.pause()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[#E5E7EB] bg-white text-[12px] font-medium"
              data-testid="power-pause"
            >
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          )}
          {dialer.sessionStarted && (
            <button
              onClick={() => dialer.stop()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[#EF4444] bg-white text-[#EF4444] text-[12px] font-medium"
              data-testid="power-stop"
            >
              <Square className="w-3.5 h-3.5" /> Stop
            </button>
          )}
        </div>
      </header>

      {blockedReason && (
        <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-3 py-2">
          {blockedReason}
        </div>
      )}

      {/* IDLE state — show "press Start" */}
      {!dialer.sessionStarted && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center">
          <Zap className="w-8 h-8 mx-auto text-[#1E9A80] mb-2" />
          <div className="text-[16px] font-bold text-[#1A1A1A]">Power dialer ready</div>
          <div className="text-[12px] text-[#6B7280] mt-1">
            {camp ? (
              <>
                Campaign: <span className="font-semibold">{camp.name}</span> ·{' '}
                {camp.pendingLeads} pending lead{camp.pendingLeads === 1 ? '' : 's'}
              </>
            ) : (
              'Pick a campaign above to begin.'
            )}
          </div>
        </div>
      )}

      {/* PAUSED state */}
      {dialer.sessionStarted && dialer.phase === 'paused' && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-6 text-center">
          <Pause className="w-6 h-6 mx-auto text-[#B45309] mb-2" />
          <div className="text-[14px] font-bold text-[#1A1A1A]">Session paused</div>
          <div className="text-[12px] text-[#6B7280]">Press Resume to dial the next lead.</div>
        </div>
      )}

      {/* WAITING for next dial (auto-pacing armed) */}
      {dialer.sessionStarted &&
        dialer.phase === 'idle' &&
        countdownSec !== null &&
        countdownSec > 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-semibold text-[#1A1A1A]">
                Next call in {countdownSec}s
              </div>
              <div className="text-[11px] text-[#6B7280]">
                Auto-pacing — press Dial now to skip the wait.
              </div>
            </div>
            <button
              onClick={() => void dialer.dialNow()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#1E9A80] text-white text-[12px] font-semibold"
              data-testid="power-dial-now"
            >
              <Phone className="w-3.5 h-3.5" /> Dial now
            </button>
          </div>
        )}

      {/* LIVE / WRAP-UP — the rich call surface */}
      {dialer.lead && (isLive || isWrap) && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
          {/* Status bar */}
          <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wide',
                dialer.phase === 'dialing' && 'bg-[#DBEAFE] text-[#1D4ED8]',
                dialer.phase === 'ringing' && 'bg-[#DBEAFE] text-[#1D4ED8]',
                dialer.phase === 'connected' && 'bg-[#ECFDF5] text-[#1E9A80]',
                dialer.phase === 'wrap_up' && 'bg-[#FEF3C7] text-[#B45309]'
              )}
              data-testid="power-status-badge"
            >
              {(dialer.phase === 'dialing' ||
                dialer.phase === 'ringing' ||
                dialer.phase === 'connected') && (
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              )}
              {dialer.phase === 'dialing' && 'Dialing'}
              {dialer.phase === 'ringing' && 'Ringing'}
              {dialer.phase === 'connected' && (
                <span className="tabular-nums">
                  Connected {Math.floor(elapsedSec / 60)}:
                  {(elapsedSec % 60).toString().padStart(2, '0')}
                </span>
              )}
              {dialer.phase === 'wrap_up' && `Wrap up · ${dialer.endReason ?? 'ended'}`}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-[#1A1A1A] truncate">
                {dialer.lead.name}
              </div>
              <div className="text-[11px] text-[#6B7280] tabular-nums truncate">
                {dialer.lead.phone}
              </div>
            </div>
            {dialer.phase === 'connected' && (
              <button
                onClick={dialer.toggleMute}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium border',
                  dialer.muted
                    ? 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]'
                    : 'bg-white text-[#1A1A1A] border-[#E5E7EB] hover:bg-[#F3F3EE]'
                )}
                data-testid="power-mute"
              >
                {dialer.muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {dialer.muted ? 'Unmute' : 'Mute'}
              </button>
            )}
            {isLive && (
              <button
                onClick={() => void dialer.hangUp()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#EF4444] hover:bg-[#DC2626] text-white text-[12px] font-semibold"
                data-testid="power-hangup"
              >
                <PhoneOff className="w-4 h-4" />
                {dialer.phase === 'dialing' || dialer.phase === 'ringing' ? 'Cancel' : 'Hang up'}
              </button>
            )}
          </div>

          {dialer.error && (
            <div className="px-4 py-2 bg-[#FEF2F2] border-b border-[#FCA5A5] text-[12px] text-[#B91C1C]">
              {dialer.error}
            </div>
          )}

          {/* Body — 3-column grid: contact + transcript+coach (center) + script + glossary */}
          <div className="grid grid-cols-1 md:grid-cols-[20%_38%_22%_20%] divide-x divide-[#E5E7EB] min-h-[480px]">
            {/* Contact + mid-call SMS */}
            <div className="flex flex-col">
              <div className="p-4 flex-1 overflow-y-auto">
                <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
                  Contact
                </div>
                <div className="text-[14px] font-bold text-[#1A1A1A]">{dialer.lead.name}</div>
                <div className="text-[11px] text-[#6B7280] tabular-nums">{dialer.lead.phone}</div>
              </div>
              {dialer.phase === 'connected' && dialer.callId && (
                <MidCallSmsSender
                  contactId={dialer.lead.id}
                  contactName={dialer.lead.name}
                  contactPhone={dialer.lead.phone}
                  agentFirstName={agentFirstName}
                  campaignId={queueCampaignId}
                />
              )}
            </div>

            {/* Live transcript + coach */}
            <div className="min-h-[420px]">
              {isWrap ? (
                <WrapUpPanel
                  columns={columns}
                  onApplyOutcome={(colId, note) => void dialer.applyOutcome(colId, note)}
                  onSkip={dialer.skip}
                  onDialNext={() => void dialer.dialNextManual()}
                  busy={false}
                  endReason={dialer.endReason}
                  error={dialer.error}
                />
              ) : (
                <LiveTranscriptPane
                  durationSec={elapsedSec}
                  contactId={dialer.lead.id}
                  callId={dialer.callId}
                  agentFirstName={agentFirstName}
                />
              )}
            </div>

            {/* Script */}
            <div className="min-h-[420px]">
              <CallScriptPane
                callId={dialer.callId}
                contactFirstName={contactFirstName}
                agentFirstName={agentFirstName}
              />
            </div>

            {/* Terminology / glossary */}
            <div className="min-h-[420px]">
              <TerminologyPane />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Wrap-up outcome panel ─────────────────────────────────────────
function WrapUpPanel({
  columns,
  onApplyOutcome,
  onSkip,
  onDialNext,
  busy,
  endReason,
  error,
}: {
  columns: PipelineCol[];
  onApplyOutcome: (columnId: string, note: string | null) => void;
  onSkip: () => void;
  onDialNext: () => void;
  busy: boolean;
  endReason: string | null;
  error: string | null;
}) {
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<string | null>(null);

  // Keyboard 1-9 to pick outcome.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      ) {
        return;
      }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9 && !picked) {
        const col = columns.find((c) => c.position === n);
        if (col) {
          setPicked(col.id);
          onApplyOutcome(col.id, note.trim() || null);
        }
      } else if (e.key.toLowerCase() === 's' && !picked) {
        onSkip();
      } else if (e.key.toLowerCase() === 'n') {
        onDialNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [columns, note, picked, onApplyOutcome, onSkip, onDialNext]);

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-2">
        Pick an outcome
      </div>
      {error && (
        <div className="mb-2 text-[11px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] rounded px-2 py-1.5">
          {error}
        </div>
      )}
      {!error && endReason && (
        <div className="mb-2 text-[11px] text-[#6B7280]">Ended: {endReason}</div>
      )}
      <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto">
        {columns.map((col) => {
          const isPicked = picked === col.id;
          const dimmed = picked && picked !== col.id;
          return (
            <button
              key={col.id}
              onClick={() => {
                if (picked || busy) return;
                setPicked(col.id);
                onApplyOutcome(col.id, note.trim() || null);
              }}
              disabled={!!picked || busy}
              data-testid={`power-outcome-${col.id}`}
              className={cn(
                'p-2 rounded-xl border-2 text-left transition-all',
                isPicked
                  ? 'border-[#1E9A80] bg-[#ECFDF5] shadow-[0_4px_16px_rgba(30,154,128,0.35)]'
                  : dimmed
                    ? 'border-[#E5E7EB] opacity-30 cursor-not-allowed'
                    : 'border-[#E5E7EB] bg-white hover:border-[#1E9A80]/50'
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tabular-nums text-[#9CA3AF]">
                  {col.position}.
                </span>
                <span className="text-[12px] font-semibold text-[#1A1A1A]">{col.name}</span>
                {isPicked && <CheckCircle2 className="ml-auto w-4 h-4 text-[#1E9A80]" />}
              </div>
            </button>
          );
        })}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note…"
        disabled={!!picked}
        className="mt-2 w-full px-2 py-1.5 text-[12px] border border-[#E5E7EB] rounded-[8px] disabled:opacity-50"
        data-testid="power-outcome-note"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => {
            if (picked || busy) return;
            onSkip();
          }}
          disabled={!!picked || busy}
          className="flex items-center gap-1 px-2 py-1.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[11px] text-[#6B7280] disabled:opacity-50"
          data-testid="power-skip"
        >
          <SkipForward className="w-3 h-3" /> Skip
        </button>
        <button
          onClick={onDialNext}
          className="flex items-center gap-1 px-2 py-1.5 rounded-[8px] bg-[#1E9A80] text-white text-[11px] font-semibold"
          data-testid="power-next"
        >
          <Phone className="w-3 h-3" /> Next call
        </button>
        <span className="ml-auto text-[10px] text-[#9CA3AF]">
          {busy ? <Loader2 className="w-3 h-3 animate-spin inline" /> : '⌨ 1–9 · S · N'}
        </span>
      </div>
    </div>
  );
}
