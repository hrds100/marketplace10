import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Phone, PhoneOff, Mic, MicOff, Pause as PauseIcon, Play, Square,
  SkipForward, Zap, CheckCircle2, Loader2, Clock, Radio, Pencil, X,
  Minus, GripVertical, PlayCircle, Flame, Minimize2,
  MessageSquare, FileText, PhoneForwarded, Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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

import LiveTranscriptPane from '@/features/smsv2/components/live-call/LiveTranscriptPane';
import CallScriptPane from '@/features/smsv2/components/live-call/CallScriptPane';
import TerminologyPane from '@/features/smsv2/components/live-call/TerminologyPane';
import MidCallSmsSender from '@/features/smsv2/components/live-call/MidCallSmsSender';
import ContactMetaCompact from '@/features/smsv2/components/live-call/ContactMetaCompact';
import CallTimeline from '@/features/smsv2/components/live-call/CallTimeline';
import EditContactModal from '@/features/smsv2/components/contacts/EditContactModal';
import type { Contact } from '@/features/smsv2/types';

import { useDialerMachine } from './useDialerMachine';
import { useQueuePro } from './useQueuePro';
import type { QueueLead } from './types';
import CallHistoryPro from './history/CallHistoryPro';
import QueueManagerPro from './history/QueueManagerPro';

type PacingMode = 'manual' | 'auto';

function formatDurationPro(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatRelativeTimePro(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DialerProPage() {
  const { user, isAdmin } = useAuth();
  const userId = user?.id ?? null;
  const agentFirstName = (user?.user_metadata?.first_name as string) ?? 'Agent';

  // Toasts
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

  const [pacing, setPacing] = useState<PacingMode>('auto');
  const [pacingDelaySec, setPacingDelaySec] = useState(5);
  const [notes, setNotes] = useState('');

  // State machine
  const machine = useDialerMachine({
    userId,
    campaignId: camp?.id ?? null,
    pipelineId: camp?.pipelineId ?? null,
    onToast,
  });
  const { state, deviceReady } = machine;

  // Queue
  const { queue, refresh: refreshQueue } = useQueuePro(camp?.id ?? null, userId);

  // Contact for the LiveCallScreen left column
  const [contact, setContact] = useState<Contact | null>(null);
  useEffect(() => {
    if (!state.currentLead) { setContact(null); return; }
    let cancelled = false;
    void (async () => {
      const [contactRes, tagsRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_contacts' as any) as any)
          .select('id, name, phone, email, owner_agent_id, pipeline_column_id, is_hot, deal_value_pence, custom_fields, created_at, last_contact_at')
          .eq('id', state.currentLead!.contactId)
          .maybeSingle(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_contact_tags' as any) as any)
          .select('tag')
          .eq('contact_id', state.currentLead!.contactId),
      ]);
      if (cancelled) return;
      if (contactRes.error || !contactRes.data) return;
      const d = contactRes.data;
      const tags = ((tagsRes.data ?? []) as { tag: string }[]).map((r) => r.tag);
      setContact({
        id: d.id, name: d.name ?? '', phone: d.phone ?? '',
        email: d.email ?? undefined, ownerAgentId: d.owner_agent_id ?? undefined,
        pipelineColumnId: d.pipeline_column_id ?? undefined, tags,
        isHot: d.is_hot ?? false, dealValuePence: d.deal_value_pence ?? undefined,
        customFields: d.custom_fields ?? {}, createdAt: d.created_at ?? new Date().toISOString(),
        lastContactAt: d.last_contact_at ?? undefined,
      });
    })();
    return () => { cancelled = true; };
  }, [state.currentLead?.contactId, state.currentLead]);

  // Edit contact modal
  const [editing, setEditing] = useState<Contact | null>(null);

  // Auto-pacing effect
  useEffect(() => {
    if (state.phase !== 'idle') return;
    if (!state.sessionStarted) return;
    if (pacing !== 'auto') return;

    const delayMs = Math.max(0, pacingDelaySec) * 1000;
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
  }, [state.phase, state.sessionStarted, pacing, pacingDelaySec]);

  // Auto-route outcomes
  useEffect(() => {
    if (state.phase !== 'wrap_up') return;
    if (!state.currentLead || !state.currentCallId) return;
    if (outcomeColumns.length === 0) return;

    if (state.endReason === 'cancel' || state.endReason === 'reject' || state.endReason === 'error') {
      const col = outcomeColumns.find(
        (c) => c.name.toLowerCase().includes('no pickup') || c.name.toLowerCase() === 'no answer'
      );
      if (col) { void machine.applyOutcome(col.id); return; }
    }

    if (state.endReason === 'hangup' && state.durationSec !== null && state.durationSec > 0 && state.durationSec < 10) {
      const col = outcomeColumns.find((c) => c.name.toLowerCase().includes('voicemail'));
      if (col) { void machine.applyOutcome(col.id); return; }
    }
  }, [state.phase, state.endReason, state.durationSec, state.currentLead, state.currentCallId, outcomeColumns, machine]);

  // Start dialer
  const startDialer = useCallback(async () => {
    if (!camp || !deviceReady) { onToast('Phone is starting up — try again', 'error'); return; }
    if (spend.isLimitReached) { onToast('Daily spend limit reached', 'error'); return; }
    if (ks.allDialers) { onToast('All dialers paused (kill switch)', 'error'); return; }
    const next = await machine.pickNextLead(queue);
    if (!next) { onToast('No leads in queue', 'info'); return; }
    void machine.dialLead(next);
  }, [camp, deviceReady, spend.isLimitReached, ks.allDialers, machine, queue, onToast]);

  const dialNow = useCallback(async () => {
    machine.dispatch({ type: 'PACING_CLEARED' });
    const next = await machine.pickNextLead(queue);
    if (next) void machine.dialLead(next);
    else onToast('Queue empty', 'info');
  }, [machine, queue, onToast]);

  const dialNextManual = useCallback(async () => {
    if (state.currentLead) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      try { await (supabase as any).rpc('wk_update_queue_status', { p_queue_id: state.currentLead.queueRowId, p_status: 'skipped' }); } catch { /* ignore */ }
    }
    if (state.phase === 'connected' || state.phase === 'ringing' || state.phase === 'dialing') {
      await machine.hangUp();
    }
    machine.dispatch({ type: 'OUTCOME_DONE' });
    setTimeout(async () => {
      const next = await machine.pickNextLead(queue);
      if (next) void machine.dialLead(next);
      else onToast('Queue empty', 'info');
    }, 200);
  }, [state.phase, state.currentLead, machine, queue, onToast]);

  const resumeDialer = useCallback(async () => {
    machine.resume();
    const next = await machine.pickNextLead(queue);
    if (next) void machine.dialLead(next);
    else onToast('Queue empty', 'info');
  }, [machine, queue, onToast]);

  // Computed
  const blocked = spend.isLimitReached || ks.allDialers || !deviceReady;
  const blockReason = ks.allDialers ? 'All dialers paused (kill switch)'
    : spend.isLimitReached ? 'Daily spend limit reached'
    : !deviceReady ? 'Phone is starting up…' : null;
  const isLive = state.phase === 'dialing' || state.phase === 'ringing' || state.phase === 'connected';
  const isCallContext = state.phase !== 'idle';
  const contactFirstName = contact?.name?.trim().split(/\s+/)[0] ?? '';

  // Call duration for transcript
  const [liveDuration, setLiveDuration] = useState(0);
  useEffect(() => {
    if (!state.startedAt || state.phase !== 'connected') { setLiveDuration(0); return; }
    const tick = () => setLiveDuration(Math.floor((Date.now() - state.startedAt!) / 1000));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [state.startedAt, state.phase]);

  // ─── Floating pad state ───────────────────────────────────────────
  const PAD_W = 323;
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const raw = localStorage.getItem('dialer_pro_pos_v1');
      if (raw) { const p = JSON.parse(raw); if (typeof p?.x === 'number') return p; }
    } catch { /* ignore */ }
    return { x: Math.max(0, window.innerWidth - PAD_W - 24), y: 72 };
  });
  useEffect(() => { try { localStorage.setItem('dialer_pro_pos_v1', JSON.stringify(pos)); } catch { /* ignore */ } }, [pos]);

  const [minimized, setMinimized] = useState(false);
  const [accordion, setAccordion] = useState<'peek' | 'queue' | 'history'>('peek');

  // Drag
  const dragRef = useRef<{ offX: number; offY: number; moved: boolean } | null>(null);
  const justDraggedRef = useRef(false);
  const onDragStart = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { offX: e.clientX - pos.x, offY: e.clientY - pos.y, moved: false };
    justDraggedRef.current = false;
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - (pos.x + dragRef.current.offX);
    const dy = e.clientY - (pos.y + dragRef.current.offY);
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
    setPos({
      x: Math.min(Math.max(e.clientX - dragRef.current.offX, 0), Math.max(0, window.innerWidth - PAD_W)),
      y: Math.min(Math.max(e.clientY - dragRef.current.offY, 56), Math.max(0, window.innerHeight - 80)),
    });
  };
  const onDragEnd = (e: React.PointerEvent) => {
    if (dragRef.current) {
      justDraggedRef.current = dragRef.current.moved;
      try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      dragRef.current = null;
      window.setTimeout(() => { justDraggedRef.current = false; }, 0);
    }
  };

  // ─── LiveCallScreen visible only during active call (NOT wrap_up) ──
  const showCallScreen = state.currentLead !== null && isLive;

  // Phase labels for header
  const headerBg = state.phase === 'connected' ? 'bg-[#1E9A80] text-white'
    : (state.phase === 'dialing' || state.phase === 'ringing') ? 'bg-[#1A1A1A] text-white'
    : 'bg-white border-b border-[#E5E7EB] text-[#1A1A1A]';

  return (
    <div className="relative h-full bg-[#F3F3EE]">
      {/* Toast stack */}
      {toasts.length > 0 && (
        <div className="fixed top-16 right-4 z-[250] space-y-1">
          {toasts.map((t) => (
            <div key={t.id} className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium shadow-md',
              t.type === 'error' && 'bg-red-50 text-red-700 border border-red-200',
              t.type === 'success' && 'bg-[#ECFDF5] text-[#1E9A80] border border-[#1E9A80]/20',
              t.type === 'info' && 'bg-white text-[#6B7280] border border-[#E5E7EB]'
            )}>{t.msg}</div>
          ))}
        </div>
      )}

      {/* ─── LIVE CALL SCREEN (4-column) ─── */}
      {showCallScreen && contact && (
        <div className="fixed inset-0 z-[200] bg-[#F3F3EE] flex flex-col">
          {/* Top bar — matches LiveCallScreen exactly */}
          <header className={cn('h-14 flex items-center px-5 gap-3 flex-shrink-0 transition-colors', headerBg)}>
            {(state.phase === 'dialing' || state.phase === 'ringing') ? (
              <span className="relative w-2.5 h-2.5 inline-flex">
                <span className="absolute inset-0 rounded-full bg-white animate-ping" />
                <span className="relative w-2.5 h-2.5 rounded-full bg-white" />
              </span>
            ) : (
              <span className={cn('w-2.5 h-2.5 rounded-full',
                state.phase === 'connected' && 'bg-white animate-pulse',
                state.phase === 'wrap_up' && 'bg-[#1E9A80]'
              )} />
            )}
            <span className="text-[14px] font-semibold flex items-center gap-2">
              {(state.phase === 'dialing' || state.phase === 'ringing') && (
                <>
                  <span>Calling {state.currentLead?.name}</span>
                  <span className="inline-flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </>
              )}
              {state.phase === 'connected' && (
                <>
                  <span>In call · {state.currentLead?.name}</span>
                  <span className="ml-2 tabular-nums opacity-90">{formatDurationPro(liveDuration)}</span>
                </>
              )}
              {state.phase === 'wrap_up' && <span>Call ended · {state.currentLead?.name}</span>}
            </span>

            {state.phase === 'connected' && (
              <div className="ml-6 flex items-center gap-1">
                <button
                  onClick={machine.muteToggle}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[12px] font-medium',
                    state.isMuted ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/80'
                  )}
                >
                  {state.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {state.isMuted ? 'Unmute' : 'Mute'}
                </button>
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              {/* KPI pills */}
              <div className={cn(
                'hidden md:flex items-center gap-3 text-[11px] px-3 py-1 rounded-full',
                state.phase === 'connected' ? 'bg-white/15 text-white' : 'bg-[#F3F3EE] border border-[#E5E7EB] text-[#6B7280]'
              )}>
                <span>Calls <span className="font-semibold tabular-nums">{kpis.dials24h}</span></span>
              </div>

              {isLive && (
                <button
                  onClick={() => void machine.hangUp()}
                  className="flex items-center gap-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white px-3 py-1.5 rounded-[10px] text-[12px] font-semibold"
                >
                  <PhoneOff className="w-3.5 h-3.5" /> End call
                </button>
              )}
            </div>
          </header>

          {/* 4-column body — exact clone of LiveCallScreen */}
          <ResizablePanelGroup
            direction="horizontal"
            autoSaveId="dialer-pro-call-layout-v1"
            className="flex-1 overflow-hidden"
          >
            {/* COL 1 — Contact context */}
            <ResizablePanel defaultSize={20} minSize={14} className="bg-white border-r border-[#E5E7EB] flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2">
                  <div className="text-[16px] font-bold text-[#1A1A1A]">{contact.name}</div>
                  {contact.isHot && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#FEF2F2', color: '#EF4444' }}>
                      <Flame className="w-3 h-3" /> HOT
                    </span>
                  )}
                  <button onClick={() => setEditing(contact)} className="ml-auto p-1 rounded hover:bg-[#F3F3EE] text-[#6B7280] hover:text-[#1A1A1A]" title="Edit lead">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[12px] text-[#6B7280] tabular-nums mt-0.5">{contact.phone}</div>
                <div className="text-[11px] text-[#9CA3AF] mt-0.5">Added {formatRelativeTimePro(contact.createdAt)}</div>
                <div className="mt-2"><ContactMetaCompact contact={contact} /></div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-[12px]">
                <MidCallSmsSender
                  contactId={contact.id}
                  contactName={contact.name}
                  contactPhone={contact.phone}
                  contactEmail={contact.email}
                  agentFirstName={agentFirstName}
                  campaignId={camp?.id ?? null}
                />
                <CallTimeline callId={state.currentCallId} />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* COL 2 — Live transcript */}
            <ResizablePanel defaultSize={38} minSize={26} className="bg-white border-r border-[#E5E7EB] overflow-hidden">
              <LiveTranscriptPane
                durationSec={liveDuration}
                contactId={contact.id}
                callId={state.currentCallId}
                agentFirstName={agentFirstName}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* COL 3 — Call script */}
            <ResizablePanel defaultSize={22} minSize={14} className="border-r border-[#E5E7EB] overflow-hidden">
              <CallScriptPane
                callId={state.currentCallId}
                contactFirstName={contactFirstName}
                agentFirstName={agentFirstName}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* COL 4 — Glossary */}
            <ResizablePanel defaultSize={20} minSize={14} className="overflow-hidden">
              <TerminologyPane />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}

      {/* ─── FLOATING PAD (always visible, z-[210]) ─── */}
      <div className="fixed z-[210] select-text" style={{ left: pos.x, top: pos.y, width: PAD_W }}>
        {minimized ? (
          // Minimized header bar
          <div
            onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}
            className="flex items-center gap-2 px-2 py-1.5 bg-white border border-[#E5E7EB] rounded-[12px] shadow-[0_12px_28px_rgba(30,154,128,0.35)] cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-3 h-3 text-[#9CA3AF] shrink-0" />
            <span className="text-[11px] font-semibold text-[#1A1A1A] truncate flex-1">
              {state.currentLead?.name ?? 'Dialer Pro'}
            </span>
            {isLive && <span className="w-2 h-2 rounded-full bg-[#1E9A80] animate-pulse shrink-0" />}
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => setMinimized(false)} className="p-0.5 rounded hover:bg-[#F3F3EE] text-[#6B7280]">
              <PlayCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : isLive && state.currentLead ? (
          // ─── CARD 1 — GHL-style calling card (during live call) ───
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.18)] overflow-hidden" style={{ width: 320 }}>
            {/* Header — outgoing call */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F3F3EE] border-b border-[#E5E7EB]">
              <Phone className="w-4 h-4 text-[#1E9A80]" />
              <span className="text-[12px] font-semibold text-[#6B7280]">
                {state.phase === 'connected' ? 'Connected' : 'Outgoing Call'}
              </span>
              {camp && <span className="text-[11px] text-[#9CA3AF] truncate ml-auto">{camp.name}</span>}
            </div>

            {/* Avatar + lead info + timer */}
            <div className="flex flex-col items-center py-5 px-4">
              <div className="w-20 h-20 rounded-full bg-[#1E9A80] flex items-center justify-center text-white text-[28px] font-bold mb-3">
                {(state.currentLead.name ?? '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="text-[15px] font-semibold text-[#1A1A1A] truncate max-w-full">{state.currentLead.name}</div>
              <div className="text-[13px] text-[#6B7280] tabular-nums mt-0.5">{state.currentLead.phone}</div>
              <div className="text-[18px] font-semibold text-[#1A1A1A] tabular-nums mt-2">
                {state.phase === 'connected' ? formatDurationPro(liveDuration) : (
                  <span className="inline-flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
            </div>

            {/* Action button rows */}
            <div className="px-3 pb-2 space-y-1.5">
              {/* Row 1: Message, Notes, Blind, Warm */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Message', icon: MessageSquare, onClick: () => {/* MidCallSmsSender in LiveCallScreen COL1 */} },
                  { label: 'Notes', icon: FileText, onClick: () => {/* Notes available in LiveCallScreen */} },
                  { label: 'Blind', icon: PhoneForwarded, disabled: true },
                  { label: 'Warm', icon: PhoneForwarded, disabled: true },
                ].map(({ label, icon: Ic, onClick, disabled: dis }) => (
                  <button key={label} onClick={onClick} disabled={dis}
                    className={cn('flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium transition-colors',
                      dis ? 'text-[#9CA3AF] cursor-not-allowed' : 'text-[#6B7280] hover:bg-[#F3F3EE] hover:text-[#1A1A1A]'
                    )}>
                    <Ic className="w-4 h-4" strokeWidth={1.8} />
                    {label}
                  </button>
                ))}
              </div>
              {/* Row 2: Hold, Mute, Scripts, Dial */}
              <div className="grid grid-cols-4 gap-1.5">
                <button onClick={machine.holdToggle}
                  className={cn('flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium transition-colors',
                    state.isOnHold ? 'bg-[#FEF3C7] text-[#92400E]' : 'text-[#6B7280] hover:bg-[#F3F3EE] hover:text-[#1A1A1A]'
                  )}>
                  <PauseIcon className="w-4 h-4" strokeWidth={1.8} />
                  Hold
                </button>
                <button onClick={machine.muteToggle}
                  className={cn('flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium transition-colors',
                    state.isMuted ? 'bg-[#FEF3C7] text-[#92400E]' : 'text-[#6B7280] hover:bg-[#F3F3EE] hover:text-[#1A1A1A]'
                  )}>
                  {state.isMuted ? <MicOff className="w-4 h-4" strokeWidth={1.8} /> : <Mic className="w-4 h-4" strokeWidth={1.8} />}
                  Mute
                </button>
                <button className="flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium text-[#6B7280] hover:bg-[#F3F3EE] hover:text-[#1A1A1A] transition-colors">
                  <FileText className="w-4 h-4" strokeWidth={1.8} />
                  Scripts
                </button>
                <button className="flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium text-[#9CA3AF] cursor-not-allowed">
                  <Hash className="w-4 h-4" strokeWidth={1.8} />
                  Dial
                </button>
              </div>
            </div>

            {/* End Call button */}
            <div className="px-3 pb-3">
              <button onClick={() => void machine.hangUp()}
                className="w-full flex items-center justify-center gap-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-[14px] font-semibold py-3 rounded-xl transition-colors">
                <PhoneOff className="w-4 h-4" /> End Call
              </button>
            </div>
          </div>
        ) : (
          // ─── DEFAULT PAD — idle / paused / campaign + queue + history ───
          <div className="bg-[#F3F3EE] border border-[#E5E7EB] rounded-[20px] shadow-[0_24px_64px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col max-h-[calc(100vh-96px)]">
            {/* Header */}
            <div
              onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}
              className="px-2 py-1.5 bg-white border-b border-[#E5E7EB] flex items-center gap-1.5 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-3 h-3 text-[#9CA3AF]" />
              <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                <span className="text-[11px] font-bold text-[#1A1A1A]">Dialer Pro</span>
                {camp && <span className="text-[11px] text-[#6B7280] truncate">· {camp.name}</span>}
              </div>
              <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => setMinimized(true)} className="p-1 rounded hover:bg-[#F3F3EE] text-[#6B7280]">
                <Minus className="w-3 h-3" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {/* Block banner */}
              {blocked && blockReason && (
                <div className="bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-[11px] rounded-[10px] px-2.5 py-1.5">{blockReason}</div>
              )}

              {/* Campaign + KPI strip */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-2 space-y-1.5">
                {campaigns.length > 1 && (
                  <select value={activeCampaignId} onChange={(e) => setActiveCampaignId(e.target.value)}
                    className="w-full text-[10px] border border-[#E5E7EB] rounded-[8px] px-1.5 py-1 bg-white"
                  >
                    {campaigns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                )}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Pending', value: kpis.pending, accent: true },
                    { label: 'Total', value: kpis.total },
                    { label: 'MSG Sent', value: kpis.msgSent },
                    { label: 'Dials 24h', value: kpis.dials24h },
                  ].map((s) => (
                    <div key={s.label} className={cn('rounded-[8px] px-1.5 py-1 text-center', s.accent ? 'bg-[#ECFDF5]' : 'bg-[#F3F3EE]')}>
                      <div className="text-[8px] uppercase tracking-wide text-[#9CA3AF] font-semibold leading-none">{s.label}</div>
                      <div className={cn('text-[14px] font-bold tabular-nums leading-tight mt-0.5', s.accent ? 'text-[#1E9A80]' : 'text-[#1A1A1A]')}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pacing controls — only when idle */}
              {!isCallContext && (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">Pacing</span>
                  <div className="inline-flex rounded-[10px] border border-[#E5E7EB] overflow-hidden">
                    <button onClick={() => setPacing('manual')} className={cn('px-3 py-1', pacing === 'manual' ? 'bg-[#1E9A80] text-white' : 'bg-white hover:bg-[#F3F3EE]')}>Manual</button>
                    <button onClick={() => setPacing('auto')} className={cn('px-3 py-1', pacing === 'auto' ? 'bg-[#1E9A80] text-white' : 'bg-white hover:bg-[#F3F3EE]')}>Auto</button>
                  </div>
                  {pacing === 'auto' && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#6B7280]">delay</span>
                      {[0, 5, 10, 30].map((s) => (
                        <button key={s} onClick={() => setPacingDelaySec(s)}
                          className={cn('px-2 py-0.5 rounded-full font-semibold', pacingDelaySec === s ? 'bg-[#ECFDF5] text-[#1E9A80]' : 'text-[#6B7280] hover:bg-[#F3F3EE]')}
                        >{s}s</button>
                      ))}
                    </div>
                  )}
                  {state.phase === 'paused' && (
                    <div className="ml-auto flex items-center gap-1">
                      <button onClick={() => void resumeDialer()}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-[#1E9A80] px-2 py-1.5 rounded-[8px]">
                        <Play className="w-3 h-3" /> Resume
                      </button>
                      <button onClick={() => void machine.stop()}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B91C1C] bg-white border border-[#FECACA] hover:bg-[#FEF2F2] px-2 py-1.5 rounded-[8px]">
                        <Square className="w-3 h-3" /> Stop
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Pacing countdown */}
              {state.pacingDeadlineMs !== null && state.phase === 'idle' && (
                <PacingCountdown deadlineMs={state.pacingDeadlineMs} onDialNow={() => void dialNow()} onPause={machine.pause} />
              )}

              {/* Start / Resume / Dial buttons */}
              {!state.sessionStarted && state.phase === 'idle' && (
                <button onClick={() => void startDialer()} disabled={blocked || !camp}
                  className="w-full inline-flex items-center justify-center gap-2 text-[12px] font-semibold text-white bg-[#1E9A80] hover:bg-[#1E9A80]/90 px-3 py-2 rounded-2xl shadow-[0_4px_16px_rgba(30,154,128,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
                  <Phone className="w-3 h-3" /> Start power dialer
                </button>
              )}
              {state.sessionStarted && state.phase === 'idle' && state.pacingDeadlineMs === null && (
                <button onClick={() => void dialNow()} disabled={blocked}
                  className="w-full inline-flex items-center justify-center gap-2 text-[11px] font-semibold text-white bg-[#1E9A80] hover:bg-[#1E9A80]/90 px-3 py-2 rounded-2xl shadow-[0_4px_16px_rgba(30,154,128,0.35)] disabled:opacity-50 disabled:cursor-not-allowed">
                  <Phone className="w-3 h-3" /> Dial next lead
                </button>
              )}
              {state.phase === 'paused' && (
                <button onClick={() => void resumeDialer()} disabled={blocked}
                  className="w-full inline-flex items-center justify-center gap-2 text-[11px] font-semibold text-white bg-[#1E9A80] hover:bg-[#1E9A80]/90 px-3 py-2 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed">
                  <Play className="w-3 h-3" /> Resume
                </button>
              )}

              {/* Queue accordion */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setAccordion((p) => p === 'queue' ? 'peek' : 'queue')}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#F3F3EE]/50"
                >
                  <span className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold">Queue</span>
                  <span className="text-[10px] text-[#6B7280] tabular-nums">{queue.length}</span>
                </button>
                {accordion !== 'history' && (
                  <div className="border-t border-[#E5E7EB]">
                    <QueueManagerPro
                      queue={queue}
                      campaignId={camp?.id ?? null}
                      onRefresh={refreshQueue}
                    />
                  </div>
                )}
              </div>

              {/* Call history accordion */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setAccordion((p) => p === 'history' ? 'peek' : 'history')}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#F3F3EE]/50"
                >
                  <span className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold">Call history</span>
                </button>
                {accordion !== 'queue' && (
                  <div className="border-t border-[#E5E7EB]">
                    <CallHistoryPro />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── GHL-STYLE WRAP-UP FLOATING CARD (Card 2) ─── */}
      {state.phase === 'wrap_up' && state.currentLead && (
        <WrapUpCard
          lead={state.currentLead}
          callId={state.currentCallId}
          endReason={state.endReason}
          durationSec={state.durationSec}
          notes={notes}
          setNotes={setNotes}
          onSkip={() => {
            if (state.currentLead) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              void (supabase.from('wk_dialer_queue' as any) as any).update({ status: 'skipped' }).eq('id', state.currentLead.queueRowId);
            }
            machine.dispatch({ type: 'OUTCOME_DONE' });
          }}
          onRedial={() => { if (state.currentLead) void machine.dialLead(state.currentLead); }}
          onNext={() => {
            machine.dispatch({ type: 'OUTCOME_DONE' });
            setTimeout(async () => {
              const next = await machine.pickNextLead(queue);
              if (next) void machine.dialLead(next);
              else onToast('Queue empty', 'info');
            }, 200);
          }}
          onPause={machine.pause}
          onToast={onToast}
        />
      )}

      {/* Edit contact modal */}
      {editing && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999]">
          <EditContactModal
            contact={editing}
            onClose={() => setEditing(null)}
            onSave={async (updated) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.from('wk_contacts' as any) as any)
                .update({
                  name: updated.name || null, phone: updated.phone,
                  email: updated.email || null, pipeline_column_id: updated.pipelineColumnId || null,
                  owner_agent_id: updated.ownerAgentId || null, is_hot: updated.isHot,
                  deal_value_pence: updated.dealValuePence ?? null, custom_fields: updated.customFields,
                }).eq('id', updated.id);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.from('wk_contact_tags' as any) as any).delete().eq('contact_id', updated.id);
              if (updated.tags.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from('wk_contact_tags' as any) as any)
                  .insert(updated.tags.map((t) => ({ contact_id: updated.id, tag: t })));
              }
              setEditing(null);
              setContact(updated);
            }}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── PacingCountdown ─────────────────────────────────────────────────

function PacingCountdown({ deadlineMs, onDialNow, onPause }: { deadlineMs: number; onDialNow: () => void; onPause: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  const remainingSec = Math.max(0, Math.ceil((deadlineMs - now) / 1000));
  return (
    <div className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] rounded-2xl px-3 py-2 flex items-center gap-2 text-[11px] font-semibold">
      <Clock className="w-3 h-3" /> Next in {remainingSec}s
      <button onClick={onDialNow} className="inline-flex items-center gap-1 ml-1 px-2 py-1 rounded-[10px] bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90">
        <Zap className="w-3 h-3" /> Dial now
      </button>
      <button onClick={onPause} className="inline-flex items-center gap-1 ml-auto px-2 py-1 rounded-[10px] bg-white border border-[#A7F3D0] text-[#065F46] hover:bg-[#F0FDF4]">
        <PauseIcon className="w-3 h-3" /> Pause
      </button>
    </div>
  );
}

// ─── WrapUpCard — GHL-style floating card (Card 2) ──────────────────

import { Circle } from 'lucide-react';

const PIPELINE_STAGES = [
  'New Leads',
  'Voicemail',
  'No pickup',
  'Not interested',
  'Nurturing (msg sent)',
  'Closed',
] as const;

interface WrapUpCardProps {
  lead: QueueLead;
  callId: string | null;
  endReason: string | null;
  durationSec: number | null;
  notes: string;
  setNotes: (v: string) => void;
  onSkip: () => void;
  onRedial: () => void;
  onNext: () => void;
  onPause: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

function WrapUpCard({ lead, callId, endReason, durationSec, notes, setNotes, onSkip, onRedial, onNext, onPause, onToast }: WrapUpCardProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const formatMin = (sec: number | null) => {
    if (sec === null || sec <= 0) return '00 Min 00 Sec';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')} Min ${String(s).padStart(2, '0')} Sec`;
  };

  const submitOutcome = async (outcome: string) => {
    if (submitting || picked) return;
    setPicked(outcome);
    setSubmitting(true);
    try {
      await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callId ? (supabase.from('wk_calls' as any) as any).update({ disposition: outcome, agent_note: notes.trim() || null }).eq('id', callId) : Promise.resolve(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_contacts' as any) as any).update({ pipeline_stage: outcome }).eq('id', lead.contactId),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_dialer_queue' as any) as any).update({ status: 'done' }).eq('id', lead.queueRowId),
      ]);
      onToast('Outcome saved', 'success');
    } catch (e) {
      onToast(`Outcome failed: ${e instanceof Error ? e.message : 'unknown'}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-[340px] bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.18)] border border-[#E5E7EB] z-[220] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E5E7EB]/60">
        <Phone className="text-[#1E9A80] w-5 h-5" />
        <span className="font-semibold text-[#1A1A1A]">Call Summary</span>
      </div>

      {/* Lead info + status badges + duration */}
      <div className="px-4 py-3 border-b border-[#E5E7EB]/60">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[#1A1A1A] truncate">{lead.name}</span>
          <span className="text-[#9CA3AF] text-sm tabular-nums">{lead.phone}</span>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-[#B91C1C] text-[12px]">
            <PhoneOff className="w-3.5 h-3.5" /> Call Ended
          </span>
          {endReason && (
            <span className="flex items-center gap-1 text-[#6B7280] text-[11px] bg-[#F3F3EE] rounded-full px-2 py-0.5">
              {endReason === 'hangup' ? 'Hangup' : endReason === 'cancel' || endReason === 'reject' ? 'No-answer' : endReason}
            </span>
          )}
        </div>
        <div className="text-center mt-2">
          <span className="inline-block bg-[#F3F3EE] text-[#6B7280] text-[13px] font-medium px-4 py-1 rounded-full">
            {formatMin(durationSec)}
          </span>
        </div>
      </div>

      {/* Skip button */}
      <div className="px-4 pt-3 pb-1">
        <button
          onClick={onSkip}
          disabled={submitting}
          className="flex items-center gap-1.5 text-[12px] font-medium text-[#6B7280] hover:text-[#1A1A1A] disabled:opacity-50"
        >
          <SkipForward className="w-3.5 h-3.5" /> Skip (no disposition)
        </button>
      </div>

      {/* Disposition grid */}
      <div className="px-4 py-2">
        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Custom Disposition</p>
        <div className="grid grid-cols-2 gap-2">
          {PIPELINE_STAGES.map((stage) => {
            const isPicked = picked === stage;
            return (
              <button
                key={stage}
                onClick={() => void submitOutcome(stage)}
                disabled={submitting || (picked !== null && !isPicked)}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] font-medium text-left transition-all',
                  isPicked
                    ? 'bg-[#1A1A1A] text-white'
                    : picked !== null
                      ? 'bg-[#F3F3EE] text-[#9CA3AF] cursor-not-allowed'
                      : 'bg-[#F3F3EE] text-[#1A1A1A] hover:bg-[#E5E7EB]'
                )}
              >
                <span className="truncate">{stage}</span>
                <Circle className={cn('w-4 h-4 flex-shrink-0', isPicked ? 'text-white fill-white' : 'text-[#9CA3AF]')} strokeWidth={isPicked ? 0 : 1.5} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="px-4 pb-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)…"
          className="w-full text-[13px] border border-[#E5E7EB] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30 focus:border-[#1E9A80]"
          rows={2}
        />
      </div>

      {/* Action buttons: Redial / Next → / Pause */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={onRedial}
          className="flex items-center gap-1.5 border border-[#E5E7EB] rounded-lg px-4 py-2 text-[13px] font-medium text-[#6B7280] hover:bg-[#F3F3EE]"
        >
          <Phone className="w-4 h-4" /> Redial
        </button>
        <button
          onClick={() => {
            if (picked) onNext();
            else { onSkip(); setTimeout(onNext, 100); }
          }}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#1E9A80] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#1E9A80]/90 shadow-[0_4px_12px_rgba(30,154,128,0.35)]"
        >
          Next call →
        </button>
        <button
          onClick={onPause}
          className="border border-[#FECACA] text-[#B91C1C] rounded-lg px-3 py-2 hover:bg-[#FEF2F2]"
        >
          <PauseIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
