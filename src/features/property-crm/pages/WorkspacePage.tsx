import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Table2, LayoutGrid, Calendar, Image as ImageIcon, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useWorkspace, useRenameWorkspace } from '../hooks/useWorkspaces';
import { useCreateRow } from '../hooks/useRows';
import { useMyWorkspaceRole } from '../hooks/useMyWorkspaceRole';
import TableView from '../views/TableView';
import KanbanView from '../views/KanbanView';
import CalendarView from '../views/CalendarView';
import GalleryView from '../views/GalleryView';
import type { PcrmViewType } from '../types';

const VIEWS: Array<{ id: PcrmViewType; label: string; icon: typeof Table2 }> = [
  { id: 'table', label: 'Table', icon: Table2 },
  { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'gallery', label: 'Gallery', icon: ImageIcon },
];

export default function WorkspacePage() {
  const { workspaceId = '' } = useParams();
  const navigate = useNavigate();
  const { data: workspace, isLoading } = useWorkspace(workspaceId);
  const createRow = useCreateRow(workspaceId);
  const renameWorkspace = useRenameWorkspace();
  const { data: myRole } = useMyWorkspaceRole(workspaceId);
  const canRename = myRole === 'admin';
  const [view, setView] = useState<PcrmViewType>('table');
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) {
    return <div className="px-10 py-10 text-[13px] text-[#6B7280]">Loading workspace…</div>;
  }

  if (!workspace) {
    return <Navigate to="/properties" replace />;
  }

  async function handleAddProperty() {
    const row = await createRow.mutateAsync({});
    navigate(`/properties/${workspaceId}/${row.id}`);
  }

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-5">
        <div className="min-w-0 flex-1">
          {canRename ? (
            <input
              type="text"
              defaultValue={workspace.name}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== workspace.name) {
                  renameWorkspace.mutate({ id: workspace.id, name: next });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') {
                  (e.target as HTMLInputElement).value = workspace.name;
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="text-[22px] font-bold text-[#0A0A0A] bg-transparent border-none outline-none w-full hover:bg-[#F3F3EE] focus:bg-white focus:ring-1 focus:ring-[#1E9A80]/40 rounded px-1 -mx-1"
              title="Click to rename"
            />
          ) : (
            <h1 className="text-[22px] font-bold text-[#0A0A0A]">{workspace.name}</h1>
          )}
          {workspace.description && (
            <p className="text-[13px] text-[#6B7280] mt-0.5">{workspace.description}</p>
          )}
        </div>
        <Button onClick={handleAddProperty} className="bg-[#1E9A80] hover:bg-[#168f74] text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Add property
        </Button>
      </div>

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-[#F3F3EE] p-1 rounded-[10px]">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors ${
                  view === v.id
                    ? 'bg-white text-[#1E9A80] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                    : 'text-[#6B7280] hover:text-[#1A1A1A]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {v.label}
              </button>
            );
          })}
        </div>

        <div className="relative max-w-[280px] flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search properties…"
            className="pl-9 h-9 text-[13px]"
          />
        </div>
      </div>

      {view === 'table' && <TableView workspaceId={workspaceId} searchTerm={searchTerm} />}
      {view === 'kanban' && <KanbanView workspaceId={workspaceId} searchTerm={searchTerm} />}
      {view === 'calendar' && <CalendarView workspaceId={workspaceId} searchTerm={searchTerm} />}
      {view === 'gallery' && <GalleryView workspaceId={workspaceId} searchTerm={searchTerm} />}
    </div>
  );
}
