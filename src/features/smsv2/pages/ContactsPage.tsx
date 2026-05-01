import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Phone, MessageSquare, Mail, Flame, Pencil, Upload, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPence, formatRelativeTime } from '../data/helpers';
import StageSelector from '../components/shared/StageSelector';
import BulkUploadModal from '../components/contacts/BulkUploadModal';
import ContactSmsModal from '../components/contacts/ContactSmsModal';
import EditContactModal from '../components/contacts/EditContactModal';
import EditableName from '../components/contacts/EditableName';
import { useCurrentAgent } from '../hooks/useCurrentAgent';
import { useSmsV2 } from '../store/SmsV2Store';
import { useContactPersistence, isRealContactId } from '../hooks/useContactPersistence';
import { useAgentsToday } from '../hooks/useAgentsToday';
import { useDialerProModal } from '../layout/DialerProModalContext';
import { toE164 } from '@/core/utils/phone';
import { supabase } from '@/integrations/supabase/client';
import type { Contact } from '../types';

export default function ContactsPage() {
  const { contacts, columns, agents: storeAgents, patchContact, upsertContact, removeContact, pushToast } = useSmsV2();
  const persist = useContactPersistence();
  const navigateTo = useNavigate();
  const { openDialerPro } = useDialerProModal();
  // Prefer real agents (from profiles) for the owner dropdown so saved
  // owner_agent_id is a real UUID, not a mock id like "a-hugo".
  const { agents: realAgents } = useAgentsToday();
  const agents = realAgents.length > 0 ? realAgents : storeAgents;
  // PR 110: search + filters in URL so browser tab switch keeps state.
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const stageFilter = searchParams.get('stage') ?? 'all';
  const ownerFilter = searchParams.get('owner') ?? 'all';
  const setSpParam = (key: string, value: string, fallback: string = '') => {
    const sp = new URLSearchParams(searchParams);
    if (value && value !== fallback) sp.set(key, value);
    else sp.delete(key);
    setSearchParams(sp, { replace: true });
  };
  const setSearch = (v: string) => setSpParam('q', v);
  const setStageFilter = (v: string) => setSpParam('stage', v, 'all');
  const setOwnerFilter = (v: string) => setSpParam('owner', v, 'all');
  const renameContact = async (id: string, name: string) => {
    patchContact(id, { name });
    const res = await persist.patchContact(id, { name });
    if (res !== true) pushToast(`Rename failed: ${res}`, 'error');
    return res;
  };
  const [editing, setEditing] = useState<Contact | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState<Contact | null>(null);
  const [smsTo, setSmsTo] = useState<Contact | null>(null);
  // PR 83: which channel the modal opens with when an icon is clicked.
  // null = picker stays unselected (when clicking the generic Edit/Call buttons).
  const [smsChannel, setSmsChannel] = useState<'sms' | 'whatsapp' | 'email' | null>(null);
  const { firstName: agentFirstName } = useCurrentAgent();

  const startNewContact = () => {
    // Empty draft fed into the existing EditContactModal. Same UX, no
    // separate "New Contact" component needed.
    setCreatingDraft({
      id: `new-${Date.now()}`,
      name: '',
      phone: '',
      email: undefined,
      tags: [],
      isHot: false,
      customFields: {},
      pipelineColumnId: columns[0]?.id,
      createdAt: new Date().toISOString(),
    });
  };

  const saveNewContact = async (draft: Contact) => {
    if (!draft.name.trim() || !draft.phone.trim()) {
      pushToast('Name and phone are required', 'error');
      return;
    }
    const e164 = toE164(draft.phone);
    if (!e164) {
      pushToast('Invalid phone number', 'error');
      return;
    }
    // Drop synthetic mock IDs (e.g. "a-hugo") — createContact will fall back
    // to the current user's auth.uid() when ownerAgentId is missing.
    const ownerAgentId =
      draft.ownerAgentId && isRealContactId(draft.ownerAgentId)
        ? draft.ownerAgentId
        : null;
    const result = await persist.createContact({
      name: draft.name.trim(),
      phone: e164,
      email: draft.email,
      pipelineColumnId: draft.pipelineColumnId ?? null,
      ownerAgentId,
      customFields: draft.customFields,
    });
    if (!result) {
      pushToast('Could not create contact', 'error');
      return;
    }
    upsertContact({ ...draft, id: result.id, phone: e164 });
    setCreatingDraft(null);
    pushToast(
      result.existed
        ? 'Contact with this phone already exists — opened the existing record'
        : 'Contact created',
      result.existed ? 'info' : 'success'
    );
  };

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
    patchContact(id, { pipelineColumnId: col });
    void persist.moveToColumn(id, col);
  };

  const save = (updated: Contact) => {
    // PR 105 (Hugo 2026-04-28): optimistic local + write-through to
    // wk_contacts (name / email / pipeline_column_id). Was UI-only —
    // saved name / email never persisted across reload.
    const prev = contacts.find((c) => c.id === updated.id);
    upsertContact(updated);
    void persist
      .patchContact(updated.id, {
        name: updated.name,
        email: updated.email ?? null,
        pipeline_column_id: updated.pipelineColumnId ?? null,
      })
      .then((result) => {
        if (result === true) {
          pushToast('Saved ✓', 'success');
        } else {
          if (prev) upsertContact(prev);
          pushToast(result ?? 'Save failed — reverted', 'error');
        }
      });
  };

  const [deleting, setDeleting] = useState<string | null>(null);
  const deleteContact = useCallback(async (c: Contact) => {
    if (!confirm(`Delete "${c.name}" (${c.phone})? This cannot be undone.`)) return;
    setDeleting(c.id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('wk_contact_tags' as any) as any).delete().eq('contact_id', c.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('wk_dialer_queue' as any) as any).delete().eq('contact_id', c.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('wk_contacts' as any) as any).delete().eq('id', c.id);
      if (error) throw error;
      removeContact(c.id);
      pushToast('Contact deleted', 'success');
    } catch {
      pushToast('Delete failed', 'error');
    }
    setDeleting(null);
  }, [removeContact, pushToast]);

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
          <button
            onClick={startNewContact}
            className="bg-[#1E9A80] text-white text-[13px] font-semibold px-4 py-2 rounded-[10px] hover:bg-[#1E9A80]/90 shadow-[0_4px_12px_rgba(30,154,128,0.35)]"
          >
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
            {columns.map((c) => (
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
            {agents.map((a) => (
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
              const owner = agents.find((a) => a.id === c.ownerAgentId);
              return (
                <tr key={c.id} className="hover:bg-[#F3F3EE]/30">
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/crm/contacts/${c.id}`}
                      className="font-semibold text-[#1A1A1A] hover:text-[#1E9A80] flex items-center gap-1.5"
                    >
                      <EditableName value={c.name} onSave={(n) => renameContact(c.id, n)} className="font-semibold" />
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
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openDialerPro(c.id);
                        }}
                        className="p-1.5 hover:bg-[#ECFDF5] rounded text-[#1E9A80]"
                        title={`Call ${c.name}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSmsChannel('sms');
                          setSmsTo(c);
                        }}
                        className="p-1.5 hover:bg-[#ECFDF5] rounded text-[#1E9A80]"
                        title={`SMS ${c.name}`}
                        data-testid={`contacts-row-sms-${c.id}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      {/* PR 83: WhatsApp + Email icon shortcuts. Same modal,
                          just opens with the right channel pre-selected. */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSmsChannel('whatsapp');
                          setSmsTo(c);
                        }}
                        className="p-1.5 hover:bg-[#DCFCE7] rounded text-[#25D366]"
                        title={`WhatsApp ${c.name}`}
                        data-testid={`contacts-row-whatsapp-${c.id}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" strokeWidth={2.4} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSmsChannel('email');
                          setSmsTo(c);
                        }}
                        className="p-1.5 hover:bg-[#DBEAFE] rounded text-[#3B82F6]"
                        title={`Email ${c.name}`}
                        data-testid={`contacts-row-email-${c.id}`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void deleteContact(c);
                        }}
                        disabled={deleting === c.id}
                        className="p-1.5 hover:bg-red-50 rounded text-[#9CA3AF] hover:text-red-500"
                        title={`Delete ${c.name}`}
                      >
                        <Trash2 className={`w-3.5 h-3.5 ${deleting === c.id ? 'animate-spin' : ''}`} />
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
      <ContactSmsModal
        contact={smsTo}
        onClose={() => {
          setSmsTo(null);
          setSmsChannel(null);
        }}
        agentFirstName={agentFirstName ?? ''}
        defaultChannel={smsChannel}
      />
      <EditContactModal
        contact={editing}
        agents={agents}
        onClose={() => setEditing(null)}
        onSave={save}
      />
      <EditContactModal
        contact={creatingDraft}
        agents={agents}
        onClose={() => setCreatingDraft(null)}
        onSave={(draft) => void saveNewContact(draft)}
      />
    </div>
  );
}
