// RecentCallsPanel — Hugo 2026-04-28 (PR 132 baseline, expanded in PR 136).
//
// Hugo (PR 136): "On the recent calls, we should be able to edit from
// there […]. Also, it should show if the SMS was sent or anything. It
// should show which stage of the pipeline as well. You should show
// duration of the call. Should show the recording […]. Same as
// call-history […]. The only difference is that we don't need the
// transcript there. You can have the transcript as well. You just have
// to make sure to fit everything. But we don't need the cost."
//
// What it does
//   - Lists the agent's last 10 wk_calls rows (any status), ordered by
//     started_at DESC. Refetches on the wk_calls realtime channel scoped
//     to this agent so it ticks live as calls finish.
//   - For each row, shows everything call-history shows EXCEPT cost:
//       Top row    : contact name + status badge + duration + relative time
//       Bottom row : phone · pipeline stage chip · SMS-sent chip · ▶ recording
//                    · ▾ transcript (expand) · Edit · Open · Hang up (if active)
//   - Recording uses the same `signCallRecording(path)` short-lived URL
//     pattern as call-history (private bucket).
//   - Transcript loads `wk_live_transcripts` for the call_id when expanded,
//     identical query to CallTranscriptModal (just inline + read-only).
//   - SMS-sent chip: queries `wk_sms_messages` for outbound rows on this
//     contact_id between started_at and (ended_at ?? started_at + 5 min).
//   - Edit opens the same `EditContactModal` call-history uses, hydrated
//     from the live store. Owners come from useAgentsToday().
//   - Open: openCallRoom(contactId) — same preview behaviour as
//     call-history. (Extending to "edit-mode outcome on past call" is a
//     separate task — flagged in PR body.)
//   - Hang up: for any row whose status is in
//     ('queued','ringing','in_progress'), red button calls
//     wk-dialer-hangup-leg directly. Always-on escape hatch.

import { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  ExternalLink,
  PhoneOff,
  Play,
  Pause,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCallCtx } from '../live-call/ActiveCallContext';
import { useSmsV2 } from '../../store/SmsV2Store';
import { formatDuration, formatRelativeTime } from '../../data/helpers';
import { signCallRecording } from '../../hooks/useCalls';
import { useAgentsToday } from '../../hooks/useAgentsToday';
import { useContactPersistence } from '../../hooks/useContactPersistence';
import EditContactModal from '../contacts/EditContactModal';
import type { Contact } from '../../types';

interface CallRow {
  id: string;
  contact_id: string | null;
  to_e164: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_sec: number | null;
  // PR 154 (Hugo 2026-04-29): outcome column. PR 155 (Hugo 2026-04-29):
  // the real column on wk_calls is `disposition_column_id`, not
  // `pipeline_column_id` — the wrong name silently broke the whole SELECT
  // and Recent Calls showed "No calls yet today" despite live calls.
  // Source of truth: wk_apply_outcome writes wk_calls.disposition_column_id.
  disposition_column_id: string | null;
}

interface ContactRow {
  id: string;
  name: string;
  phone: string;
}

interface RecordingRow {
  call_id: string;
  storage_path: string | null;
  status: string;
}

interface TranscriptRow {
  id: string;
  speaker: 'agent' | 'caller' | 'unknown';
  body: string;
  ts: string;
}

interface SmsRow {
  contact_id: string;
  created_at: string;
}

const ACTIVE_STATUSES = new Set(['queued', 'ringing', 'in_progress']);

interface HangupInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

/** Hide all but the last 4 digits of a phone, e.g. +44...8316. */
function maskPhone(phone: string): string {
  if (!phone) return '';
  if (phone.length <= 4) return phone;
  const tail = phone.slice(-4);
  if (phone.startsWith('+')) {
    const prefix = phone.slice(0, Math.min(3, phone.length - 4));
    return `${prefix}…${tail}`;
  }
  return `…${tail}`;
}

function statusBadge(status: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'completed':
      return {
        label: 'Connected',
        className: 'bg-[#ECFDF5] text-[#1E9A80]',
      };
    case 'in_progress':
      return {
        label: 'Connected',
        className: 'bg-[#ECFDF5] text-[#1E9A80]',
      };
    case 'voicemail':
      return {
        label: 'Voicemail',
        className: 'bg-[#FEF3C7] text-[#B45309]',
      };
    case 'no_answer':
    case 'missed':
      return {
        label: 'No pickup',
        className: 'bg-[#F3F4F6] text-[#6B7280]',
      };
    case 'busy':
      return {
        label: 'Busy',
        className: 'bg-[#FEE2E2] text-[#B91C1C]',
      };
    case 'failed':
      return {
        label: 'Failed',
        className: 'bg-[#FEE2E2] text-[#B91C1C]',
      };
    case 'canceled':
      return {
        label: 'Cancelled',
        className: 'bg-[#F3F4F6] text-[#6B7280]',
      };
    case 'queued':
    case 'ringing':
      return {
        label: 'Ringing',
        className: 'bg-[#DBEAFE] text-[#1D4ED8]',
      };
    default:
      return {
        label: status || '—',
        className: 'bg-[#F3F4F6] text-[#6B7280]',
      };
  }
}

/** Window for "SMS sent during this call" — from started_at to whichever
 *  comes first: ended_at, or started_at + 5 minutes. We still count an
 *  SMS sent within ~5 minutes of dialing as "sent during the call" so a
 *  follow-up SMS the agent fires while filling out the outcome counts. */
function smsWindowEnd(startedAtIso: string | null, endedAtIso: string | null): string | null {
  if (!startedAtIso) return null;
  if (endedAtIso) {
    return new Date(
      Math.max(
        new Date(endedAtIso).getTime(),
        new Date(startedAtIso).getTime() + 5 * 60_000
      )
    ).toISOString();
  }
  return new Date(new Date(startedAtIso).getTime() + 5 * 60_000).toISOString();
}

export default function RecentCallsPanel() {
  const { openCallRoom } = useActiveCallCtx();
  const {
    pushToast,
    columns,
    contacts: storeContacts,
    upsertContact,
  } = useSmsV2();
  const { agents: realAgentsToday } = useAgentsToday();
  const persist = useContactPersistence();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [rows, setRows] = useState<CallRow[]>([]);
  const [contactsById, setContactsById] = useState<Map<string, ContactRow>>(new Map());
  const [recordingsByCall, setRecordingsByCall] = useState<Map<string, RecordingRow>>(new Map());
  const [smsByContact, setSmsByContact] = useState<Map<string, SmsRow[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [hangingUp, setHangingUp] = useState<Set<string>>(new Set());

  // Per-row UI state — recording playback, transcript expansion.
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [signedRecordingUrl, setSignedRecordingUrl] = useState<string | null>(null);
  const [expandedTranscriptCallId, setExpandedTranscriptCallId] = useState<string | null>(null);
  const [transcriptRows, setTranscriptRows] = useState<TranscriptRow[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  // Edit modal state — opens EditContactModal hydrated from the store.
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Resolve agent id once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) setAgentId(data.user?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Initial fetch + realtime subscription on wk_calls for this agent.
  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    const reload = async () => {
      // PR 154/155 (Hugo 2026-04-29): disposition_column_id added to
      // the SELECT so the new Outcome column can render the picked
      // stage. PR 154 used the wrong name (`pipeline_column_id`) — the
      // SELECT errored, data came back null, and Recent Calls displayed
      // "No calls yet today" for everyone. Joined client-side via
      // useSmsV2().columns (cached).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_calls' as any) as any)
        .select(
          'id, contact_id, to_e164, status, started_at, ended_at, duration_sec, disposition_column_id'
        )
        .eq('agent_id', agentId)
        .order('started_at', { ascending: false })
        // PR 137 (Hugo 2026-04-28): pull more raw rows so the React-side
        // dedupe below has enough material to surface 10 unique contacts
        // even when the same contact has been dialed multiple times in
        // a session. 30 is plenty — even a heavy power dialer hammering
        // the same 10 contacts won't exceed this.
        .limit(30);
      if (cancelled) return;
      // PR 137 (Hugo 2026-04-28): "the recent calls show duplicated
      // numbers." Dedupe by contact_id, keeping only the FIRST occurrence
      // (= latest because rows are ordered by started_at DESC). Rows
      // with no contact_id are kept as-is — they're rare (incoming calls
      // pre-resolution) but should still be visible. Slice to 10 unique.
      const callRows = ((data ?? []) as CallRow[]);
      const seen = new Set<string>();
      const deduped: CallRow[] = [];
      for (const r of callRows) {
        const key = r.contact_id ?? `__null_${r.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(r);
        if (deduped.length >= 10) break;
      }
      setRows(deduped);
      setLoading(false);
    };
    void reload();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel(`recent-calls:${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wk_calls',
          filter: `agent_id=eq.${agentId}`,
        },
        () => {
          if (!cancelled) void reload();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  }, [agentId]);

  // Resolve contact names for the visible rows.
  useEffect(() => {
    const ids = Array.from(
      new Set(rows.map((r) => r.contact_id).filter((v): v is string => !!v))
    );
    const missing = ids.filter((id) => !contactsById.has(id));
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_contacts' as any) as any)
        .select('id, name, phone')
        .in('id', missing);
      if (cancelled || !data) return;
      setContactsById((prev) => {
        const next = new Map(prev);
        for (const row of data as ContactRow[]) next.set(row.id, row);
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [rows, contactsById]);

  // Load wk_recordings rows for the visible calls — used for the ▶ button.
  useEffect(() => {
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return;
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_recordings' as any) as any)
        .select('call_id, storage_path, status')
        .in('call_id', ids);
      if (cancelled || !data) return;
      setRecordingsByCall(() => {
        const next = new Map<string, RecordingRow>();
        for (const r of data as RecordingRow[]) next.set(r.call_id, r);
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [rows]);

  // Load outbound SMS rows for the unique (contact_id) set of visible
  // calls — we filter by call window in the row itself. Single bulk query
  // avoids N+1.
  useEffect(() => {
    const contactIds = Array.from(
      new Set(rows.map((r) => r.contact_id).filter((v): v is string => !!v))
    );
    if (contactIds.length === 0) {
      setSmsByContact(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_sms_messages' as any) as any)
        .select('contact_id, created_at')
        .in('contact_id', contactIds)
        .eq('direction', 'outbound')
        .order('created_at', { ascending: false });
      if (cancelled || !data) return;
      setSmsByContact(() => {
        const next = new Map<string, SmsRow[]>();
        for (const r of data as SmsRow[]) {
          if (!next.has(r.contact_id)) next.set(r.contact_id, []);
          next.get(r.contact_id)!.push(r);
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [rows]);

  // Sign the recording URL when the agent clicks ▶ on a row that has one.
  useEffect(() => {
    let cancelled = false;
    if (!playingCallId) {
      setSignedRecordingUrl(null);
      return;
    }
    const rec = recordingsByCall.get(playingCallId);
    if (!rec?.storage_path) {
      setSignedRecordingUrl(null);
      return;
    }
    if (/^https?:\/\//i.test(rec.storage_path)) {
      setSignedRecordingUrl(rec.storage_path);
      return;
    }
    void signCallRecording(rec.storage_path).then((url) => {
      if (!cancelled) setSignedRecordingUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [playingCallId, recordingsByCall]);

  // Load transcript rows when the agent expands the chevron on a row.
  useEffect(() => {
    let cancelled = false;
    if (!expandedTranscriptCallId) {
      setTranscriptRows([]);
      return;
    }
    setTranscriptLoading(true);
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('wk_live_transcripts' as any) as any)
          .select('id, speaker, body, ts')
          .eq('call_id', expandedTranscriptCallId)
          .order('ts', { ascending: true });
        if (cancelled) return;
        setTranscriptRows((data ?? []) as TranscriptRow[]);
      } finally {
        if (!cancelled) setTranscriptLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expandedTranscriptCallId]);

  const items = useMemo(
    () =>
      rows.map((r) => {
        const contact = r.contact_id ? contactsById.get(r.contact_id) : undefined;
        const storeContact = r.contact_id
          ? storeContacts.find((c) => c.id === r.contact_id)
          : undefined;
        const stageColumn = storeContact?.pipelineColumnId
          ? columns.find((c) => c.id === storeContact.pipelineColumnId)
          : undefined;
        // PR 154/155 (Hugo 2026-04-29): outcome column = the pipeline
        // column the agent picked when this specific call ended.
        // Distinct from the contact's CURRENT stage (above) which may
        // have moved on. Source of truth: wk_calls.disposition_column_id
        // (set by wk_apply_outcome). Joined client-side via the cached
        // columns list. Renders `—` if null (Hugo Rule 13).
        const outcomeColumn = r.disposition_column_id
          ? columns.find((c) => c.id === r.disposition_column_id)
          : undefined;
        const recording = recordingsByCall.get(r.id);
        const windowEnd = smsWindowEnd(r.started_at, r.ended_at);
        const smsCount =
          r.contact_id && r.started_at && windowEnd
            ? (smsByContact.get(r.contact_id) ?? []).filter(
                (s) =>
                  new Date(s.created_at).getTime() >= new Date(r.started_at!).getTime() &&
                  new Date(s.created_at).getTime() <= new Date(windowEnd).getTime()
              ).length
            : 0;
        return {
          id: r.id,
          contactId: r.contact_id,
          name: contact?.name ?? 'Unknown contact',
          phone: contact?.phone ?? r.to_e164 ?? '',
          status: r.status,
          startedAt: r.started_at,
          durationSec: r.duration_sec ?? 0,
          isActive: ACTIVE_STATUSES.has(r.status) && r.ended_at === null,
          stageName: stageColumn?.name ?? null,
          stageColour: stageColumn?.colour ?? null,
          outcomeName: outcomeColumn?.name ?? null,
          outcomeColour: outcomeColumn?.colour ?? null,
          hasRecording: !!recording?.storage_path && recording.status === 'ready',
          smsCount,
          storeContact: storeContact ?? null,
        };
      }),
    [rows, contactsById, storeContacts, columns, recordingsByCall, smsByContact]
  );

  const onHangup = async (callId: string) => {
    setHangingUp((prev) => new Set(prev).add(callId));
    try {
      const { error } = await (
        supabase.functions as unknown as HangupInvoke
      ).invoke('wk-dialer-hangup-leg', { body: { call_id: callId } });
      if (error) {
        pushToast(`Hang up failed: ${error.message}`, 'error');
      } else {
        pushToast('Leg cancelled', 'info');
      }
    } catch (e) {
      pushToast(
        `Hang up crashed: ${e instanceof Error ? e.message : 'unknown'}`,
        'error'
      );
    } finally {
      setHangingUp((prev) => {
        const next = new Set(prev);
        next.delete(callId);
        return next;
      });
    }
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
          Recent calls
        </h3>
        <span className="text-[11px] text-[#6B7280]">Last 10</span>
      </div>
      <div className="divide-y divide-[#E5E7EB]" data-testid="recent-calls-panel">
        {items.map((item) => {
          const badge = statusBadge(item.status);
          const isHanging = hangingUp.has(item.id);
          // PR 138 (Hugo 2026-04-28, Rule 8): Open from Recent Calls
          // must reliably open the room for that contact. Reducer
          // decides if OPEN_ROOM is valid (no-op while live, since the
          // live call's room is already up). The button stays
          // clickable — no client-side gate.
          const isPlaying = playingCallId === item.id;
          const isTranscriptOpen = expandedTranscriptCallId === item.id;
          return (
            <div
              key={item.id}
              className="px-4 py-2.5 hover:bg-[#F3F3EE]/50"
              data-testid={`recent-call-row-${item.id}`}
            >
              {/* Top row: name + status badge + duration + relative time */}
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#1A1A1A] truncate flex items-center gap-1.5">
                    <span className="truncate">{item.name}</span>
                    <span
                      className={cn(
                        'text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded shrink-0',
                        badge.className
                      )}
                      data-testid={`recent-call-status-${item.id}`}
                    >
                      {badge.label}
                    </span>
                    {item.durationSec > 0 && (
                      <span className="text-[10px] tabular-nums text-[#6B7280] shrink-0">
                        {formatDuration(item.durationSec)}
                      </span>
                    )}
                    {item.startedAt && (
                      <span className="text-[10px] text-[#9CA3AF] tabular-nums shrink-0 ml-auto">
                        {formatRelativeTime(item.startedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom row: phone · stage · SMS · recording · transcript · actions */}
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[#6B7280] tabular-nums">
                  {maskPhone(item.phone)}
                </span>
                {item.stageName && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: item.stageColour
                        ? `${item.stageColour}1A` // ~10% alpha
                        : '#F3F4F6',
                      color: item.stageColour ?? '#6B7280',
                    }}
                    title={`Pipeline stage: ${item.stageName}`}
                    data-testid={`recent-call-stage-${item.id}`}
                  >
                    {item.stageName}
                  </span>
                )}
                {/* PR 154 (Hugo 2026-04-29): outcome chip — the
                    pipeline column the agent picked AT THIS CALL.
                    Distinct from stage above (current contact stage). */}
                {item.outcomeName && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded ring-1 ring-inset"
                    style={{
                      backgroundColor: item.outcomeColour
                        ? `${item.outcomeColour}26` // ~15% alpha
                        : '#F3F4F6',
                      color: item.outcomeColour ?? '#6B7280',
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ['--tw-ring-color' as any]: item.outcomeColour ?? '#E5E7EB',
                    }}
                    title={`Outcome saved on this call: ${item.outcomeName}`}
                    data-testid={`recent-call-outcome-${item.id}`}
                  >
                    ✓ {item.outcomeName}
                  </span>
                )}
                {item.smsCount > 0 && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#1E9A80] flex items-center gap-1"
                    title={`${item.smsCount} SMS sent during this call`}
                    data-testid={`recent-call-sms-${item.id}`}
                  >
                    <MessageSquare className="w-2.5 h-2.5" />
                    SMS {item.smsCount > 1 ? `×${item.smsCount}` : '✓'}
                  </span>
                )}
                {item.hasRecording && (
                  <button
                    onClick={() => setPlayingCallId(isPlaying ? null : item.id)}
                    className={cn(
                      'flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors',
                      isPlaying
                        ? 'bg-[#1E9A80] text-white'
                        : 'bg-[#ECFDF5] text-[#1E9A80] hover:bg-[#1E9A80] hover:text-white'
                    )}
                    title={isPlaying ? 'Pause recording' : 'Play recording'}
                    data-testid={`recent-call-play-${item.id}`}
                  >
                    {isPlaying ? (
                      <Pause className="w-2.5 h-2.5" />
                    ) : (
                      <Play className="w-2.5 h-2.5" />
                    )}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                )}
                <button
                  onClick={() =>
                    setExpandedTranscriptCallId(isTranscriptOpen ? null : item.id)
                  }
                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280] bg-[#F3F3EE] hover:bg-[#E5E7EB] rounded transition-colors"
                  title={isTranscriptOpen ? 'Hide transcript' : 'Show transcript'}
                  data-testid={`recent-call-transcript-toggle-${item.id}`}
                >
                  {isTranscriptOpen ? (
                    <ChevronDown className="w-2.5 h-2.5" />
                  ) : (
                    <ChevronRight className="w-2.5 h-2.5" />
                  )}
                  Transcript
                </button>

                {/* Spacer pushes actions to the right */}
                <div className="flex-1 min-w-[8px]" />

                {item.storeContact && (
                  <button
                    onClick={() => setEditingContact(item.storeContact)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F3F3EE]"
                    title="Edit contact"
                    data-testid={`recent-call-edit-${item.id}`}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                )}
                {item.contactId && (
                  <button
                    onClick={() => openCallRoom(item.contactId!)}
                    className="px-2 py-1 rounded text-[11px] font-medium border border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F3F3EE] transition-colors"
                    title="Open call room (preview mode)"
                    data-testid={`recent-call-open-${item.id}`}
                  >
                    <span className="flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </span>
                  </button>
                )}
                {item.isActive && (
                  <button
                    onClick={() => void onHangup(item.id)}
                    disabled={isHanging}
                    className="px-2 py-1 rounded text-[11px] font-semibold bg-[#EF4444] hover:bg-[#DC2626] text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Force-cancel this leg in Twilio"
                    data-testid={`recent-call-hangup-${item.id}`}
                  >
                    <span className="flex items-center gap-1">
                      <PhoneOff className="w-3 h-3" />
                      {isHanging ? 'Cancelling…' : 'Hang up'}
                    </span>
                  </button>
                )}
              </div>

              {/* Inline recording player */}
              {isPlaying && item.hasRecording && (
                <div className="mt-2 px-2 py-2 bg-[#ECFDF5]/40 rounded-lg">
                  {signedRecordingUrl ? (
                    <audio
                      src={signedRecordingUrl}
                      controls
                      autoPlay
                      className="w-full h-8"
                      data-testid={`recent-call-audio-${item.id}`}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                      <span className="inline-block w-2 h-2 rounded-full bg-[#1E9A80] animate-pulse" />
                      Loading recording…
                    </div>
                  )}
                </div>
              )}

              {/* Inline transcript */}
              {isTranscriptOpen && (
                <div
                  className="mt-2 px-2 py-2 bg-[#F3F3EE]/60 rounded-lg max-h-[180px] overflow-y-auto space-y-1"
                  data-testid={`recent-call-transcript-${item.id}`}
                >
                  {transcriptLoading && (
                    <div className="text-[11px] text-[#9CA3AF] italic">
                      Loading transcript…
                    </div>
                  )}
                  {!transcriptLoading && transcriptRows.length === 0 && (
                    <div className="text-[11px] text-[#9CA3AF] italic">
                      No transcript captured for this call.
                    </div>
                  )}
                  {transcriptRows.map((t) => (
                    <div key={t.id} className="text-[11px] leading-snug">
                      <span
                        className={
                          t.speaker === 'agent'
                            ? 'font-semibold text-[#1E9A80]'
                            : 'font-semibold text-[#1A1A1A]'
                        }
                      >
                        {t.speaker === 'agent'
                          ? 'You'
                          : item.name?.trim().split(/\s+/)[0] ?? 'Caller'}
                        :
                      </span>{' '}
                      <span className="text-[#1A1A1A]">{t.body}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!loading && items.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-[#9CA3AF] italic">
            No calls yet today.
          </div>
        )}
        {loading && items.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-[#9CA3AF] italic">
            Loading recent calls…
          </div>
        )}
      </div>

      {/* Edit contact modal — same pattern Call history uses (PR 115). */}
      <EditContactModal
        contact={editingContact}
        agents={realAgentsToday}
        onClose={() => setEditingContact(null)}
        onSave={async (updated) => {
          const previous = storeContacts.find((c) => c.id === updated.id);
          upsertContact(updated);
          setEditingContact(null);
          try {
            await persist.patchContact(updated.id, {
              name: updated.name,
              email: updated.email,
              pipeline_column_id: updated.pipelineColumnId,
            });
            pushToast('Contact saved', 'success');
          } catch (e) {
            if (previous) upsertContact(previous);
            pushToast(
              `Save failed: ${e instanceof Error ? e.message : 'unknown'}`,
              'error'
            );
          }
        }}
      />
    </div>
  );
}
