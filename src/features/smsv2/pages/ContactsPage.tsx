import { Search, Phone, MessageSquare, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MOCK_CONTACTS } from '../data/mockContacts';
import { ACTIVE_PIPELINE } from '../data/mockPipelines';
import { MOCK_AGENTS } from '../data/mockAgents';
import { formatPence, formatRelativeTime } from '../data/helpers';

export default function ContactsPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">Contacts</h1>
          <p className="text-[13px] text-[#6B7280]">{MOCK_CONTACTS.length} contacts in workspace</p>
        </div>
        <button className="bg-[#1E9A80] text-white text-[13px] font-semibold px-4 py-2 rounded-[10px] hover:bg-[#1E9A80]/90 shadow-[0_4px_12px_rgba(30,154,128,0.35)]">
          + New contact
        </button>
      </header>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
          <Search className="w-4 h-4 text-[#9CA3AF]" />
          <input
            placeholder="Search by name, phone, email…"
            className="flex-1 text-[13px] bg-transparent border-0 focus:outline-none"
          />
          <select className="text-[12px] px-2 py-1 bg-[#F3F3EE] border border-[#E5E7EB] rounded-[10px]">
            <option>All stages</option>
            {ACTIVE_PIPELINE.columns.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>
          <select className="text-[12px] px-2 py-1 bg-[#F3F3EE] border border-[#E5E7EB] rounded-[10px]">
            <option>All owners</option>
            {MOCK_AGENTS.map((a) => (
              <option key={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <table className="w-full text-[13px]">
          <thead className="bg-[#F3F3EE]/50 text-[10px] uppercase tracking-wide text-[#9CA3AF]">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Name</th>
              <th className="text-left px-2 py-2.5 font-semibold">Phone</th>
              <th className="text-left px-2 py-2.5 font-semibold">Stage</th>
              <th className="text-left px-2 py-2.5 font-semibold">Owner</th>
              <th className="text-right px-2 py-2.5 font-semibold">Value</th>
              <th className="text-left px-2 py-2.5 font-semibold">Last contact</th>
              <th className="px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {MOCK_CONTACTS.map((c) => {
              const stage = ACTIVE_PIPELINE.columns.find((col) => col.id === c.pipelineColumnId);
              const owner = MOCK_AGENTS.find((a) => a.id === c.ownerAgentId);
              return (
                <tr key={c.id} className="hover:bg-[#F3F3EE]/30">
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/smsv2/contacts/${c.id}`}
                      className="font-semibold text-[#1A1A1A] hover:text-[#1E9A80] flex items-center gap-1.5"
                    >
                      {c.name}
                      {c.isHot && (
                        <Flame
                          className="w-3 h-3 text-[#EF4444]"
                          fill="#EF4444"
                        />
                      )}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5 text-[#6B7280] tabular-nums">{c.phone}</td>
                  <td className="px-2 py-2.5">
                    {stage && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: `${stage.colour}1A`, color: stage.colour }}
                      >
                        {stage.name}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-[#6B7280]">{owner?.name ?? 'Unassigned'}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-[#1A1A1A] font-medium">
                    {c.dealValuePence ? formatPence(c.dealValuePence) : '—'}
                  </td>
                  <td className="px-2 py-2.5 text-[11px] text-[#9CA3AF]">
                    {c.lastContactAt ? formatRelativeTime(c.lastContactAt) : '—'}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <div className="flex justify-end gap-0.5">
                      <button className="p-1.5 hover:bg-[#ECFDF5] rounded text-[#1E9A80]">
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 hover:bg-[#ECFDF5] rounded text-[#1E9A80]">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
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
