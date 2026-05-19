import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Columns3, Loader2, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePipeline } from '../hooks/usePipeline';
import { usePipelines } from '../hooks/usePipelines';
import { useStages } from '../hooks/useStages';
import PipelineBoard from '../components/pipeline/PipelineBoard';

const PIPELINE_STORAGE_KEY = 'sms-pipeline-active-id';

export default function SmsPipelinePage() {
  const navigate = useNavigate();
  const { pipelines, isLoading: pipelinesLoading, createPipeline, renamePipeline, deletePipeline } = usePipelines();

  // Persist the operator's current pipeline selection across reloads.
  const [activePipelineId, setActivePipelineId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(PIPELINE_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!pipelines.length) return;
    if (!activePipelineId || !pipelines.some((p) => p.id === activePipelineId)) {
      const defaultId = pipelines[0].id;
      setActivePipelineId(defaultId);
      try { localStorage.setItem(PIPELINE_STORAGE_KEY, defaultId); } catch { /* ignore */ }
    }
  }, [pipelines, activePipelineId]);

  const { contacts, stages, isLoading, moveContact } = usePipeline(activePipelineId ?? undefined);
  const { createStage, renameStage, deleteStage } = useStages(activePipelineId ?? undefined);

  // Header edit state
  const [renamingPipeline, setRenamingPipeline] = useState(false);
  const [renamingPipelineValue, setRenamingPipelineValue] = useState('');
  const [renamingStageId, setRenamingStageId] = useState<string | null>(null);
  const [renamingStageValue, setRenamingStageValue] = useState('');

  const activePipeline = pipelines.find((p) => p.id === activePipelineId) ?? null;

  function selectPipeline(id: string) {
    setActivePipelineId(id);
    try { localStorage.setItem(PIPELINE_STORAGE_KEY, id); } catch { /* ignore */ }
  }

  async function handleCreatePipeline() {
    const name = window.prompt('New pipeline name')?.trim();
    if (!name) return;
    const row = await createPipeline(name);
    if (row?.id) selectPipeline(row.id);
  }

  function startRenamePipeline() {
    if (!activePipeline) return;
    setRenamingPipeline(true);
    setRenamingPipelineValue(activePipeline.name);
  }

  async function commitRenamePipeline() {
    if (!activePipeline) return;
    const name = renamingPipelineValue.trim();
    if (!name || name === activePipeline.name) {
      setRenamingPipeline(false);
      return;
    }
    await renamePipeline({ id: activePipeline.id, name });
    setRenamingPipeline(false);
  }

  async function handleDeletePipeline() {
    if (!activePipeline) return;
    if (!window.confirm(`Delete pipeline "${activePipeline.name}" and all its columns? Contacts on this pipeline's columns will be unlinked (not deleted).`)) return;
    await deletePipeline(activePipeline.id);
    const next = pipelines.find((p) => p.id !== activePipeline.id);
    if (next) selectPipeline(next.id);
  }

  async function handleAddColumn() {
    if (!activePipelineId) return;
    const name = window.prompt('New column name')?.trim();
    if (!name) return;
    await createStage({ name, pipelineId: activePipelineId });
  }

  function startRenameStage(id: string, currentName: string) {
    setRenamingStageId(id);
    setRenamingStageValue(currentName);
  }

  async function commitRenameStage() {
    if (!renamingStageId) return;
    const name = renamingStageValue.trim();
    if (!name) { setRenamingStageId(null); return; }
    await renameStage({ id: renamingStageId, name });
    setRenamingStageId(null);
  }

  async function handleDeleteStage(id: string, name: string) {
    if (!window.confirm(`Delete column "${name}"? Contacts in this column will be unlinked.`)) return;
    await deleteStage(id);
  }

  async function handleMoveContact(contactId: string, newStageId: string) {
    try { await moveContact({ contactId, stageId: newStageId }); }
    catch { /* hook toasts */ }
  }

  function handleCardClick() { navigate('/sms/inbox'); }

  if (pipelinesLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-[#1E9A80]" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Columns3 className="h-6 w-6 text-[#1E9A80] flex-shrink-0" />
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Pipeline</h1>

          {/* Pipeline switcher */}
          {!renamingPipeline ? (
            <select
              value={activePipelineId ?? ''}
              onChange={(e) => selectPipeline(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-[10px] border border-[#E5E7EB] bg-white text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          ) : (
            <input
              autoFocus
              value={renamingPipelineValue}
              onChange={(e) => setRenamingPipelineValue(e.target.value)}
              onBlur={commitRenamePipeline}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRenamePipeline();
                else if (e.key === 'Escape') setRenamingPipeline(false);
              }}
              className="text-sm px-3 py-1.5 rounded-[10px] border border-[#1E9A80]/40 focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30"
            />
          )}

          {activePipeline && (
            <>
              <button
                onClick={startRenamePipeline}
                className="p-1.5 rounded hover:bg-[#F3F3EE] text-[#6B7280] hover:text-[#1A1A1A]"
                title="Rename pipeline"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDeletePipeline}
                disabled={pipelines.length <= 1}
                className="p-1.5 rounded hover:bg-[#FEF2F2] text-[#6B7280] hover:text-[#EF4444] disabled:opacity-30 disabled:cursor-not-allowed"
                title={pipelines.length <= 1 ? 'Cannot delete the last pipeline' : 'Delete pipeline'}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          <span className="text-sm text-[#6B7280] ml-2">{contacts.length} contacts</span>

          <div className="flex-1" />

          <Button
            size="sm"
            variant="outline"
            onClick={handleCreatePipeline}
            className="rounded-lg gap-1.5 border-[#E5E7EB] text-[#1A1A1A]"
          >
            <Plus className="h-3.5 w-3.5" /> Pipeline
          </Button>
          <Button
            size="sm"
            onClick={handleAddColumn}
            disabled={!activePipelineId}
            className="rounded-lg gap-1.5 bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Column
          </Button>
        </div>

        {/* Column manager strip — rename / delete each column inline */}
        {stages.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            {stages
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((stage) => (
                <div
                  key={stage.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E5E7EB] bg-white text-[12px]"
                  style={{ borderLeft: `3px solid ${stage.colour}` }}
                >
                  {renamingStageId === stage.id ? (
                    <>
                      <input
                        autoFocus
                        value={renamingStageValue}
                        onChange={(e) => setRenamingStageValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRenameStage();
                          else if (e.key === 'Escape') setRenamingStageId(null);
                        }}
                        className="text-[12px] px-1 py-0.5 rounded border border-[#1E9A80]/40 focus:outline-none w-32"
                      />
                      <button
                        onClick={commitRenameStage}
                        className="p-0.5 rounded text-[#1E9A80] hover:bg-[#ECFDF5]"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setRenamingStageId(null)}
                        className="p-0.5 rounded text-[#6B7280] hover:bg-[#F3F3EE]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-[#1A1A1A]">{stage.name}</span>
                      <button
                        onClick={() => startRenameStage(stage.id, stage.name)}
                        className="p-0.5 rounded text-[#9CA3AF] hover:text-[#1A1A1A] hover:bg-[#F3F3EE]"
                        title="Rename"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteStage(stage.id, stage.name)}
                        className="p-0.5 rounded text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEF2F2]"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Board */}
      {stages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Columns3 className="h-12 w-12 text-[#9CA3AF] mb-4" />
          <p className="text-lg font-medium text-[#1A1A1A] mb-1">No columns yet</p>
          <p className="text-sm text-[#6B7280] mb-4">Add columns to start tracking contacts.</p>
          <Button
            size="sm"
            onClick={handleAddColumn}
            className="rounded-lg gap-1.5 bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Add first column
          </Button>
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Columns3 className="h-12 w-12 text-[#9CA3AF] mb-4" />
          <p className="text-lg font-medium text-[#1A1A1A] mb-1">No contacts in this pipeline yet</p>
          <p className="text-sm text-[#6B7280]">
            Move contacts from <span className="text-[#1E9A80] font-medium">Contacts</span> to a column to track them here.
          </p>
        </div>
      ) : (
        <PipelineBoard
          contacts={contacts}
          stages={stages}
          onMoveContact={handleMoveContact}
          onCardClick={handleCardClick}
        />
      )}
    </div>
  );
}
