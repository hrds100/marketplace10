import {
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Voicemail,
  Play,
  Sparkles,
} from 'lucide-react';
import { MOCK_CALLS } from '../data/mockCalls';
import { MOCK_CONTACTS } from '../data/mockContacts';
import { MOCK_AGENTS } from '../data/mockAgents';
import { formatDuration, formatPence, formatRelativeTime } from '../data/helpers';

const STATUS_ICON = {
  inbound: <PhoneIncoming className="w-3.5 h-3.5 text-[#1E9A80]" />,
  outbound: <PhoneOutgoing className="w-3.5 h-3.5 text-[#3B82F6]" />,
};

export default function CallsPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <header>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">Calls</h1>
        <p className="text-[13px] text-[#6B7280]">All call history · recordings · AI summaries</p>
      </header>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#F3F3EE]/50 text-[10px] uppercase tracking-wide text-[#9CA3AF]">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Direction</th>
              <th className="text-left px-2 py-2.5 font-semibold">Contact</th>
              <th className="text-left px-2 py-2.5 font-semibold">Agent</th>
              <th className="text-left px-2 py-2.5 font-semibold">Status</th>
              <th className="text-right px-2 py-2.5 font-semibold">Duration</th>
              <th className="text-right px-2 py-2.5 font-semibold">Cost</th>
              <th className="text-left px-2 py-2.5 font-semibold">When</th>
              <th className="px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {MOCK_CALLS.map((c) => {
              const contact = MOCK_CONTACTS.find((x) => x.id === c.contactId);
              const agent = MOCK_AGENTS.find((x) => x.id === c.agentId);
              return (
                <tr key={c.id} className="hover:bg-[#F3F3EE]/30">
                  <td className="px-4 py-2.5">
                    {c.status === 'missed' ? (
                      <PhoneMissed className="w-3.5 h-3.5 text-[#EF4444]" />
                    ) : c.status === 'voicemail' ? (
                      <Voicemail className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    ) : (
                      STATUS_ICON[c.direction]
                    )}
                  </td>
                  <td className="px-2 py-2.5 font-semibold text-[#1A1A1A]">
                    {contact?.name ?? '—'}
                  </td>
                  <td className="px-2 py-2.5 text-[#6B7280]">{agent?.name ?? '—'}</td>
                  <td className="px-2 py-2.5">
                    <span className="text-[11px] font-medium capitalize text-[#6B7280]">
                      {c.status}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">
                    {c.durationSec > 0 ? formatDuration(c.durationSec) : '—'}
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">
                    {formatPence(c.costPence)}
                  </td>
                  <td className="px-2 py-2.5 text-[11px] text-[#9CA3AF]">
                    {formatRelativeTime(c.startedAt)}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {c.recordingUrl && (
                        <button
                          className="p-1.5 hover:bg-[#ECFDF5] rounded text-[#1E9A80]"
                          title="Play recording"
                        >
                          <Play className="w-3.5 h-3.5" />
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
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
