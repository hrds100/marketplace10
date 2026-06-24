import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Trash2, GripVertical, ExternalLink, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CellRenderer from '../components/CellRenderer';
import { useFields, useCreateField, useDeleteField, useRenameField, useReorderFields } from '../hooks/useFields';
import { useRows, useCreateRow, useDeleteRow, useUpdateRow } from '../hooks/useRows';
import { useCells, useSetCell } from '../hooks/useCells';
import { useMyWorkspaceRole } from '../hooks/useMyWorkspaceRole';
import type { PcrmField, PcrmFieldType, PcrmRow, PcrmCell } from '../types';

interface Props {
  workspaceId: string;
  searchTerm: string;
}

const FIELD_TYPE_LABELS: Record<PcrmFieldType, string> = {
  text: 'Text',
  long_text: 'Long text',
  number: 'Number',
  date: 'Date',
  checkbox: 'Checkbox',
  select: 'Select',
  multi_select: 'Multi-select',
  url: 'URL',
  email: 'Email',
  phone: 'Phone',
  status: 'Status',
  currency: 'Currency',
  user: 'User',
};

function SortableHeader({
  field,
  onRename,
  onDelete,
  canDelete,
}: {
  field: PcrmField;
  onRename: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <th
      ref={setNodeRef}
      style={style}
      className="border-r border-[#E5E7EB] bg-[#FAFAF7] sticky top-0 z-10 group"
    >
      <div className="flex items-center gap-1 px-3 py-2 min-w-[180px]">
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 cursor-grab text-[#9CA3AF] hover:text-[#1A1A1A]"
          aria-label="Drag column"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <span className="text-[12px] font-semibold text-[#1A1A1A] flex-1 truncate" onDoubleClick={onRename}>
          {field.name}
        </span>
        <span className="text-[10px] text-[#9CA3AF] uppercase">
          {FIELD_TYPE_LABELS[field.field_type]}
        </span>
        {canDelete && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-[#9CA3AF] hover:text-[#dc2626] ml-1"
            aria-label="Delete column"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </th>
  );
}

export default function TableView({ workspaceId, searchTerm }: Props) {
  const navigate = useNavigate();
  const { data: fields = [] } = useFields(workspaceId);
  const { data: rows = [] } = useRows(workspaceId);
  const { data: cells = [] } = useCells(workspaceId);
  const { data: myRole } = useMyWorkspaceRole(workspaceId);
  const canDelete = myRole === 'admin';

  const createField = useCreateField(workspaceId);
  const renameField = useRenameField(workspaceId);
  const deleteField = useDeleteField(workspaceId);
  const reorderFields = useReorderFields(workspaceId);
  const createRow = useCreateRow(workspaceId);
  const updateRow = useUpdateRow(workspaceId);
  const deleteRow = useDeleteRow(workspaceId);
  const setCell = useSetCell(workspaceId);

  const cellMap = useMemo(() => {
    const m = new Map<string, PcrmCell>();
    for (const c of cells) m.set(`${c.row_id}:${c.field_id}`, c);
    return m;
  }, [cells]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(
      (r) =>
        r.property_name.toLowerCase().includes(q) ||
        (r.address ?? '').toLowerCase().includes(q),
    );
  }, [rows, searchTerm]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = fields.findIndex((f) => f.id === active.id);
    const newIdx = fields.findIndex((f) => f.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(fields, oldIdx, newIdx);
    reorderFields.mutate(next.map((f) => f.id));
  }

  function handleAddField(field_type: PcrmFieldType) {
    const name = window.prompt(`New ${FIELD_TYPE_LABELS[field_type]} column name`, FIELD_TYPE_LABELS[field_type]);
    if (!name) return;
    createField.mutate({ name, field_type, position: fields.length });
  }

  function handleRenameField(field: PcrmField) {
    const next = window.prompt('Rename column', field.name);
    if (next && next.trim() && next !== field.name) {
      renameField.mutate({ id: field.id, name: next.trim() });
    }
  }

  function handleDeleteField(field: PcrmField) {
    if (!window.confirm(`Delete column "${field.name}"? Values in this column will be lost.`)) return;
    deleteField.mutate(field.id);
  }

  function handleDeleteRow(row: PcrmRow) {
    if (!window.confirm(`Delete "${row.property_name}"?`)) return;
    deleteRow.mutate(row.id);
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[12px] overflow-hidden">
      <div className="overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="border-r border-[#E5E7EB] bg-[#FAFAF7] sticky top-0 left-0 z-20 min-w-[280px]">
                  <div className="px-3 py-2 text-[12px] font-semibold text-[#1A1A1A] text-left">
                    Property
                  </div>
                </th>
                <SortableContext items={fields.map((f) => f.id)} strategy={horizontalListSortingStrategy}>
                  {fields.map((f) => (
                    <SortableHeader
                      key={f.id}
                      field={f}
                      onRename={() => handleRenameField(f)}
                      onDelete={() => handleDeleteField(f)}
                      canDelete={canDelete}
                    />
                  ))}
                </SortableContext>
                <th className="bg-[#FAFAF7] sticky top-0 z-10 w-[120px]">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full px-3 py-2 text-[12px] text-[#1E9A80] font-semibold flex items-center gap-1 hover:bg-[#ECFDF5]">
                        <Plus className="w-3.5 h-3.5" />
                        Add column
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {(Object.keys(FIELD_TYPE_LABELS) as PcrmFieldType[])
                        .filter((t) => t !== 'multi_select' && t !== 'user')
                        .map((t) => (
                          <DropdownMenuItem key={t} onClick={() => handleAddField(t)}>
                            {FIELD_TYPE_LABELS[t]}
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-t border-[#E5E7EB] hover:bg-[#FAFAF7] group">
                  <td className="border-r border-[#E5E7EB] sticky left-0 bg-white group-hover:bg-[#FAFAF7] z-10 min-w-[280px]">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <input
                        type="text"
                        value={row.property_name}
                        onChange={(e) => updateRow.mutate({ id: row.id, patch: { property_name: e.target.value } })}
                        className="text-[13px] font-medium text-[#0A0A0A] bg-transparent border-none outline-none flex-1 min-w-0"
                      />
                      <button
                        onClick={() => navigate(`/properties/${workspaceId}/${row.id}`)}
                        className="opacity-0 group-hover:opacity-100 text-[#6B7280] hover:text-[#1E9A80]"
                        title="Open record"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteRow(row)}
                          className="opacity-0 group-hover:opacity-100 text-[#9CA3AF] hover:text-[#dc2626]"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  {fields.map((f) => {
                    const cell = cellMap.get(`${row.id}:${f.id}`);
                    return (
                      <td key={f.id} className="border-r border-[#E5E7EB] p-0">
                        <CellRenderer
                          field={f}
                          value={cell?.value ?? null}
                          onChange={(next) =>
                            setCell.mutate({ row_id: row.id, field_id: f.id, value: next })
                          }
                          compact
                        />
                      </td>
                    );
                  })}
                  <td />
                </tr>
              ))}
              <tr>
                <td colSpan={fields.length + 2} className="border-t border-[#E5E7EB]">
                  <Button
                    variant="ghost"
                    onClick={() => createRow.mutate({})}
                    className="w-full justify-start text-[#6B7280] hover:text-[#1E9A80] hover:bg-[#FAFAF7] rounded-none h-10"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add property
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  );
}
