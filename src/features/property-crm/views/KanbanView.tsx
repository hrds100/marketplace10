import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useRows, useCreateRow, useUpdateRow } from '../hooks/useRows';

interface Props {
  workspaceId: string;
  searchTerm: string;
}

const DEFAULT_STATUSES = [
  { id: 'active', label: 'Active', color: '#1E9A80' },
  { id: 'onboarding', label: 'Onboarding', color: '#f59e0b' },
  { id: 'paused', label: 'Paused', color: '#6B7280' },
  { id: 'archived', label: 'Archived', color: '#9CA3AF' },
];

export default function KanbanView({ workspaceId, searchTerm }: Props) {
  const navigate = useNavigate();
  const { data: rows = [] } = useRows(workspaceId);
  const createRow = useCreateRow(workspaceId);
  const updateRow = useUpdateRow(workspaceId);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const s of DEFAULT_STATUSES) map.set(s.id, []);
    const filtered = searchTerm.trim()
      ? rows.filter(
          (r) =>
            r.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.address ?? '').toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : rows;
    for (const r of filtered) {
      const key = r.status && map.has(r.status) ? r.status : 'active';
      map.get(key)!.push(r);
    }
    return map;
  }, [rows, searchTerm]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {DEFAULT_STATUSES.map((s) => {
        const items = grouped.get(s.id) ?? [];
        return (
          <div
            key={s.id}
            className="w-[280px] shrink-0 bg-[#FAFAF7] border border-[#E5E7EB] rounded-[12px] flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData('text/plain');
              if (id) updateRow.mutate({ id, patch: { status: s.id } });
            }}
          >
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="text-[12px] font-semibold text-[#1A1A1A]">{s.label}</span>
                <span className="text-[11px] text-[#6B7280]">{items.length}</span>
              </div>
              <button
                onClick={() => createRow.mutate({ status: s.id })}
                className="text-[#6B7280] hover:text-[#1E9A80]"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-2 space-y-2 flex-1 overflow-y-auto">
              {items.map((row) => (
                <div
                  key={row.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', row.id)}
                  onClick={() => navigate(`/properties/${workspaceId}/${row.id}`)}
                  className="bg-white border border-[#E8E5DF] rounded-[8px] p-3 cursor-pointer hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] hover:border-[#1E9A80] transition-all"
                >
                  <div className="text-[13px] font-semibold text-[#0A0A0A] truncate">
                    {row.property_name}
                  </div>
                  {row.address && (
                    <div className="text-[11px] text-[#6B7280] mt-1 truncate">{row.address}</div>
                  )}
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-[11px] text-[#9CA3AF] text-center py-6">No properties</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
