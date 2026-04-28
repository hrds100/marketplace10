import { useEffect, useMemo, useState } from 'react';
import { Play, Pause, Square, ArrowRight, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import CampaignList from '../components/dialer/CampaignList';
import ParallelDialerBoard from '../components/dialer/ParallelDialerBoard';
import SpendBanner from '../components/dialer/SpendBanner';
import StageSelector from '../components/shared/StageSelector';
import EditContactModal from '../components/contacts/EditContactModal';
import { MOCK_CAMPAIGNS } from '../data/mockCampaigns';
import { useActiveCallCtx } from '../components/live-call/ActiveCallContext';
import { useSpendLimit } from '../hooks/useSpendLimit';
import { useKillSwitch } from '../hooks/useKillSwitch';
import { useSmsV2 } from '../store/SmsV2Store';
import { useContactPersistence } from '../hooks/useContactPersistence';
import { useDialerCampaigns } from '../hooks/useDialerCampaigns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Campaign, Contact } from '../types';

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

export default function DialerPage() {
  // PR 62 (Hugo 2026-04-27): non-admins only see campaigns they're
  // assigned to via wk_campaign_agents. Admins see everything.
  // PR 63 (Hugo 2026-04-27): workspace_role wins when set — Hugo
  // demoted his own hugo@nfstay.com to agent and was still seeing
  // every campaign because the email allow-list (isAdmin=true)
  // bypassed the scope. Now we read profiles.workspace_role and use
  // role-first logic.
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
  const { campaigns: realCampaigns } = useDialerCampaigns({
    scopedToAgentId: !isEffectiveAdmin && user ? user.id : null,
  });
  const allCampaigns = useMemo<Campaign[]>(
    () => (realCampaigns.length > 0 ? realCampaigns : MOCK_CAMPAIGNS),
    [realCampaigns]
  );

  const [activeId, setActiveId] = useState<string>(allCampaigns[0]?.id ?? MOCK_CAMPAIGNS[0].id);
  const [running, setRunning] = useState(true);
  const [editing, setEditing] = useState<Contact | null>(null);
  const { startCall } = useActiveCallCtx();
  const spend = useSpendLimit();
  // PR 90 (Hugo 2026-04-27): the Start button only checked spend limit \u2014
  // an admin could press Start while the global "all dialers off" kill
  // switch was active, then the backend would reject and the UI looked
  // confused. Now the frontend disables Start when allDialers is on.
  const ks = useKillSwitch();
  const dialerBlocked = spend.isLimitReached || ks.allDialers;
  const blockReason = ks.allDialers
    ? 'All dialers are off (kill switch). Toggle off in Settings \u2192 AI Coach.'
    : spend.isLimitReached
      ? 'Daily spend limit reached.'
      : null;
  const { contacts, patchContact, upsertContact, pushToast } = useSmsV2();
  const persist = useContactPersistence();

  // Keep activeId valid when the real list arrives or changes
  useEffect(() => {
    if (allCampaigns.length === 0) return;
    if (!allCampaigns.some((c) => c.id === activeId)) {
      setActiveId(allCampaigns[0].id);
    }
  }, [allCampaigns, activeId]);

  const camp = allCampaigns.find((c) => c.id === activeId) ?? allCampaigns[0] ?? MOCK_CAMPAIGNS[0];

  // Controlled form state — hydrates from the active campaign, persists user edits.
  const [mode, setMode] = useState<Campaign['mode']>(camp.mode);
  const [lines, setLines] = useState<number>(camp.parallelLines);
  const [autoAdvance, setAutoAdvance] = useState<number>(camp.autoAdvanceSeconds);

  // When the user switches campaign, snap form to that campaign's defaults.
  useEffect(() => {
    setMode(camp.mode);
    setLines(camp.parallelLines);
    setAutoAdvance(camp.autoAdvanceSeconds);
  }, [camp.id, camp.mode, camp.parallelLines, camp.autoAdvanceSeconds]);

  const upcoming = contacts.slice(0, 5);

  const isUuid = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  const handleStart = async () => {
    setRunning(true);
    // Looks like a UUID? Then it's likely a real wk_dialer_campaigns row —
    // call the edge function. Mock campaign IDs (e.g. 'campaign-1') just
    // toggle the visual `running` state and rely on the local store.
    if (!isUuid(activeId)) {
      pushToast('Mock campaign — wire a real campaign UUID to dial', 'info');
      return;
    }
    // PR 23: ensure the campaign is active before firing the dialer.
    // Pause/Stop flip is_active=false; Start must flip it back.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: activateErr } = await (
        supabase.from('wk_dialer_campaigns' as any) as any
      )
        .update({ is_active: true })
        .eq('id', activeId);
      if (activateErr) {
        pushToast(`Couldn't activate campaign: ${activateErr.message}`, 'error');
        setRunning(false);
        return;
      }
    } catch {
      /* ignore — wk-dialer-start will surface a clearer error */
    }
    // PR 46 (Hugo 2026-04-27): persist the user's `lines` choice to
    // wk_dialer_campaigns.parallel_lines BEFORE firing wk-dialer-start.
    // Previously the UI dropdown only updated local state, so the edge
    // fn read the stale DB value and dialled more lines than the user
    // chose. This keeps DB authoritative.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('wk_dialer_campaigns' as any) as any)
        .update({
          parallel_lines: Math.max(1, Math.min(5, lines)),
          auto_advance_seconds: autoAdvance,
        })
        .eq('id', activeId);
    } catch {
      /* non-fatal — wk-dialer-start also accepts `lines` in body below */
    }
    try {
      const { data, error } = await (
        supabase.functions as unknown as DialerStartInvoke
      ).invoke('wk-dialer-start', {
        body: {
          campaign_id: activeId,
          mode,
          // PR 46: backend reads `body.lines`. Sending both names keeps
          // older edge-fn versions working too (defensive — see
          // wk-dialer-start where both keys are accepted).
          lines,
          parallel_lines: lines,
          auto_advance_seconds: autoAdvance,
        },
      });
      if (error) {
        pushToast(`Dialer error: ${error.message}`, 'error');
        setRunning(false);
        return;
      }
      if (data?.blocked) {
        pushToast(`Blocked: ${data.reason ?? 'spend or killswitch'}`, 'error');
        setRunning(false);
        return;
      }
      if (data?.error) {
        pushToast(`Dialer: ${data.error}`, 'error');
        setRunning(false);
        return;
      }
      pushToast(`Dialing ${data?.fired?.length ?? 0} line(s)`, 'success');
    } catch (e) {
      pushToast(
        `Dialer crashed: ${e instanceof Error ? e.message : 'unknown'}`,
        'error'
      );
      setRunning(false);
    }
  };

  // PR 23: Pause = flip is_active=false on the server. New dial calls
  // refuse until the agent presses Start (which flips it back).
  const handlePause = async () => {
    setRunning(false);
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
      pushToast('Campaign paused', 'info');
    } catch (e) {
      pushToast(
        `Pause crashed: ${e instanceof Error ? e.message : 'unknown'}`,
        'error'
      );
    }
  };

  // PR 23: Stop = Pause + revert in-flight queue rows so cancelled-mid
  // -ring contacts re-enter the pool on the next Start.
  const handleStop = async () => {
    setRunning(false);
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
      const { data, error: rpcErr } = await sp.rpc('wk_dialer_revert_inflight', {
        p_campaign_id: activeId,
      });
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

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">My dialer</h1>
          <p className="text-[13px] text-[#6B7280]">
            Run campaigns · parallel + power · winner takes the screen
          </p>
        </div>
      </header>

      <SpendBanner />

      <div className="grid grid-cols-12 gap-5">
        {/* Left — campaigns + queue */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <CampaignList
            activeId={activeId}
            onSelect={setActiveId}
            campaigns={realCampaigns.length > 0 ? realCampaigns : undefined}
          />

          <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide">
                My queue
              </h3>
              <span className="text-[11px] text-[#6B7280]">Next 5</span>
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {upcoming.map((c) => (
                <div
                  key={c.id}
                  className="px-4 py-2.5 hover:bg-[#F3F3EE]/50 flex items-center gap-2"
                >
                  <button
                    onClick={() => startCall(c.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-[13px] font-medium text-[#1A1A1A] truncate">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-[#6B7280] tabular-nums">{c.phone}</div>
                  </button>
                  <StageSelector
                    value={c.pipelineColumnId}
                    onChange={(col) => {
                      // PR 105 (Hugo 2026-04-28): was UI-only — stage
                      // changes from the dialer queue never reached
                      // wk_contacts. Mirror the ContactsPage pattern.
                      patchContact(c.id, { pipelineColumnId: col });
                      void persist.moveToColumn(c.id, col);
                    }}
                    size="sm"
                  />
                  <button
                    onClick={() => setEditing(c)}
                    className="p-1.5 rounded hover:bg-white text-[#6B7280] hover:text-[#1A1A1A]"
                    title="Edit lead"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => startCall(c.id)}
                    className="p-1.5 rounded hover:bg-white text-[#9CA3AF]"
                    title="Call"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — campaign detail + dialer */}
        <div className="col-span-12 lg:col-span-8 space-y-3">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
                  Campaign
                </div>
                <h2 className="text-[18px] font-bold text-[#1A1A1A]">{camp.name}</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleStart()}
                  disabled={dialerBlocked}
                  title={blockReason ?? undefined}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-semibold shadow-[0_4px_12px_rgba(30,154,128,0.35)]',
                    dialerBlocked
                      ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed shadow-none'
                      : 'bg-[#1E9A80] text-white hover:bg-[#1E9A80]/90'
                  )}
                >
                  <Play className="w-3.5 h-3.5" /> Start
                </button>
                <button
                  onClick={() => void handlePause()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-medium border border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F3F3EE]"
                >
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
                <button
                  onClick={() => void handleStop()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-medium border border-[#E5E7EB] text-[#EF4444] hover:bg-[#FEF2F2]"
                >
                  <Square className="w-3.5 h-3.5" /> Stop
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Mode">
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as Campaign['mode'])}
                  className="w-full px-2 py-1.5 text-[13px] bg-[#F3F3EE] border border-[#E5E7EB] rounded-[10px]"
                >
                  <option value="parallel">Parallel</option>
                  <option value="power">Power</option>
                  <option value="manual">Manual</option>
                </select>
              </Field>
              <Field label="Lines">
                <select
                  value={lines}
                  onChange={(e) => setLines(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-[13px] bg-[#F3F3EE] border border-[#E5E7EB] rounded-[10px]"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Auto-advance">
                <select
                  value={autoAdvance}
                  onChange={(e) => setAutoAdvance(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-[13px] bg-[#F3F3EE] border border-[#E5E7EB] rounded-[10px]"
                >
                  {[5, 10, 15, 20, 30].map((n) => (
                    <option key={n} value={n}>
                      {n}s
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* PR 105: the standalone "System prompt" dropdown was removed.
                PR 109 (Hugo 2026-04-28): the AI Coach ON/OFF toggle that
                lived next to Start has been removed too — the same
                control is already on the top-nav StatusBar (kill switch),
                so duplicating it here invited drift. */}

            <div className="grid grid-cols-4 gap-3 pt-2 border-t border-[#E5E7EB]">
              <Mini label="Queue" value={camp.totalLeads - camp.doneLeads} />
              <Mini label="Done" value={camp.doneLeads} tone="green" />
              <Mini label="Connected" value={camp.connectedLeads} tone="green" />
              <Mini label="Voicemail" value={camp.voicemailLeads} />
            </div>
          </div>

          <ParallelDialerBoard active={running} />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
        {label}
      </div>
      {children}
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
    <div className="bg-[#F3F3EE] rounded-xl p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
        {label}
      </div>
      <div
        className={
          'text-[18px] font-bold tabular-nums mt-0.5 ' +
          (tone === 'green' ? 'text-[#1E9A80]' : 'text-[#1A1A1A]')
        }
      >
        {value}
      </div>
    </div>
  );
}
