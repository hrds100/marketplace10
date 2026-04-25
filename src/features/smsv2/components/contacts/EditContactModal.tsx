import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { Agent, Contact } from '../../types';
import { MOCK_AGENTS } from '../../data/mockAgents';
import { ACTIVE_PIPELINE } from '../../data/mockPipelines';

interface Props {
  contact: Contact | null;
  onClose: () => void;
  onSave: (c: Contact) => void;
  /**
   * Real agents from useAgentsToday() etc. When provided, replaces
   * MOCK_AGENTS in the owner dropdown so the saved owner_agent_id is
   * a real profiles.id (UUID), not a synthetic mock id like "a-hugo".
   */
  agents?: Agent[];
}

export default function EditContactModal({ contact, onClose, onSave, agents }: Props) {
  // Real agents when provided, mock fallback so dev/Storybook still works.
  const ownerOptions = agents && agents.length > 0 ? agents : MOCK_AGENTS;
  const [draft, setDraft] = useState<Contact | null>(contact);
  const [newField, setNewField] = useState({ key: '', value: '' });
  const [newTag, setNewTag] = useState('');

  // Sync draft whenever the modal opens for a new contact (or closes)
  useEffect(() => {
    setDraft(contact);
    setNewField({ key: '', value: '' });
    setNewTag('');
  }, [contact]);

  if (!contact || !draft) return null;

  const set = <K extends keyof Contact>(k: K, v: Contact[K]) =>
    setDraft({ ...draft, [k]: v });

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-[560px] bg-white rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.18)] overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-[#1A1A1A]">Edit contact</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#F3F3EE]">
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px]"
              />
            </Field>
            <Field label="Phone">
              <input
                value={draft.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px] tabular-nums"
              />
            </Field>
            <Field label="Email">
              <input
                value={draft.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px]"
              />
            </Field>
            <Field label="Deal value (£)">
              <input
                type="number"
                value={draft.dealValuePence ? draft.dealValuePence / 100 : ''}
                onChange={(e) =>
                  set(
                    'dealValuePence',
                    e.target.value ? parseInt(e.target.value, 10) * 100 : undefined
                  )
                }
                className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px] tabular-nums"
              />
            </Field>
            <Field label="Owner">
              <select
                value={draft.ownerAgentId ?? ''}
                onChange={(e) => set('ownerAgentId', e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px] bg-white"
              >
                <option value="">Unassigned</option>
                {ownerOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pipeline stage">
              <select
                value={draft.pipelineColumnId ?? ''}
                onChange={(e) => set('pipelineColumnId', e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-[10px] bg-white"
              >
                <option value="">— None —</option>
                {ACTIVE_PIPELINE.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {draft.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#F3F3EE] text-[#6B7280] pl-2 pr-1 py-0.5 rounded-full"
                >
                  #{t}
                  <button
                    onClick={() =>
                      set(
                        'tags',
                        draft.tags.filter((x) => x !== t)
                      )
                    }
                    className="text-[#9CA3AF] hover:text-[#EF4444]"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTag.trim()) {
                    set('tags', [...draft.tags, newTag.trim()]);
                    setNewTag('');
                  }
                }}
                placeholder="Add tag + Enter"
                className="flex-1 px-3 py-1.5 text-[12px] border border-[#E5E7EB] rounded-[10px]"
              />
              <button
                onClick={() => {
                  if (newTag.trim()) {
                    set('tags', [...draft.tags, newTag.trim()]);
                    setNewTag('');
                  }
                }}
                className="px-3 text-[#1E9A80] hover:bg-[#ECFDF5] rounded-[10px]"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Custom fields */}
          <div>
            <Label>Custom fields</Label>
            <div className="space-y-1.5 mb-2">
              {Object.entries(draft.customFields).map(([k, v]) => (
                <div key={k} className="flex gap-1.5 items-center">
                  <input
                    value={k}
                    readOnly
                    className="w-[40%] px-2 py-1 text-[12px] bg-[#F3F3EE]/60 border border-[#E5E7EB] rounded-[8px] text-[#6B7280]"
                  />
                  <input
                    value={v}
                    onChange={(e) =>
                      set('customFields', {
                        ...draft.customFields,
                        [k]: e.target.value,
                      })
                    }
                    className="flex-1 px-2 py-1 text-[12px] border border-[#E5E7EB] rounded-[8px]"
                  />
                  <button
                    onClick={() => {
                      const cf = { ...draft.customFields };
                      delete cf[k];
                      set('customFields', cf);
                    }}
                    className="text-[#9CA3AF] hover:text-[#EF4444] p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                value={newField.key}
                onChange={(e) => setNewField({ ...newField, key: e.target.value })}
                placeholder="Field name"
                className="w-[40%] px-2 py-1 text-[12px] border border-[#E5E7EB] rounded-[8px]"
              />
              <input
                value={newField.value}
                onChange={(e) =>
                  setNewField({ ...newField, value: e.target.value })
                }
                placeholder="Value"
                className="flex-1 px-2 py-1 text-[12px] border border-[#E5E7EB] rounded-[8px]"
              />
              <button
                onClick={() => {
                  if (newField.key.trim()) {
                    set('customFields', {
                      ...draft.customFields,
                      [newField.key.trim()]: newField.value,
                    });
                    setNewField({ key: '', value: '' });
                  }
                }}
                className="px-2 text-[#1E9A80] hover:bg-[#ECFDF5] rounded-[8px]"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 bg-[#F3F3EE]/50 border-t border-[#E5E7EB] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-[12px] text-[#6B7280] hover:text-[#1A1A1A] px-3 py-2"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="bg-[#1E9A80] text-white text-[13px] font-semibold px-4 py-2 rounded-[10px] hover:bg-[#1E9A80]/90 shadow-[0_4px_12px_rgba(30,154,128,0.35)]"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-1">
      {children}
    </div>
  );
}
