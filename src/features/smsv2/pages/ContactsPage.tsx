import { useState, useMemo } from 'react';
import { Search, Phone, MessageSquare, Flame, Pencil, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MOCK_CONTACTS } from '../data/mockContacts';
import { ACTIVE_PIPELINE } from '../data/mockPipelines';
import { MOCK_AGENTS } from '../data/mockAgents';
import { formatPence, formatRelativeTime } from '../data/helpers';
import StageSelector from '../components/shared/StageSelector';
import BulkUploadModal from '../components/contacts/BulkUploadModal';
import EditContactModal from '../components/contacts/EditContactModal';
import type { Contact } from '../types';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (stageFilter !== 'all' && c.pipelineColumnId !== stageFilter) return false;
      if (ownerFilter !== 'all' && c.ownerAgentId !== ownerFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.name.toLowerCase().includes(q) &&
          !c.phone.toLowerCase().includes(q) &&
          !(c.email ?? '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [contacts, search, stageFilter, ownerFilter]);

  const setStage = (id: string, col: string) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pipelineColumnId: col } : c))
    );
  };

  const save = (updated: Contact) => {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">Contacts</h1>
          <p className="text-[13px] text-[#6B7280]">
            {filtered.length} of {contacts.length} contacts
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-1.5 border border-[#E5E7EB] bg-white text-[#1A1A1A] text-[13px] font-medium px-3 py-2 rounded-[10px] hover:bg-[#F3F3EE]"
          >
            <Upload className="w-3.5 h-3.5" /> Bulk import
          </button>
          <button className="bg-[#1E9A80] text-white text-[13px] font-semibold px-4 py-2 rounded-[10px] hover:bg-[#1E9A80]/90 shadow-[0_4px_12px_rgba(30,154,128,0.35)]">
            + New contact
          </button>
        </div>
      </header>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
          <Search className="w-4 h-4 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email…"
            className="flex-1 text-[13px] bg-transparent border-0 focus:outline-none"
          />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="text-[12px] px-2 py-1 bg-[#F3F3EE] border border-[#E5E7EB] rounded-[10px]"
          >
            <option value="all">All stages</option>
            {ACTIVE_PIPELINE.columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="text-[12px] px-2 py-1 bg-[#F3F3EE] border border-[#E5E7EB] rounded-[10px]"
          >
            <option value="all">All owners</option>
            {MOCK_AGENTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
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
            {filtered.map((c) => {
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
                    <StageSelector
                      value={c.pipelineColumnId}
                      onChange={(col) => setStage(c.id, col)}
                      size="sm"
                    />
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
                      <button
                        onClick={() => setEditing(c)}
                        className="p-1.5 hover:bg-[#F3F3EE] rounded text-[#6B7280] hover:text-[#1A1A1A]"
                        title="Edit contact"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[12px] text-[#9CA3AF] italic">
                  No contacts match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
      <EditContactModal
        contact={editing}
        onClose={() => setEditing(null)}
        onSave={save}
      />
    </div>
  );
}
