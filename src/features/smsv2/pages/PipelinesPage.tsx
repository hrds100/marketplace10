import { useState } from 'react';
import { Flame, GripVertical, Pencil } from 'lucide-react';
import { ACTIVE_PIPELINE } from '../data/mockPipelines';
import { formatPence } from '../data/helpers';
import EditContactModal from '../components/contacts/EditContactModal';
import { useSmsV2 } from '../store/SmsV2Store';
import type { Contact } from '../types';

export default function PipelinesPage() {
  const { contacts, columns, upsertContact } = useSmsV2();
  const [editing, setEditing] = useState<Contact | null>(null);

  const save = (updated: Contact) => {
    upsertContact(updated);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">Pipelines</h1>
          <p className="text-[13px] text-[#6B7280]">
            {ACTIVE_PIPELINE.name} · click any card to edit · columns are live outcome buttons
          </p>
        </div>
        <select className="text-[12px] px-3 py-2 bg-white border border-[#E5E7EB] rounded-[10px]">
          <option>{ACTIVE_PIPELINE.name}</option>
          <option>+ New pipeline</option>
        </select>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-3">
        {columns.map((col) => {
          const cards = contacts.filter((c) => c.pipelineColumnId === col.id);
          const totalValue = cards.reduce((s, c) => s + (c.dealValuePence ?? 0), 0);
          return (
            <div
              key={col.id}
              className="w-[280px] flex-shrink-0 bg-[#F3F3EE]/50 rounded-2xl border border-[#E5E7EB] flex flex-col max-h-[75vh]"
            >
              <div
                className="px-3 py-2.5 border-b border-[#E5E7EB] flex items-center gap-2 rounded-t-2xl"
                style={{ background: `${col.colour}10` }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: col.colour }}
                />
                <span
                  className="text-[12px] font-semibold uppercase tracking-wide"
                  style={{ color: col.colour }}
                >
                  {col.name}
                </span>
                <span className="ml-auto text-[11px] text-[#6B7280] tabular-nums">
                  {cards.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {cards.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setEditing(c)}
                    className="group w-full text-left bg-white border border-[#E5E7EB] rounded-xl p-2.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:border-[#1E9A80]/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="w-3 h-3 text-[#9CA3AF] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[#1A1A1A] flex items-center gap-1 truncate">
                          {c.name}
                          {c.isHot && (
                            <Flame
                              className="w-3 h-3 text-[#EF4444] flex-shrink-0"
                              fill="#EF4444"
                            />
                          )}
                          <Pencil className="w-2.5 h-2.5 text-[#9CA3AF] opacity-0 group-hover:opacity-100 ml-auto" />
                        </div>
                        <div className="text-[10px] text-[#6B7280] tabular-nums mt-0.5">
                          {c.phone}
                        </div>
                        {c.dealValuePence && (
                          <div className="text-[11px] font-semibold text-[#1E9A80] tabular-nums mt-1">
                            {formatPence(c.dealValuePence)}
                          </div>
                        )}
                        {c.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {c.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="text-[9px] font-medium bg-[#F3F3EE] text-[#6B7280] px-1.5 py-0.5 rounded"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {cards.length === 0 && (
                  <div className="text-[11px] text-[#9CA3AF] text-center py-4 italic">
                    Empty column
                  </div>
                )}
              </div>
              {totalValue > 0 && (
                <div className="px-3 py-2 border-t border-[#E5E7EB] text-[11px] text-[#6B7280] flex justify-between">
                  <span>Total</span>
                  <span className="font-semibold text-[#1A1A1A] tabular-nums">
                    {formatPence(totalValue)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <EditContactModal
        contact={editing}
        onClose={() => setEditing(null)}
        onSave={save}
      />
    </div>
  );
}
