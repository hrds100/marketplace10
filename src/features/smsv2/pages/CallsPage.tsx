import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Voicemail,
  Play,
  Pause,
  Sparkles,
  Search,
  ChevronDown,
  ChevronRight,
  Download,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import CallTranscriptModal from '../components/calls/CallTranscriptModal';
import { MOCK_CALLS } from '../data/mockCalls';
import { MOCK_CONTACTS } from '../data/mockContacts';
import { MOCK_AGENTS } from '../data/mockAgents';
import { formatDuration, formatPence, formatRelativeTime } from '../data/helpers';
import { cn } from '@/lib/utils';
import { useCalls, signCallRecording } from '../hooks/useCalls';
import { useSmsV2 } from '../store/SmsV2Store';
import { useDemoMode } from '../lib/useDemoMode';
import type { CallRecord } from '../types';

const STATUS_ICON = {
  inbound: <PhoneIncoming className="w-3.5 h-3.5 text-[#1E9A80]" />,
  outbound: <PhoneOutgoing className="w-3.5 h-3.5 text-[#3B82F6]" />,
};

type DurationBucket = 'all' | 'short' | 'medium' | 'long';
type DateBucket = 'all' | 'today' | '7d' | '30d';

export default function CallsPage() {
  const [search, setSearch] = useState('');
  const [duration, setDuration] = useState<DurationBucket>('all');
  const [dateRange, setDateRange] = useState<DateBucket>('all');
  const [agentFilter, setAgentFilter] = useState('');
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [transcriptCallId, setTranscriptCallId] = useState<string | null>(null);

  const { calls: realCalls } = useCalls();
  const { contacts: realContacts, columns } = useSmsV2();
  const demoMode = useDemoMode();

  // In production, always use real data — even if empty. The mock fallback
  // is reachable only with `?demo=1` so internal demos / screenshots still
  // work, but Hugo never sees Sarah Jenkins on a live page.
  const calls = demoMode && realCalls.length === 0 ? MOCK_CALLS : realCalls;
  const contacts =
    demoMode && realContacts.length === 0 ? MOCK_CONTACTS : realContacts;
  const agents = demoMode ? MOCK_AGENTS : [];

  // When the user clicks Play on a row with a real recording_path, swap
  // it for a short-lived signed URL.
  useEffect(() => {
    let cancelled = false;
    if (!playing) {
      setSignedUrl(null);
      return;
    }
    const call = calls.find((c) => c.id === playing);
    if (!call?.recordingUrl) return;
    // Already an http(s) URL? Don't re-sign (e.g. mock data).
    if (/^https?:\/\//i.test(call.recordingUrl)) {
      setSignedUrl(call.recordingUrl);
      return;
    }
    void signCallRecording(call.recordingUrl).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [playing, calls]);

  // Group by contact so we can expand to show "previous calls to same person"
  const callsByContact = useMemo(() => {
    const map = new Map<string, CallRecord[]>();
    calls.forEach((c) => {
      if (!map.has(c.contactId)) map.set(c.contactId, []);
      map.get(c.contactId)!.push(c);
    });
    map.forEach((arr) => arr.sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt)));
    return map;
  }, [calls]);

  // Filter at the call level → most-recent per contact group
  const filteredCalls = useMemo(() => {
    const now = Date.now();
    return calls.filter((c) => {
      const contact = contacts.find((x) => x.id === c.contactId);
      if (!contact) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !contact.name.toLowerCase().includes(s) &&
          !contact.phone.toLowerCase().includes(s)
        )
          return false;
      }
      if (agentFilter && c.agentId !== agentFilter) return false;
      if (duration !== 'all') {
        if (duration === 'short' && c.durationSec >= 60) return false;
        if (duration === 'medium' && (c.durationSec < 60 || c.durationSec > 300))
          return false;
        if (duration === 'long' && c.durationSec <= 300) return false;
      }
      if (dateRange !== 'all') {
        const age = now - +new Date(c.startedAt);
        if (dateRange === 'today' && age > 86_400_000) return false;
        if (dateRange === '7d' && age > 7 * 86_400_000) return false;
        if (dateRange === '30d' && age > 30 * 86_400_000) return false;
      }
      return true;
    });
  }, [calls, contacts, search, duration, dateRange, agentFilter]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">Calls</h1>
          <p className="text-[13px] text-[#6B7280]">
            {filteredCalls.length} of {calls.length} calls · click row for previous calls to same prospect
          </p>
        </div>
        <button className="flex items-center gap-1.5 border border-[#E5E7EB] bg-white text-[#1A1A1A] text-[13px] font-medium px-3 py-2 rounded-[10px] hover:bg-[#F3F3EE]">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </header>

      {/* Filter bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl px-4 py-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by prospect name or phone…"
            className="w-full pl-7 pr-2 py-1.5 text-[12px] bg-[#F3F3EE] border-0 rounded-[10px] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30"
          />
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateBucket)}
          className="text-[12px] px-2 py-1.5 bg-[#F3F3EE] border border-[#E5E7EB] rounded-[10px]"
        >
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value as DurationBucket)}
          className="text-[12px] px-2 py-1.5 bg-[#F3F3EE] border border-[#E5E7EB] rounded-[10px]"
        >
          <option value="all">Any length</option>
          <option value="short">Short (&lt;1m)</option>
          <option value="medium">Medium (1–5m)</option>
          <option value="long">Long (&gt;5m)</option>
        </select>
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="text-[12px] px-2 py-1.5 bg-[#F3F3EE] border border-[#E5E7EB] rounded-[10px]"
        >
          <option value="">All agents</option>
          {agents.filter((a) => !a.isAdmin).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {(search || duration !== 'all' || dateRange !== 'all' || agentFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setDuration('all');
              setDateRange('all');
              setAgentFilter('');
            }}
            className="text-[11px] text-[#1E9A80] hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#F3F3EE]/50 text-[10px] uppercase tracking-wide text-[#9CA3AF]">
            <tr>
              <th className="text-left px-2 py-2.5 w-6"></th>
              <th className="text-left px-2 py-2.5 font-semibold">Direction</th>
              <th className="text-left px-2 py-2.5 font-semibold">Prospect</th>
              <th className="text-left px-2 py-2.5 font-semibold">Agent</th>
              <th className="text-left px-2 py-2.5 font-semibold">Status</th>
              <th className="text-left px-2 py-2.5 font-semibold">Stage</th>
              <th className="text-right px-2 py-2.5 font-semibold">Duration</th>
              <th className="text-right px-2 py-2.5 font-semibold">Cost</th>
              <th className="text-left px-2 py-2.5 font-semibold">Date · Time</th>
              <th className="px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filteredCalls.map((c) => {
              const contact = contacts.find((x) => x.id === c.contactId);
              const agent = agents.find((x) => x.id === c.agentId);
              const previousCalls = (callsByContact.get(c.contactId) ?? []).filter(
                (x) => x.id !== c.id
              );
              const isExpanded = expandedContactId === c.contactId;
              const isPlaying = playing === c.id;
              return (
                <>
                  <tr
                    key={c.id}
                    className={cn(
                      'hover:bg-[#F3F3EE]/30',
                      isExpanded && 'bg-[#ECFDF5]/40'
                    )}
                  >
                    <td className="px-2 py-2.5">
                      {previousCalls.length > 0 ? (
                        <button
                          onClick={() =>
                            setExpandedContactId(isExpanded ? null : c.contactId)
                          }
                          className="text-[#9CA3AF] hover:text-[#1E9A80]"
                          title={`${previousCalls.length} previous call${previousCalls.length === 1 ? '' : 's'} to same prospect`}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ) : null}
                    </td>
                    <td className="px-2 py-2.5">
                      {c.status === 'missed' ? (
                        <PhoneMissed className="w-3.5 h-3.5 text-[#EF4444]" />
                      ) : c.status === 'voicemail' ? (
                        <Voicemail className="w-3.5 h-3.5 text-[#9CA3AF]" />
                      ) : (
                        STATUS_ICON[c.direction]
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="font-semibold text-[#1A1A1A]">
                        {contact?.name ?? '—'}
                      </div>
                      <div className="text-[10px] text-[#9CA3AF] tabular-nums">
                        {contact?.phone}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-[#6B7280]">{agent?.name ?? '—'}</td>
                    <td className="px-2 py-2.5">
                      <span className="text-[11px] font-medium capitalize text-[#6B7280]">
                        {c.status}
                      </span>
                    </td>
                    {/* PR 36 (Hugo 2026-04-27): show the contact's
                        current pipeline stage on each call row so
                        the agent can see where the lead landed
                        without opening the call. */}
                    <td className="px-2 py-2.5">
                      {(() => {
                        const stage = contact?.pipelineColumnId
                          ? columns.find((col) => col.id === contact.pipelineColumnId)
                          : undefined;
                        if (!stage) {
                          return <span className="text-[10px] text-[#9CA3AF]">—</span>;
                        }
                        return (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{
                              background: `${stage.colour}1A`,
                              color: stage.colour,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: stage.colour }}
                            />
                            {stage.name}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {c.durationSec > 0 ? formatDuration(c.durationSec) : '—'}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {formatPence(c.costPence)}
                    </td>
                    <td className="px-2 py-2.5 text-[11px] text-[#9CA3AF] tabular-nums">
                      {new Date(c.startedAt).toLocaleString('en-GB', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.recordingUrl && (
                          <button
                            onClick={() => setPlaying(isPlaying ? null : c.id)}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#1E9A80] bg-[#ECFDF5] hover:bg-[#1E9A80] hover:text-white rounded-[8px] transition-colors"
                            title="Play recording"
                          >
                            {isPlaying ? (
                              <>
                                <Pause className="w-3 h-3" /> Pause
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3" /> Play
                              </>
                            )}
                          </button>
                        )}
                        {c.aiSummary && (
                          <button
                            className="p-1.5 hover:bg-[#ECFDF5] rounded text-[#1E9A80]"
                            title={c.aiSummary}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setTranscriptCallId(c.id)}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#6B7280] bg-[#F3F3EE] hover:bg-[#1A1A1A] hover:text-white rounded-[8px] transition-colors"
                          title="View transcript (Hugo 2026-04-26)"
                        >
                          <MessageSquare className="w-3 h-3" /> Transcript
                        </button>
                        <Link
                          to={`/smsv2/calls/${c.id}`}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#1E9A80] hover:bg-[#1E9A80] hover:text-white rounded-[8px] transition-colors"
                          title="Reopen the call room — transcript, recording, coach events, follow-ups"
                        >
                          <ExternalLink className="w-3 h-3" /> Open call room
                        </Link>
                      </div>
                    </td>
                  </tr>

                  {/* Inline player — real audio element with signed URL */}
                  {isPlaying && c.recordingUrl && (
                    <tr key={`${c.id}-player`}>
                      <td colSpan={10} className="px-4 py-3 bg-[#ECFDF5]/40">
                        {signedUrl ? (
                          <div className="flex items-center gap-3">
                            <audio
                              src={signedUrl}
                              controls
                              autoPlay
                              className="flex-1 h-9"
                              data-testid="recording-audio"
                            />
                            <a
                              href={signedUrl}
                              download
                              className="text-[11px] text-[#1E9A80] hover:underline"
                            >
                              Download
                            </a>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 text-[12px] text-[#6B7280]">
                            <span className="inline-block w-2 h-2 rounded-full bg-[#1E9A80] animate-pulse" />
                            Loading recording…
                          </div>
                        )}
                        {c.aiSummary && (
                          <div className="mt-2 text-[12px] text-[#1A1A1A] italic bg-white rounded-lg p-2 border border-[#E5E7EB]">
                            <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mr-2">
                              AI summary
                            </span>
                            "{c.aiSummary}"
                          </div>
                        )}
                      </td>
                    </tr>
                  )}

                  {/* Expanded — previous calls to same prospect */}
                  {isExpanded && (
                    <tr key={`${c.id}-expand`}>
                      <td colSpan={10} className="px-4 py-3 bg-[#F3F3EE]/40">
                        <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-2">
                          Previous calls to {contact?.name} ({previousCalls.length})
                        </div>
                        <div className="space-y-1.5">
                          {previousCalls.map((p) => {
                            const pAgent = agents.find((x) => x.id === p.agentId);
                            return (
                              <div
                                key={p.id}
                                className="flex items-center gap-2 text-[12px] py-1.5 px-2 bg-white rounded-lg border border-[#E5E7EB]"
                              >
                                {p.status === 'missed' ? (
                                  <PhoneMissed className="w-3 h-3 text-[#EF4444]" />
                                ) : (
                                  STATUS_ICON[p.direction]
                                )}
                                <span className="text-[#6B7280] capitalize">
                                  {p.direction} {p.status}
                                </span>
                                <span className="text-[#9CA3AF] text-[11px]">
                                  · {pAgent?.name}
                                </span>
                                <span className="text-[#9CA3AF] text-[11px]">
                                  · {formatRelativeTime(p.startedAt)}
                                </span>
                                <span className="ml-auto tabular-nums text-[11px]">
                                  {p.durationSec > 0 ? formatDuration(p.durationSec) : '—'}
                                </span>
                                {p.recordingUrl && (
                                  <button className="p-1 text-[#1E9A80] hover:bg-[#ECFDF5] rounded">
                                    <Play className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filteredCalls.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-[#9CA3AF]">
                  No calls match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {transcriptCallId && (() => {
        const tCall = calls.find((c) => c.id === transcriptCallId);
        const tContact = tCall ? contacts.find((c) => c.id === tCall.contactId) : null;
        const callerLabel = tContact?.name?.trim().split(/\s+/)[0] ?? 'Caller';
        return (
          <CallTranscriptModal
            callId={transcriptCallId}
            callerLabel={callerLabel}
            onClose={() => setTranscriptCallId(null)}
          />
        );
      })()}
    </div>
  );
}
