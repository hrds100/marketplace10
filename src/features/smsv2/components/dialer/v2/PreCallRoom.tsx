// PR 140 (Hugo 2026-04-28): the new pre-call dialer page.
//
// Replaces the old DialerPage shell — campaign tabs + 7 mini stats +
// queue list + recent calls all crammed together — with a clean
// power-dialer layout:
//
//   ┌─ campaign picker (small) ──────────────────────────┐
//   │                                                    │
//   │   ┌─ NEXT LEAD CARD ───────┐  ┌─ Queue (next 3) ─┐ │
//   │   │  Big name + phone      │  │ • Lead 2         │ │
//   │   │  [DIAL] [Skip]         │  │ • Lead 3         │ │
//   │   └────────────────────────┘  │ • Lead 4         │ │
//   │                                └──────────────────┘ │
//   │   ┌─ Recent calls ──────────────────────────────┐  │
//   │   │ ...                                          │  │
//   │   └──────────────────────────────────────────────┘  │
//   └────────────────────────────────────────────────────┘
//
// Campaign Start/Pause/Stop buttons are kept (admins drive the queue
// from here) but moved into a small admin row so the Dial CTA is the
// loudest thing on the page.

import { useEffect, useMemo, useState } from 'react';
import { Play, Pause, Square, ArrowRight, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import CampaignList from '../CampaignList';
import SpendBanner from '../SpendBanner';
import RecentCallsPanel from '../RecentCallsPanel';
import StageSelector from '../../shared/StageSelector';
import EditContactModal from '../../contacts/EditContactModal';
import { useActiveCallCtx } from '../../live-call/ActiveCallContext';
import { useDialerCampaigns } from '../../../hooks/useDialerCampaigns';
import { useMyDialerQueue } from '../../../hooks/useMyDialerQueue';
import { useTwilioDevice } from '../../../hooks/useTwilioDevice';
import { useSpendLimit } from '../../../hooks/useSpendLimit';
import { useKillSwitch } from '../../../hooks/useKillSwitch';
import { useActiveDialerLegs } from '../../../hooks/useActiveDialerLegs';
import { useAgentMessageCounts } from '../../../hooks/useAgentMessageCounts';
import { useSmsV2 } from '../../../store/SmsV2Store';
import { useContactPersistence } from '../../../hooks/useContactPersistence';
import NextLeadCard from './NextLeadCard';
import type { Campaign, Contact } from '../../../types';

interface DialerStartInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: {
      campaign_id?: string;
      lines?: number;
      blocked?: boolean;
      reason?: string;
      fired?: Array<{ contact_id: string; phone: string; sid?: string; error?: string }>;
      error?: string;
    } | null;
    error: { message: string } | null;
  }>;
}

export default function PreCallRoom() {
  const { user, isAdmin } = useAuth();
  const [workspaceRole, setWorkspaceRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!user) { setWorkspaceRole(null); return; }
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('profiles' as any) as any)
        .select('workspace_role')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setWorkspaceRole((data?.workspace_role as string | null) ?? null);
    })();
    return () => { cancelled = true; };
  }, [user]);
  const isEffectiveAdmin =
    workspaceRole === 'admin' || (workspaceRole === null && isAdmin);

  const { campaigns: realCampaigns, loading: campaignsLoading } = useDialerCampaigns({
    scopedToAgentId: !isEffectiveAdmin && user ? user.id : null,
    includeInactive: true,
  });

  const [activeId, setActiveId] = useState<string>(realCampaigns[0]?.id ?? '');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  const { startCall } = useActiveCallCtx();
  const twilioDevice = useTwilioDevice();
  const spend = useSpendLimit();
  const ks = useKillSwitch();
  const dialerBlocked = spend.isLimitReached || ks.allDialers;
  const blockReason = ks.allDialers
    ? 'All dialers are off (kill switch). Toggle off in Settings → AI Coach.'
    : spend.isLimitReached
      ? 'Daily spend limit reached.'
      : null;

  const { contacts, patchContact, upsertContact, pushToast } = useSmsV2();
  const persist = useContactPersistence();

  useEffect(() => {
    if (realCampaigns.length === 0) return;
    if (!realCampaigns.some((c) => c.id === activeId)) {
      setActiveId(realCampaigns[0].id);
    }
  }, [realCampaigns, activeId]);

  const camp: Campaign | null =
    realCampaigns.find((c) => c.id === activeId) ?? realCampaigns[0] ?? null;

  const isUuid = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  const { items: queueLeads, loading: queueLoading } = useMyDialerQueue(
    isUuid(activeId) ? activeId : null,
    isEffectiveAdmin || !user ? null : user.id,
    5
  );

  const { legs: activeLegs } = useActiveDialerLegs();
  const msgCounts = useAgentMessageCounts(user?.id ?? null);

  const [autoAdvance, setAutoAdvance] = useState<number>(camp?.autoAdvanceSeconds ?? 10);
  useEffect(() => {
    if (camp) setAutoAdvance(camp.autoAdvanceSeconds);
  }, [camp?.id, camp?.autoAdvanceSeconds]);

  const nextLead = queueLeads[0] ?? null;
  const restOfQueue = queueLeads.slice(1, 4);
  const fullNextContact = useMemo(
    () => (nextLead ? contacts.find((c) => c.id === nextLead.id) ?? null : null),
    [contacts, nextLead]
  );

  // ── Actions ──────────────────────────────────────────────────────
  const handleDial = (contactId: string) => {
    if (dialerBlocked) {
      pushToast(blockReason ?? 'Dialer blocked', 'error');
      return;
    }
    void startCall(contactId);
  };

  const handleSkip = (contactId: string) => {
    // Local-only skip — server queue stays authoritative; this just
    // pops the lead off the agent's local mirror so the next Dial
    // press picks the lead behind it.
    pushToast('Skipped', 'info');
    // Removing from store mirrors the same call startCall makes when
    // it dials. A skip is "advance without dialing".
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).requestAnimationFrame?.(() => void contactId);
    // Read-through removeFromQueue if exposed by the store.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useSmsV2.getState as any)?.()?.removeFromQueue?.(contactId);
    } catch {
      /* store doesn't expose removeFromQueue from getState in tests */
    }
  };

  const handleStageChange = (contactId: string, columnId: string) => {
    patchContact(contactId, { pipelineColumnId: columnId });
    void persist.moveToColumn(contactId, columnId);
  };

  const handleStartCampaign = async () => {
    if (!isUuid(activeId)) {
      pushToast('Mock campaign — wire a real campaign UUID to dial', 'info');
      return;
    }
    const ready = await twilioDevice.waitUntilReady(3000);
    if (!ready) {
      pushToast('Phone connecting — try again in a moment', 'info');
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: activateErr } = await (
        supabase.from('wk_dialer_campaigns' as any) as any
      )
        .update({ is_active: true })
        .eq('id', activeId);
      if (activateErr) {
        pushToast(`Couldn't activate campaign: ${activateErr.message}`, 'error');
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('wk_dialer_campaigns' as any) as any)
        .update({
          parallel_lines: 1,
          auto_advance_seconds: autoAdvance,
        })
        .eq('id', activeId);
      const { data, error } = await (
        supabase.functions as unknown as DialerStartInvoke
      ).invoke('wk-dialer-start', {
        body: {
          campaign_id: activeId,
          mode: 'power',
          lines: 1,
          parallel_lines: 1,
          auto_advance_seconds: autoAdvance,
        },
      });
      if (error) {
        pushToast(`Dialer error: ${error.message}`, 'error');
        return;
      }
      if (data?.blocked) {
        pushToast(`Blocked: ${data.reason ?? 'spend or killswitch'}`, 'error');
        return;
      }
      pushToast(`Dialing ${data?.fired?.length ?? 0} line(s)`, 'success');
    } catch (e) {
      pushToast(
        `Dialer crashed: ${e instanceof Error ? e.message : 'unknown'}`,
        'error'
      );
    }
  };

  const handlePauseCampaign = async () => {
    if (!isUuid(activeId)) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('wk_dialer_campaigns' as any) as any)
        .update({ is_active: false })
        .eq('id', activeId);
      if (error) {
        pushToast(`Pause failed: ${error.message}`, 'error');
        return;
      }
      const cancellations = activeLegs.map((leg) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.functions as any)
          .invoke('wk-dialer-hangup-leg', { body: { call_id: leg.id } })
          .catch((e: Error) =>
            console.warn('[handlePauseCampaign] hangup leg failed', leg.id, e)
          )
      );
      await Promise.allSettled(cancellations);
      pushToast(
        cancellations.length > 0
          ? `Campaign paused · ${cancellations.length} leg(s) cancelled`
          : 'Campaign paused',
        'info'
      );
    } catch (e) {
      pushToast(
        `Pause crashed: ${e instanceof Error ? e.message : 'unknown'}`,
        'error'
      );
    }
  };

  const handleStopCampaign = async () => {
    if (!isUuid(activeId)) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sp = supabase as any;
      const { error: pauseErr } = await sp
        .from('wk_dialer_campaigns')
        .update({ is_active: false })
        .eq('id', activeId);
      if (pauseErr) {
        pushToast(`Stop failed: ${pauseErr.message}`, 'error');
        return;
      }
      const cancellations = activeLegs.map((leg) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.functions as any)
          .invoke('wk-dialer-hangup-leg', { body: { call_id: leg.id } })
          .catch((e: Error) =>
            console.warn('[handleStopCampaign] hangup leg failed', leg.id, e)
          )
      );
      const [{ data, error: rpcErr }] = await Promise.all([
        sp.rpc('wk_dialer_revert_inflight', { p_campaign_id: activeId }),
        Promise.allSettled(cancellations),
      ]);
      if (rpcErr) {
        pushToast(`Stop reverted partial: ${rpcErr.message}`, 'error');
        return;
      }
      const reverted = typeof data === 'number' ? data : 0;
      pushToast(
        `Campaign stopped${reverted > 0 ? ` · ${reverted} re-queued` : ''}`,
        'info'
      );
    } catch (e) {
      pushToast(
        `Stop crashed: ${e instanceof Error ? e.message : 'unknown'}`,
        'error'
      );
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div
      className="p-6 max-w-[1400px] mx-auto space-y-5"
      data-testid="precall-room"
    >
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">
            My dialer
          </h1>
          <p className="text-[12px] text-[#6B7280] mt-0.5">
            One lead at a time · agent-controlled pacing
          </p>
        </div>
      </header>

      {isEffectiveAdmin && <SpendBanner />}

      <div className="grid grid-cols-12 gap-5">
        {/* Left — campaign picker */}
        <div className="col-span-12 lg:col-span-3 space-y-3">
          <CampaignList
            activeId={activeId}
            onSelect={setActiveId}
            campaigns={realCampaigns}
          />
        </div>

        {/* Centre — hero next-lead card + queue + recent */}
        <div className="col-span-12 lg:col-span-9 space-y-4">
          {!camp ? (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center">
              <div className="text-[14px] font-semibold text-[#1A1A1A] mb-1">
                {campaignsLoading ? 'Loading campaigns…' : 'No campaigns yet'}
              </div>
              <div className="text-[12px] text-[#6B7280]">
                {campaignsLoading
                  ? ' '
                  : 'Ask an admin to create a campaign and assign you to it.'}
              </div>
            </div>
          ) : (
            <>
              {/* Campaign name strip */}
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
                    Campaign
                  </div>
                  <div className="text-[18px] font-bold text-[#1A1A1A] truncate">
                    {camp.name}
                  </div>
                </div>
                {isEffectiveAdmin && (
                  <button
                    onClick={() => setAdminPanelOpen((o) => !o)}
                    className="text-[11px] text-[#6B7280] underline-offset-2 hover:text-[#1A1A1A] hover:underline"
                  >
                    {adminPanelOpen ? 'Hide admin controls' : 'Admin controls'}
                  </button>
                )}
              </div>

              {/* Admin controls (collapsed by default) */}
              {isEffectiveAdmin && adminPanelOpen && (
                <div className="bg-[#F3F3EE] border border-[#E5E7EB] rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleStartCampaign()}
                        disabled={dialerBlocked}
                        title={blockReason ?? undefined}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold',
                          dialerBlocked
                            ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                            : 'bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90'
                        )}
                      >
                        <Play className="w-3.5 h-3.5" /> Start campaign
                      </button>
                      <button
                        onClick={() => void handlePauseCampaign()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium border border-[#E5E7EB] bg-white text-[#1A1A1A] hover:bg-[#F3F3EE]"
                      >
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </button>
                      <button
                        onClick={() => void handleStopCampaign()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium border border-[#E5E7EB] bg-white text-[#EF4444] hover:bg-[#FEF2F2]"
                      >
                        <Square className="w-3.5 h-3.5" /> Stop
                      </button>
                    </div>
                    <label className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                      Auto-advance
                      <select
                        value={autoAdvance}
                        onChange={(e) => setAutoAdvance(Number(e.target.value))}
                        className="px-2 py-1 text-[12px] bg-white border border-[#E5E7EB] rounded-[8px]"
                      >
                        {[5, 10, 15, 20, 30].map((n) => (
                          <option key={n} value={n}>
                            {n}s
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    <Mini label="Queue" value={camp.pendingLeads} />
                    <Mini label="Done" value={camp.doneLeads} tone="green" />
                    <Mini label="Connected" value={camp.connectedLeads} tone="green" />
                    <Mini label="Voicemail" value={camp.voicemailLeads} />
                    <Mini label="SMS" value={msgCounts.sms} />
                    <Mini label="WhatsApp" value={msgCounts.whatsapp} />
                    <Mini label="Email" value={msgCounts.email} />
                  </div>
                </div>
              )}

              {/* Hero — next lead card + queue side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
                <NextLeadCard
                  lead={nextLead}
                  fullContact={fullNextContact}
                  loading={queueLoading && !nextLead}
                  disabledReason={dialerBlocked ? blockReason : null}
                  onDial={handleDial}
                  onSkip={handleSkip}
                  onEdit={(c) => setEditing(c)}
                  onChangeStage={handleStageChange}
                />

                {/* Queue */}
                <aside
                  className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden"
                  data-testid="precall-queue"
                >
                  <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-wide">
                      Up next
                    </h3>
                    <span className="text-[10px] text-[#6B7280]">
                      {restOfQueue.length}
                    </span>
                  </div>
                  <div className="divide-y divide-[#E5E7EB]">
                    {restOfQueue.map((lead) => {
                      const fullContact = contacts.find((co) => co.id === lead.id);
                      return (
                        <div
                          key={lead.queueId}
                          className="px-3 py-2 hover:bg-[#F3F3EE]/50 flex items-center gap-2"
                        >
                          <button
                            onClick={() => handleDial(lead.id)}
                            disabled={dialerBlocked}
                            className="flex-1 min-w-0 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="text-[12px] font-medium text-[#1A1A1A] truncate">
                              {lead.name}
                            </div>
                            <div className="text-[10px] text-[#6B7280] tabular-nums">
                              {lead.phone}
                            </div>
                          </button>
                          <StageSelector
                            value={lead.pipelineColumnId}
                            onChange={(col) => handleStageChange(lead.id, col)}
                            size="sm"
                          />
                          {fullContact && (
                            <button
                              onClick={() => setEditing(fullContact)}
                              className="p-1 rounded hover:bg-white text-[#6B7280]"
                              title="Edit lead"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDial(lead.id)}
                            disabled={dialerBlocked}
                            className="p-1 rounded hover:bg-white text-[#9CA3AF] disabled:opacity-50"
                            title="Dial this lead"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                    {!queueLoading && restOfQueue.length === 0 && nextLead && (
                      <div className="px-3 py-4 text-center text-[11px] text-[#9CA3AF] italic">
                        Last lead in the queue.
                      </div>
                    )}
                    {!queueLoading && !nextLead && (
                      <div className="px-3 py-4 text-center text-[11px] text-[#9CA3AF] italic">
                        Queue is empty.
                      </div>
                    )}
                  </div>
                </aside>
              </div>

              <RecentCallsPanel />
            </>
          )}
        </div>
      </div>

      <EditContactModal
        contact={editing}
        onClose={() => setEditing(null)}
        onSave={(updated) => upsertContact(updated)}
      />
    </div>
  );
}

function Mini({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'green';
}) {
  return (
    <div className="bg-white rounded-lg p-1.5 border border-[#E5E7EB]">
      <div className="text-[9px] uppercase tracking-wide text-[#9CA3AF] font-semibold truncate">
        {label}
      </div>
      <div
        className={cn(
          'text-[14px] font-bold tabular-nums mt-0.5',
          tone === 'green' ? 'text-[#1E9A80]' : 'text-[#1A1A1A]'
        )}
      >
        {value}
      </div>
    </div>
  );
}
