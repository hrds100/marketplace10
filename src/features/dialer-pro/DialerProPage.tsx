import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Play, Pause as PauseIcon, Square, Radio, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useDialerCampaigns } from '@/features/smsv2/caller-pad/hooks/useDialerCampaigns';
import { useDialerKpis } from '@/features/smsv2/caller-pad/hooks/useDialerKpis';
import { usePipelineColumns } from '@/features/smsv2/caller-pad/hooks/usePipelineColumns';
import { useSpendLimit } from '@/features/smsv2/caller-pad/hooks/useSpendLimit';
import { useKillSwitch } from '@/features/smsv2/caller-pad/hooks/useKillSwitch';
import type { Campaign } from '@/features/smsv2/caller-pad/types';

import { useDialerMachine } from './useDialerMachine';
import { useQueuePro } from './useQueuePro';
import ContactPanelPro from './panels/ContactPanelPro';
import TranscriptPanelPro from './panels/TranscriptPanelPro';
import ScriptPanelPro from './panels/ScriptPanelPro';
import GlossaryPanelPro from './panels/GlossaryPanelPro';
import DialControlsPro from './controls/DialControlsPro';
import OutcomeBarPro from './controls/OutcomeBarPro';
import QueueStripPro from './controls/QueueStripPro';
import CallHistoryPro from './history/CallHistoryPro';
import QueueManagerPro from './history/QueueManagerPro';

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  idle: { label: 'IDLE', color: 'bg-[#9CA3AF]' },
  dialing: { label: 'DIALING', color: 'bg-amber-500' },
  ringing: { label: 'RINGING', color: 'bg-amber-500 animate-pulse' },
  connected: { label: 'CONNECTED', color: 'bg-[#1E9A80]' },
  wrap_up: { label: 'WRAP UP', color: 'bg-blue-500' },
  paused: { label: 'PAUSED', color: 'bg-[#9CA3AF]' },
};

type BottomTab = 'queue' | 'history';

export default function DialerProPage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const agentFirstName = user?.user_metadata?.first_name as string ?? 'Agent';

  // Toasts (simple inline)
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; type: string }>>([]);
  const onToast = useCallback((msg: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev.slice(-4), { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // Campaign
  const { campaigns, loading: campaignsLoading } = useDialerCampaigns({
    scopedToAgentId: userId,
    includeInactive: true,
  });
  const [activeCampaignId, setActiveCampaignId] = useState<string>('');
  useEffect(() => {
    if (campaigns.length === 0) return;
    if (!campaigns.some((c) => c.id === activeCampaignId)) {
      setActiveCampaignId(campaigns[0].id);
    }
  }, [campaigns, activeCampaignId]);
  const camp: Campaign | null = useMemo(
    () => campaigns.find((c) => c.id === activeCampaignId) ?? campaigns[0] ?? null,
    [campaigns, activeCampaignId]
  );

  const kpis = useDialerKpis(camp, userId);
  const { columns: outcomeColumns } = usePipelineColumns(camp?.pipelineId ?? null);
  const spend = useSpendLimit();
  const ks = useKillSwitch();

  // State machine
  const machine = useDialerMachine({
    userId,
    campaignId: camp?.id ?? null,
    pipelineId: camp?.pipelineId ?? null,
    onToast,
  });
  const { state, deviceReady } = machine;

  // Queue
  const { queue, refresh: refreshQueue, loading: queueLoading } = useQueuePro(camp?.id ?? null, userId);

  // Auto-pacing effect
  useEffect(() => {
    if (state.phase !== 'idle') return;
    if (!state.sessionStarted) return;
    if (!state.autoPace) return;

    const delayMs = Math.max(0, state.pacingDelaySec) * 1000;
    const deadlineMs = Date.now() + delayMs;
    machine.dispatch({ type: 'PACING_ARMED', deadlineMs });
    const t = setTimeout(() => {
      void (async () => {
        const next = await machine.pickNextLead(queue);
        if (next) void machine.dialLead(next);
        else onToast('Queue empty', 'info');
      })();
    }, delayMs);
    return () => {
      clearTimeout(t);
      machine.dispatch({ type: 'PACING_CLEARED' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.sessionStarted, state.autoPace, state.pacingDelaySec]);

  // Auto-route outcomes (no pickup, voicemail)
  useEffect(() => {
    if (state.phase !== 'wrap_up') return;
    if (!state.currentLead || !state.currentCallId) return;
    if (outcomeColumns.length === 0) return;

    if (state.endReason === 'cancel' || state.endReason === 'reject' || state.endReason === 'error') {
      const noPickupCol = outcomeColumns.find(
        (c) => c.name.toLowerCase().includes('no pickup') || c.name.toLowerCase() === 'no answer'
      );
      if (noPickupCol) { void machine.applyOutcome(noPickupCol.id); return; }
    }

    if (
      state.endReason === 'hangup' &&
      state.durationSec !== null &&
      state.durationSec > 0 &&
      state.durationSec < 10
    ) {
      const vmCol = outcomeColumns.find((c) => c.name.toLowerCase().includes('voicemail'));
      if (vmCol) { void machine.applyOutcome(vmCol.id); return; }
    }
  }, [state.phase, state.endReason, state.durationSec, state.currentLead, state.currentCallId, outcomeColumns, machine]);

  // Start dialer
  const startDialer = useCallback(async () => {
    if (!camp || !deviceReady) {
      onToast('Phone is starting up — try again', 'error');
      return;
    }
    if (spend.isLimitReached) {
      onToast('Daily spend limit reached', 'error');
      return;
    }
    if (ks.allDialers) {
      onToast('All dialers paused (kill switch)', 'error');
      return;
    }
    const next = await machine.pickNextLead(queue);
    if (!next) {
      onToast('No leads in queue', 'info');
      return;
    }
    void machine.dialLead(next);
  }, [camp, deviceReady, spend.isLimitReached, ks.allDialers, machine, queue, onToast]);

  // Call duration for transcript
  const durationSec = state.startedAt ? Math.floor((Date.now() - state.startedAt) / 1000) : 0;

  const leadFirstName = state.currentLead?.name.split(' ')[0] ?? '';

  const phaseInfo = PHASE_LABELS[state.phase] ?? PHASE_LABELS.idle;

  const [bottomTab, setBottomTab] = useState<BottomTab>('queue');

  return (
    <div className="flex flex-col h-full bg-[#F3F3EE]">
      {/* Toast stack */}
      {toasts.length > 0 && (
        <div className="fixed top-16 right-4 z-50 space-y-1">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium shadow-md animate-in fade-in slide-in-from-right-2',
                t.type === 'error' && 'bg-red-50 text-red-700 border border-red-200',
                t.type === 'success' && 'bg-[#ECFDF5] text-[#1E9A80] border border-[#1E9A80]/20',
                t.type === 'info' && 'bg-white text-[#6B7280] border border-[#E5E7EB]'
              )}
            >
              {t.msg}
            </div>
          ))}
        </div>
      )}

      {/* ─── TOP BAR ─── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-[#E5E7EB] flex-shrink-0">
        {/* Campaign picker */}
        <select
          value={activeCampaignId}
          onChange={(e) => setActiveCampaignId(e.target.value)}
          disabled={state.phase !== 'idle' && state.phase !== 'paused'}
          className="px-2 py-1 rounded-lg border border-[#E5E7EB] text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-[#1E9A80] max-w-[180px]"
        >
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* KPIs */}
        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
          <span>Pending <strong className="text-[#1A1A1A]">{kpis.pending}</strong></span>
          <span>Dials <strong className="text-[#1A1A1A]">{kpis.dials24h}</strong></span>
          <span>Msgs <strong className="text-[#1A1A1A]">{kpis.msgSent}</strong></span>
        </div>

        {/* Phase badge */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className={cn('w-2 h-2 rounded-full', phaseInfo.color)} />
          <span className="text-xs font-semibold text-[#1A1A1A]">{phaseInfo.label}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {(state.phase === 'idle' && !state.sessionStarted) && (
            <button
              onClick={() => void startDialer()}
              disabled={!deviceReady || campaignsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90 transition-colors disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5" />
              Start
            </button>
          )}
          {state.phase === 'paused' && (
            <button
              onClick={() => {
                machine.resume();
                void (async () => {
                  const next = await machine.pickNextLead(queue);
                  if (next) void machine.dialLead(next);
                  else onToast('Queue empty', 'info');
                })();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Resume
            </button>
          )}
          {state.sessionStarted && state.phase !== 'paused' && (
            <button
              onClick={machine.pause}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-[#6B7280] hover:bg-black/[0.04] border border-[#E5E7EB] transition-colors"
            >
              <PauseIcon className="w-3.5 h-3.5" />
              Pause
            </button>
          )}
          {state.sessionStarted && (
            <button
              onClick={() => void machine.stop()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-red-500 hover:bg-red-50 border border-[#E5E7EB] transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
          )}

          {/* Auto-pace toggle */}
          <button
            onClick={() => machine.dispatch({ type: 'SET_AUTO_PACE', value: !state.autoPace })}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors',
              state.autoPace
                ? 'bg-[#ECFDF5] text-[#1E9A80] border-[#1E9A80]/20'
                : 'bg-white text-[#9CA3AF] border-[#E5E7EB]'
            )}
          >
            <Zap className="w-3 h-3" />
            Auto
          </button>
        </div>
      </div>

      {/* ─── 4 COLUMN PANELS ─── */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={20} minSize={15}>
            <div className="h-full border-r border-[#E5E7EB] bg-white overflow-hidden">
              <ContactPanelPro
                lead={state.currentLead}
                phase={state.phase}
                campaignId={camp?.id ?? null}
                agentFirstName={agentFirstName}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={38} minSize={25}>
            <div className="h-full border-r border-[#E5E7EB] bg-white overflow-hidden">
              <TranscriptPanelPro
                phase={state.phase}
                durationSec={durationSec}
                contactId={state.currentLead?.contactId ?? null}
                callId={state.currentCallId}
                agentFirstName={agentFirstName}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={22} minSize={15}>
            <div className="h-full border-r border-[#E5E7EB] bg-white overflow-hidden">
              <ScriptPanelPro
                phase={state.phase}
                callId={state.currentCallId}
                contactFirstName={leadFirstName}
                agentFirstName={agentFirstName}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={20} minSize={12}>
            <div className="h-full bg-white overflow-hidden">
              <GlossaryPanelPro />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* ─── BOTTOM BAR ─── */}
      <div className="flex-shrink-0 bg-white border-t border-[#E5E7EB]">
        {/* Row 1: Queue strip + Dial controls + Outcomes */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[#E5E7EB]">
          <QueueStripPro
            queue={queue}
            phase={state.phase}
            currentLeadId={state.currentLead?.contactId ?? null}
          />
          <div className="ml-auto flex items-center gap-3">
            <DialControlsPro
              phase={state.phase}
              isMuted={state.isMuted}
              isOnHold={state.isOnHold}
              startedAt={state.startedAt}
              onMuteToggle={machine.muteToggle}
              onHoldToggle={machine.holdToggle}
              onHangUp={() => void machine.hangUp()}
              onSkip={machine.skip}
            />
          </div>
        </div>

        {/* Row 2: Outcome bar */}
        <div className="px-4 py-2 border-b border-[#E5E7EB]">
          <OutcomeBarPro
            phase={state.phase}
            columns={outcomeColumns}
            applying={machine.applying}
            onOutcome={(colId) => void machine.applyOutcome(colId)}
          />
        </div>

        {/* Row 3: Tabs — Queue / History */}
        <div>
          <div className="flex items-center gap-1 px-4 pt-2">
            <button
              onClick={() => setBottomTab('queue')}
              className={cn(
                'px-3 py-1 rounded-t-lg text-xs font-medium transition-colors',
                bottomTab === 'queue'
                  ? 'bg-white text-[#1E9A80] border border-b-0 border-[#E5E7EB]'
                  : 'text-[#9CA3AF] hover:text-[#6B7280]'
              )}
            >
              Queue ({queue.length})
            </button>
            <button
              onClick={() => setBottomTab('history')}
              className={cn(
                'px-3 py-1 rounded-t-lg text-xs font-medium transition-colors',
                bottomTab === 'history'
                  ? 'bg-white text-[#1E9A80] border border-b-0 border-[#E5E7EB]'
                  : 'text-[#9CA3AF] hover:text-[#6B7280]'
              )}
            >
              Call History
            </button>
          </div>
          <div className="max-h-[200px] overflow-y-auto bg-[#F3F3EE]">
            {bottomTab === 'queue' && (
              <QueueManagerPro
                queue={queue}
                campaignId={camp?.id ?? null}
                onRefresh={refreshQueue}
              />
            )}
            {bottomTab === 'history' && (
              <CallHistoryPro
                campaignId={camp?.id ?? null}
                agentId={userId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
