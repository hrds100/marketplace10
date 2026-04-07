import { useState } from 'react';
import { Plus, Pencil, Trash2, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { SmsPipelineStage } from '../../types';

interface StagesSettingsProps {
  stages: SmsPipelineStage[];
  onAdd: (stage: SmsPipelineStage) => void;
  onEdit: (stage: SmsPipelineStage) => void;
  onDelete: (id: string) => void;
}

const COLOUR_OPTIONS = ['#1E9A80', '#EF4444', '#F59E0B', '#6B7280', '#9CA3AF'];

export default function StagesSettings({ stages, onAdd, onEdit, onDelete }: StagesSettingsProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [colour, setColour] = useState(COLOUR_OPTIONS[0]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function startEdit(stage: SmsPipelineStage) {
    setEditingId(stage.id);
    setName(stage.name);
    setColour(stage.colour);
    setAdding(false);
  }

  function startAdd() {
    setAdding(true);
    setEditingId(null);
    setName('');
    setColour(COLOUR_OPTIONS[0]);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setName('');
    setDeleteConfirm(null);
  }

  function save() {
    if (!name.trim()) return;
    if (editingId) {
      onEdit({ id: editingId, name: name.trim(), colour, position: stages.find((s) => s.id === editingId)?.position ?? 0 });
      toast.success('Stage updated');
    } else {
      onAdd({ id: `stg-${Date.now()}`, name: name.trim(), colour, position: stages.length });
      toast.success('Stage added');
    }
    cancel();
  }

  function confirmDelete(id: string) {
    if (deleteConfirm === id) {
      onDelete(id);
      toast.success('Stage deleted');
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
    }
  }

  if (stages.length === 0 && !adding) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-2xl bg-[#F3F3EE] p-4 mb-4">
          <GitBranch className="h-8 w-8 text-[#9CA3AF]" />
        </div>
        <p className="text-[#1A1A1A] font-semibold mb-1">No pipeline stages</p>
        <p className="text-sm text-[#6B7280] mb-4">Create stages to track your contacts</p>
        <Button size="sm" onClick={startAdd} className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Stage
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {stages.map((stage) => (
        <div key={stage.id}>
          {editingId === stage.id ? (
            <InlineForm name={name} colour={colour} colours={COLOUR_OPTIONS} onNameChange={setName} onColourChange={setColour} onSave={save} onCancel={cancel} />
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg border border-[#E5E7EB] bg-white">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: stage.colour }} />
                <span className="text-sm font-medium text-[#1A1A1A]">{stage.name}</span>
                <span className="text-xs text-[#9CA3AF]">Position {stage.position}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => startEdit(stage)} className="h-7 w-7 p-0 text-[#9CA3AF] hover:text-[#1A1A1A]">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => confirmDelete(stage.id)}
                  className={cn('h-7 w-7 p-0', deleteConfirm === stage.id ? 'text-[#EF4444]' : 'text-[#9CA3AF] hover:text-[#EF4444]')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <InlineForm name={name} colour={colour} colours={COLOUR_OPTIONS} onNameChange={setName} onColourChange={setColour} onSave={save} onCancel={cancel} />
      ) : (
        <Button variant="outline" size="sm" onClick={startAdd} className="rounded-lg border-[#E5E7EB] text-[#6B7280]">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Stage
        </Button>
      )}
    </div>
  );
}

function InlineForm({
  name, colour, colours, onNameChange, onColourChange, onSave, onCancel,
}: {
  name: string; colour: string; colours: string[];
  onNameChange: (v: string) => void; onColourChange: (v: string) => void;
  onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-[#1E9A80]/30 bg-[#F3F3EE]/30">
      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Stage name"
        className="h-8 rounded-md border-[#E5E7EB] text-sm flex-1"
        autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
      />
      <div className="flex gap-1.5">
        {colours.map((c) => (
          <button
            key={c}
            onClick={() => onColourChange(c)}
            className={cn(
              'h-6 w-6 rounded-full border-2 transition-colors',
              colour === c ? 'border-[#1A1A1A]' : 'border-transparent',
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <Button size="sm" onClick={onSave} disabled={!name.trim()} className="h-7 rounded-md bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white text-xs">
        Save
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 text-xs text-[#6B7280]">
        Cancel
      </Button>
    </div>
  );
}
