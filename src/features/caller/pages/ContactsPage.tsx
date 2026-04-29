// ContactsPage — Phase 4 contact list.
// Search + table view. Click row → /caller/contacts/:id.
//
// Phase 4 skeleton:
//   - no bulk CSV upload (logged as deferred)
//   - no advanced filters (campaign / tag / created-at) beyond the
//     pipeline-column dropdown
//   - no inline edit
//   - no admin "create contact" button — admins use Settings → Contacts (later)

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Upload } from 'lucide-react';
import { useContacts } from '../hooks/useContacts';
import { usePipelineColumns } from '../hooks/usePipelineColumns';
import BulkUploadModal from '../components/contacts/BulkUploadModal';

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const [columnId, setColumnId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { contacts, loading, error } = useContacts({
    pipelineColumnId: columnId,
    search,
  });
  const { columns } = usePipelineColumns(null);

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-4">
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">
          Contacts
        </h1>
        <p className="text-[12px] text-[#6B7280] mt-0.5">
          Search by name, phone, or email. Click a row to open detail.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="w-full pl-10 pr-3 py-2 text-[14px] bg-white border border-[#E5E7EB] rounded-[10px] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/40 focus:border-[#1E9A80]"
          />
        </div>
        <select
          value={columnId ?? ''}
          onChange={(e) => setColumnId(e.target.value || null)}
          className="text-[13px] border border-[#E5E7EB] rounded-[10px] px-3 py-2 bg-white"
        >
          <option value="">All stages</option>
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1A1A1A] bg-white border border-[#E5E7EB] px-3 py-2 rounded-[10px] hover:bg-[#F3F3EE]"
        >
          <Upload className="w-3.5 h-3.5" />
          Bulk import
        </button>
      </div>

      {error && (
        <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        {loading && contacts.length === 0 && (
          <div className="text-[12px] text-[#9CA3AF] italic py-8 text-center">
            Loading contacts…
          </div>
        )}

        {!loading && contacts.length === 0 && !error && (
          <div className="text-[12px] text-[#9CA3AF] italic py-8 text-center">
            No contacts match.
          </div>
        )}

        <table className="w-full text-[13px]">
          <thead className="bg-[#F3F3EE]/50 text-[10px] uppercase tracking-wide text-[#9CA3AF]">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">Name</th>
              <th className="text-left px-4 py-2 font-semibold">Phone</th>
              <th className="text-left px-4 py-2 font-semibold">Email</th>
              <th className="text-left px-4 py-2 font-semibold">Tags</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {contacts.map((c) => (
              <tr key={c.id} className="hover:bg-[#F3F3EE]/30">
                <td className="px-4 py-2 font-semibold text-[#1A1A1A]">{c.name}</td>
                <td className="px-4 py-2 tabular-nums text-[#6B7280]">{c.phone || '—'}</td>
                <td className="px-4 py-2 text-[#6B7280]">{c.email ?? '—'}</td>
                <td className="px-4 py-2 text-[11px] text-[#6B7280]">
                  {c.tags.length > 0 ? c.tags.join(', ') : '—'}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    to={`/caller/contacts/${c.id}`}
                    className="text-[12px] font-semibold text-[#1E9A80] hover:underline"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </div>
  );
}
