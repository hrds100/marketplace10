// PipelinesPage — Phase 4 Kanban board.
// Drag-and-drop contacts across pipeline columns. On drop, writes
// wk_contacts.pipeline_column_id directly (RLS allows the agent who
// owns the contact's campaign).
//
// Phase 4 skeleton:
//   - no follow-up modal on requires_followup columns (logged deferred)
//   - no automation preview / firing on drop (server triggers do their work,
//     but the UI doesn't echo them yet)
//   - no per-card menu (open / call / sms)
//   - no multiple-pipeline picker — shows ALL columns regardless of pipeline_id

import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePipelineColumns } from '../hooks/usePipelineColumns';
import { useContacts } from '../hooks/useContacts';
import FollowupModal from '../components/pipelines/FollowupModal';
import { useCallerToasts } from '../store/toastsProvider';

export default function PipelinesPage() {
  const { columns, loading: colsLoading } = usePipelineColumns(null);
  const { contacts, loading: contactsLoading } = useContacts({ limit: 500 });
  const [error, setError] = useState<string | null>(null);
  const [followup, setFollowup] = useState<{
    contactId: string;
    contactName: string;
    columnName: string;
    suggestedHours: number;
  } | null>(null);
  const toasts = useCallerToasts();

  // Group contacts by pipeline_column_id (skipping any without a stage).
  const byColumn = useMemo(() => {
    const map = new Map<string, typeof contacts>();
    for (const c of contacts) {
      if (!c.pipelineColumnId) continue;
      const arr = map.get(c.pipelineColumnId) ?? [];
      arr.push(c);
      map.set(c.pipelineColumnId, arr);
    }
    return map;
  }, [contacts]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const onDragEnd = async (e: DragEndEvent) => {
    const contactId = String(e.active.id);
    const targetColumnId = e.over ? String(e.over.id) : null;
    if (!targetColumnId) return;
    const c = contacts.find((x) => x.id === contactId);
    if (!c || c.pipelineColumnId === targetColumnId) return;
    const target = columns.find((x) => x.id === targetColumnId);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: e2 } = await (supabase.from('wk_contacts' as any) as any)
        .update({ pipeline_column_id: targetColumnId })
        .eq('id', contactId);
      if (e2) {
        setError(`Stage move failed: ${e2.message}`);
        return;
      }
      toasts.push(
        `Moved ${c.name} → ${target?.name ?? 'stage'}`,
        'success'
      );
      // Pop follow-up modal if the target column requires one.
      if (target?.requires_followup) {
        const lc = (target.name ?? '').toLowerCase();
        const suggested =
          lc.includes('callback') ? 24 :
          lc.includes('nurtur') ? 24 * 7 :
          lc.includes('interest') ? 48 : 24;
        setFollowup({
          contactId,
          contactName: c.name,
          columnName: target.name,
          suggestedHours: suggested,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto h-full flex flex-col">
      <div className="mb-3">
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">
          Pipelines
        </h1>
        <p className="text-[12px] text-[#6B7280] mt-0.5">
          Drag contacts across columns to update their stage.
        </p>
      </div>

      {error && (
        <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {(colsLoading || contactsLoading) && columns.length === 0 && (
        <div className="text-[12px] text-[#9CA3AF] italic py-8">Loading board…</div>
      )}

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto">
          <div className="inline-flex gap-3 pb-4 min-w-full">
            {columns.map((col) => (
              <Column
                key={col.id}
                id={col.id}
                name={col.name}
                contacts={byColumn.get(col.id) ?? []}
              />
            ))}
          </div>
        </div>
      </DndContext>

      <FollowupModal
        open={!!followup}
        contactId={followup?.contactId ?? null}
        contactName={followup?.contactName}
        columnName={followup?.columnName}
        suggestedHours={followup?.suggestedHours}
        onClose={() => setFollowup(null)}
      />
    </div>
  );
}

interface ColumnProps {
  id: string;
  name: string;
  contacts: { id: string; name: string; phone: string }[];
}

function Column({ id, name, contacts }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`bg-[#F3F3EE]/40 rounded-2xl p-3 w-[280px] flex-shrink-0 flex flex-col ${isOver ? 'ring-2 ring-[#1E9A80]' : ''}`}
    >
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[11px] uppercase tracking-wide text-[#1A1A1A] font-bold">
          {name}
        </span>
        <span className="text-[10px] text-[#9CA3AF] tabular-nums">
          {contacts.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 min-h-[60px]">
        {contacts.map((c) => (
          <ContactCard key={c.id} id={c.id} name={c.name} phone={c.phone} />
        ))}
        {contacts.length === 0 && (
          <div className="text-[11px] text-[#9CA3AF] italic px-1 py-3">
            Empty.
          </div>
        )}
      </div>
    </div>
  );
}

function ContactCard({ id, name, phone }: { id: string; name: string; phone: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white border border-[#E5E7EB] rounded-[10px] px-3 py-2 cursor-grab active:cursor-grabbing select-none ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="text-[12px] font-semibold text-[#1A1A1A] truncate">{name}</div>
      <div className="text-[10px] text-[#6B7280] tabular-nums truncate">
        {phone || '—'}
      </div>
      <Link
        to={`/caller/contacts/${id}`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="text-[10px] text-[#1E9A80] hover:underline mt-0.5 inline-block"
      >
        Open →
      </Link>
    </div>
  );
}
