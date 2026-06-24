import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, Copy, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useWorkspaces,
  useDeleteWorkspace,
  useDuplicateWorkspace,
  useRenameWorkspace,
} from '../hooks/useWorkspaces';
import NewWorkspaceDialog from '../components/NewWorkspaceDialog';
import type { PcrmWorkspace } from '../types';

export default function PropertyCrmHome() {
  const navigate = useNavigate();
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const duplicate = useDuplicateWorkspace();
  const remove = useDeleteWorkspace();
  const rename = useRenameWorkspace();
  const [openNew, setOpenNew] = useState(false);

  async function handleRename(ws: PcrmWorkspace) {
    const next = window.prompt('Rename workspace', ws.name);
    if (next && next.trim() && next !== ws.name) {
      await rename.mutateAsync({ id: ws.id, name: next.trim() });
    }
  }

  async function handleDelete(ws: PcrmWorkspace) {
    if (!window.confirm(`Delete "${ws.name}"? This removes all rows, fields and credentials.`)) return;
    await remove.mutateAsync(ws.id);
  }

  return (
    <div className="px-10 py-10 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-[#0A0A0A] tracking-tight">Property CRM</h1>
          <p className="text-[14px] text-[#6B7280] mt-1">
            Internal staff workspaces for property operations.
          </p>
        </div>
        <Button
          onClick={() => setOpenNew(true)}
          className="bg-[#1E9A80] hover:bg-[#168f74] text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New workspace
        </Button>
      </div>

      {isLoading && <div className="text-[13px] text-[#6B7280]">Loading workspaces…</div>}

      {!isLoading && workspaces.length === 0 && (
        <div className="border border-dashed border-[#E5E7EB] bg-white rounded-[16px] p-12 text-center">
          <div className="w-12 h-12 rounded-[12px] bg-[#ECFDF5] flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-[#1E9A80]" />
          </div>
          <h2 className="text-[16px] font-bold text-[#0A0A0A]">No workspaces yet</h2>
          <p className="text-[13px] text-[#6B7280] mt-2">
            Create your first CRM to start tracking properties, credentials and operations.
          </p>
          <Button
            onClick={() => setOpenNew(true)}
            className="mt-5 bg-[#1E9A80] hover:bg-[#168f74] text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create workspace
          </Button>
        </div>
      )}

      {!isLoading && workspaces.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="group relative bg-white border border-[#E8E5DF] rounded-[14px] p-5 hover:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer"
              onClick={() => navigate(`/properties/${ws.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[10px] bg-[#ECFDF5] flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[#1E9A80]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-bold text-[#0A0A0A] truncate">{ws.name}</h3>
                  {ws.description && (
                    <p className="text-[12px] text-[#6B7280] mt-1 line-clamp-2">{ws.description}</p>
                  )}
                </div>
              </div>
              <div
                className="mt-4 pt-3 border-t border-[#E8E5DF] flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[11px] text-[#9CA3AF]">
                  Created {new Date(ws.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRename(ws)}
                    className="p-1.5 rounded hover:bg-[#F3F3EE] text-[#6B7280]"
                    title="Rename"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => duplicate.mutate(ws)}
                    className="p-1.5 rounded hover:bg-[#F3F3EE] text-[#6B7280]"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(ws)}
                    className="p-1.5 rounded hover:bg-[#FEF2F2] text-[#dc2626]"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewWorkspaceDialog
        open={openNew}
        onOpenChange={setOpenNew}
        onCreated={(id) => navigate(`/properties/${id}`)}
      />
    </div>
  );
}
