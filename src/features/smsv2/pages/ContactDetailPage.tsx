import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, MessageSquare, Flame, Play } from 'lucide-react';
import { MOCK_CONTACTS } from '../data/mockContacts';
import { MOCK_CALLS, MOCK_SMS, MOCK_ACTIVITIES, MOCK_TASKS } from '../data/mockCalls';
import { ACTIVE_PIPELINE } from '../data/mockPipelines';
import { MOCK_AGENTS } from '../data/mockAgents';
import {
  formatDuration,
  formatPence,
  formatRelativeTime,
  formatTimeOnly,
} from '../data/helpers';
import { useActiveCallCtx } from '../components/live-call/ActiveCallContext';

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const contact = MOCK_CONTACTS.find((c) => c.id === id);
  const { startCall } = useActiveCallCtx();

  if (!contact) {
    return (
      <div className="p-6">
        <Link to="/smsv2/contacts" className="text-[13px] text-[#1E9A80] hover:underline">
          ← Back to contacts
        </Link>
        <p className="mt-4 text-[#6B7280]">Contact not found.</p>
      </div>
    );
  }

  const calls = MOCK_CALLS.filter((c) => c.contactId === contact.id);
  const sms = MOCK_SMS.filter((m) => m.contactId === contact.id);
  const activities = MOCK_ACTIVITIES.filter((a) => a.contactId === contact.id);
  const tasks = MOCK_TASKS.filter((t) => t.contactId === contact.id);
  const owner = MOCK_AGENTS.find((a) => a.id === contact.ownerAgentId);
  const stage = ACTIVE_PIPELINE.columns.find((c) => c.id === contact.pipelineColumnId);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <Link
        to="/smsv2/contacts"
        className="inline-flex items-center gap-1 text-[12px] text-[#6B7280] hover:text-[#1E9A80]"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Contacts
      </Link>

      <header className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#1E9A80]/15 text-[#1E9A80] text-[20px] font-bold flex items-center justify-center">
          {contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold text-[#1A1A1A] tracking-tight">{contact.name}</h1>
            {contact.isHot && (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-[#FEF2F2] text-[#EF4444] px-2 py-0.5 rounded-full">
                <Flame className="w-3 h-3" /> HOT
              </span>
            )}
          </div>
          <div className="text-[13px] text-[#6B7280] tabular-nums">{contact.phone}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => startCall(contact.id)}
            className="flex items-center gap-1.5 bg-[#1E9A80] text-white text-[13px] font-semibold px-4 py-2 rounded-[10px] hover:bg-[#1E9A80]/90 shadow-[0_4px_12px_rgba(30,154,128,0.35)]"
          >
            <Phone className="w-4 h-4" /> Call
          </button>
          <button className="flex items-center gap-1.5 border border-[#E5E7EB] bg-white text-[#1A1A1A] text-[13px] font-medium px-4 py-2 rounded-[10px] hover:bg-[#F3F3EE]">
            <MessageSquare className="w-4 h-4" /> Text
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4">
        {/* Left — about */}
        <aside className="col-span-12 lg:col-span-3 space-y-3">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
                Owner
              </div>
              <div className="text-[13px] text-[#1A1A1A]">{owner?.name ?? 'Unassigned'}</div>
            </div>
            {contact.email && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
                  Email
                </div>
                <div className="text-[13px] text-[#1A1A1A]">{contact.email}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
                Stage
              </div>
              {stage && (
                <span
                  className="inline-flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-full mt-0.5"
                  style={{ background: `${stage.colour}1A`, color: stage.colour }}
                >
                  {stage.name}
                </span>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
                Tags
              </div>
              <div className="flex gap-1 flex-wrap mt-1">
                {contact.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] font-medium bg-[#F3F3EE] text-[#6B7280] px-1.5 py-0.5 rounded"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
              Custom fields
            </div>
            {Object.entries(contact.customFields).map(([k, v]) => (
              <div key={k}>
                <div className="text-[10px] text-[#9CA3AF]">{k}</div>
                <div className="text-[12px] text-[#1A1A1A]">{v}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* Centre — timeline */}
        <section className="col-span-12 lg:col-span-6 bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E7EB]">
            <h3 className="text-[13px] font-semibold text-[#1A1A1A]">Timeline</h3>
          </div>
          <div className="divide-y divide-[#E5E7EB] max-h-[600px] overflow-y-auto">
            {calls.map((c) => (
              <div key={c.id} className="px-4 py-3">
                <div className="text-[11px] text-[#9CA3AF] tabular-nums">
                  {formatRelativeTime(c.startedAt)} ·{' '}
                  <span className="text-[#6B7280]">
                    {c.direction} {c.status}
                  </span>{' '}
                  · {formatDuration(c.durationSec)} · {formatPence(c.costPence)}
                </div>
                {c.recordingUrl && (
                  <button className="mt-1 text-[11px] flex items-center gap-1 text-[#1E9A80] hover:underline">
                    <Play className="w-3 h-3" /> Play recording
                  </button>
                )}
                {c.aiSummary && (
                  <div className="mt-1.5 text-[12px] text-[#1A1A1A] italic bg-[#ECFDF5]/50 p-2 rounded-lg leading-snug">
                    AI: "{c.aiSummary}"
                  </div>
                )}
              </div>
            ))}
            {sms.map((m) => (
              <div key={m.id} className="px-4 py-3">
                <div className="text-[11px] text-[#9CA3AF] tabular-nums">
                  {formatTimeOnly(m.sentAt)} ·{' '}
                  <span className="text-[#6B7280]">SMS {m.direction}</span>
                </div>
                <div className="mt-1 text-[13px] text-[#1A1A1A]">{m.body}</div>
              </div>
            ))}
            {activities.map((a) => (
              <div key={a.id} className="px-4 py-2 text-[12px]">
                <span className="text-[#6B7280]">• {a.title}</span>
                <span className="text-[10px] text-[#9CA3AF] ml-2">{formatRelativeTime(a.ts)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Right — opportunities + tasks */}
        <aside className="col-span-12 lg:col-span-3 space-y-3">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-2">
              Opportunity
            </div>
            <div className="text-[14px] font-semibold text-[#1A1A1A]">{stage?.name ?? '—'}</div>
            <div className="text-[12px] text-[#6B7280] mt-0.5">
              Value:{' '}
              <span className="font-semibold text-[#1E9A80] tabular-nums">
                {contact.dealValuePence ? formatPence(contact.dealValuePence) : '—'}
              </span>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E5E7EB]">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide">
                Tasks
              </h3>
            </div>
            <div className="p-3 space-y-2">
              {tasks.length === 0 && (
                <div className="text-[12px] text-[#9CA3AF]">No open tasks.</div>
              )}
              {tasks.map((t) => (
                <label key={t.id} className="flex items-start gap-2 text-[12px]">
                  <input type="checkbox" defaultChecked={t.done} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="text-[#1A1A1A]">{t.title}</div>
                    <div className="text-[10px] text-[#9CA3AF]">
                      due {formatRelativeTime(t.dueAt)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
