import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Phone, PhoneOff, Mic, MicOff, Pause as PauseIcon, Play, Square,
  SkipForward, Zap, CheckCircle2, Loader2, Clock, Radio, Pencil, X,
  Minus, GripVertical, PlayCircle, Flame, Minimize2,
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

  // ─── LiveCallScreen visible when we have a lead ────────────────────
  const showCallScreen = state.currentLead !== null && (isLive || state.phase === 'wrap_up');

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

            {/* COL 2 — Transcript (live) or PostCall (wrap_up) */}
            <ResizablePanel defaultSize={38} minSize={26} className="bg-white border-r border-[#E5E7EB] overflow-hidden">
              {(state.phase === 'dialing' || state.phase === 'ringing' || state.phase === 'connected') ? (
                <LiveTranscriptPane
                  durationSec={liveDuration}
                  contactId={contact.id}
                  callId={state.currentCallId}
                  agentFirstName={agentFirstName}
                />
              ) : (
                // Wrap-up: outcome grid in COL 2 (clone of PostCallPanel)
                <div className="flex flex-col h-full">
                  <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1E9A80]" />
                    <span className="text-[13px] font-semibold text-[#1A1A1A]">
                      Call ended · {state.currentLead?.name} · Recording saved
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-3">
                      Pick an outcome — pipeline columns
                    </div>
                    <PostCallGrid
                      columns={outcomeColumns}
                      applying={machine.applying}
                      onApply={(id) => void machine.applyOutcome(id, notes.trim() || undefined)}
                    />
                    <div className="mt-5">
                      <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1.5">Quick note</div>
                      <input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add a note (optional)…"
                        className="w-full px-3 py-2 text-[13px] bg-white border border-[#E5E5E5] rounded-[10px] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30 focus:border-[#1E9A80]"
                      />
                    </div>
                  </div>
                  {/* Footer with Redial / Next / Pause */}
                  <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F3F3EE]/50 flex items-center gap-3">
                    <div className="flex-1 text-[10px] text-[#9CA3AF]">
                      ⌨ 1–9 · S skip · P pause · N next call
                    </div>
                    <button
                      onClick={() => {
                        if (state.currentLead) void machine.dialLead(state.currentLead);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] hover:bg-white"
                    >
                      <Phone className="w-3.5 h-3.5" /> Redial
                    </button>
                    <button
                      onClick={machine.skip}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] hover:bg-white"
                    >
                      <SkipForward className="w-3.5 h-3.5" /> Skip
                    </button>
                    <button
                      onClick={() => {
                        machine.skip();
                        setTimeout(async () => {
                          const next = await machine.pickNextLead(queue);
                          if (next) void machine.dialLead(next);
                          else onToast('Queue empty', 'info');
                        }, 200);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#1E9A80] text-white text-[12px] font-semibold hover:bg-[#1E9A80]/90 shadow-[0_4px_12px_rgba(30,154,128,0.35)]"
                    >
                      <Phone className="w-3.5 h-3.5" /> Next call
                    </button>
                    <button
                      onClick={machine.pause}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] hover:bg-white"
                    >
                      <PauseIcon className="w-3.5 h-3.5" /> Pause
                    </button>
                  </div>
                </div>
              )}
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
        ) : (
          // Expanded floating pad
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
                {isLive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1E9A80] animate-pulse" />}
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

              {/* Control bar */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                {isCallContext ? (
                  <>
                    <Radio className="w-3 h-3 text-[#1E9A80] flex-shrink-0" />
                    <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide',
                      state.phase === 'connected' ? 'bg-[#ECFDF5] text-[#1E9A80]' :
                      state.phase === 'wrap_up' ? 'bg-[#F3F3EE] text-[#6B7280]' :
                      state.phase === 'paused' ? 'bg-[#F3F3EE] text-[#6B7280]' :
                      'bg-[#FEF3C7] text-[#92400E]'
                    )}>
                      {state.phase === 'dialing' ? 'DIALING' : state.phase === 'ringing' ? 'RINGING' : state.phase === 'connected' ? 'CONNECTED' : state.phase === 'wrap_up' ? 'WRAP-UP' : 'PAUSED'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-[#1A1A1A] truncate">{state.currentLead?.name ?? '—'}</div>
                      <div className="text-[10px] text-[#6B7280] tabular-nums truncate">
                        {state.currentLead?.phone ?? '—'}
                        {state.startedAt && state.phase === 'connected' && <span> · {formatDurationPro(liveDuration)}</span>}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
                <div className="ml-auto flex items-center gap-1">
                  {isLive && (
                    <>
                      <button onClick={machine.muteToggle} title={state.isMuted ? 'Unmute' : 'Mute'}
                        className={cn('inline-flex items-center justify-center w-7 h-7 rounded-[8px] border',
                          state.isMuted ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]' : 'bg-white border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F3F3EE]'
                        )}>
                        {state.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      </button>
                      <button onClick={() => void machine.hangUp()}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-[#B91C1C] px-2 py-1.5 rounded-[8px] hover:bg-[#991B1B]">
                        <PhoneOff className="w-3 h-3" /> Hang up
                      </button>
                    </>
                  )}
                  {isCallContext && state.phase !== 'paused' && (
                    <button onClick={() => void dialNextManual()}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] hover:bg-[#F3F3EE] px-2 py-1.5 rounded-[8px]">
                      <SkipForward className="w-3 h-3" /> Skip
                    </button>
                  )}
                  {state.phase === 'paused' ? (
                    <button onClick={() => void resumeDialer()}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-[#1E9A80] px-2 py-1.5 rounded-[8px]">
                      <Play className="w-3 h-3" /> Resume
                    </button>
                  ) : isCallContext && (
                    <button onClick={machine.pause}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] hover:bg-[#F3F3EE] px-2 py-1.5 rounded-[8px]">
                      <PauseIcon className="w-3 h-3" /> Pause
                    </button>
                  )}
                  {(state.sessionStarted || isCallContext) && (
                    <button onClick={() => void machine.stop()}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B91C1C] bg-white border border-[#FECACA] hover:bg-[#FEF2F2] px-2 py-1.5 rounded-[8px]">
                      <Square className="w-3 h-3" /> Stop
                    </button>
                  )}
                </div>
              </div>

              {/* Wrap-up card (in the pad, compact outcome buttons) */}
              {state.phase === 'wrap_up' && state.currentLead && (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3 space-y-2">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
                        Wrap-up · {state.currentLead.name} · {state.currentLead.phone}
                      </div>
                      <div className="text-[10px] text-[#6B7280]">
                        Call {state.endReason}{state.error ? ` — ${state.error}` : ''}
                      </div>
                    </div>
                    <button onClick={machine.skip} disabled={machine.applying}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B7280] hover:text-[#1A1A1A] bg-[#F3F3EE] hover:bg-[#E5E7EB] px-2 py-1 rounded-[10px] disabled:opacity-50">
                      <SkipForward className="w-3 h-3" /> Skip
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {outcomeColumns.length === 0 && (
                      <div className="col-span-full text-[11px] text-[#9CA3AF] italic py-1.5">No outcome columns. Ask admin to add stages.</div>
                    )}
                    {outcomeColumns.map((c) => (
                      <button key={c.id} disabled={machine.applying} onClick={() => void machine.applyOutcome(c.id, notes.trim() || undefined)}
                        className="inline-flex items-center justify-between gap-1.5 text-[11px] font-medium text-[#1A1A1A] bg-[#F3F3EE] hover:bg-[#ECFDF5] hover:text-[#1E9A80] px-2 py-1.5 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <span className="truncate">{c.name}</span>
                        {machine.applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 opacity-40" />}
                      </button>
                    ))}
                  </div>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)…" rows={2}
                    className="w-full text-[11px] border border-[#E5E7EB] rounded-[10px] px-2 py-1.5 bg-white" />
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
                      queue={accordion === 'queue' ? queue : queue.slice(0, 3)}
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
                    <CallHistoryPro campaignId={null} agentId={userId} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

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

// ─── PostCallGrid (COL 2 outcome buttons — clone of PostCallPanel) ──────

import { Sparkles, type LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles, Clock, PhoneMissed: Phone, X, Voicemail: Phone, Ban: X,
};

function PostCallGrid({
  columns, applying, onApply,
}: {
  columns: { id: string; name: string; position: number; colour: string | null; icon: string | null }[];
  applying: boolean;
  onApply: (columnId: string) => void;
}) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleClick = (colId: string) => {
    if (submitted) return;
    setPickedId(colId);
    setSubmitted(true);
    setTimeout(() => onApply(colId), 200);
  };

  // Keyboard shortcuts 1-9
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (submitted) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9 && num <= columns.length) {
        const col = columns.find((c) => c.position === num);
        if (col) handleClick(col.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, columns]);

  return (
    <div className="grid grid-cols-2 gap-3">
      {columns.map((col) => {
        const isPicked = submitted && pickedId === col.id;
        const isDimmed = submitted && pickedId !== col.id;
        return (
          <button
            key={col.id}
            onClick={() => handleClick(col.id)}
            disabled={submitted}
            className={cn(
              'relative group p-3 rounded-2xl border-2 text-left bg-white transition-all',
              isPicked
                ? 'border-[#1E9A80] border-[3px] bg-[#ECFDF5] shadow-[0_8px_28px_rgba(30,154,128,0.45)] cursor-default ring-2 ring-[#1E9A80]/20'
                : isDimmed
                  ? 'border-[#E5E7EB] opacity-25 grayscale cursor-not-allowed'
                  : 'border-[#E5E7EB] hover:border-[#1E9A80]/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
            )}
          >
            {isPicked && (
              <>
                <span className="absolute -top-2 -right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F59E0B] text-white text-[10px] font-bold uppercase tracking-wide shadow-md">✓ DONE</span>
                <span className="absolute bottom-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#1E9A80] text-white text-[16px] font-bold shadow-md">✓</span>
              </>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${col.colour ?? '#9CA3AF'}1A`, color: col.colour ?? '#9CA3AF' }}>
                <Sparkles className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#9CA3AF] tabular-nums">{col.position}.</span>
                <span className={cn('text-[14px] font-semibold truncate', isPicked ? 'text-[#1E9A80]' : 'text-[#1A1A1A]')}>{col.name}</span>
              </div>
            </div>
          </button>
        );
      })}
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
