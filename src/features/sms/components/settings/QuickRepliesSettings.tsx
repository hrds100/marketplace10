import { useState } from 'react';
import { Plus, Pencil, Trash2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { SmsQuickReply } from '../../types';

interface QuickRepliesSettingsProps {
  replies: SmsQuickReply[];
  onAdd: (reply: SmsQuickReply) => void;
  onEdit: (reply: SmsQuickReply) => void;
  onDelete: (id: string) => void;
}

export default function QuickRepliesSettings({ replies, onAdd, onEdit, onDelete }: QuickRepliesSettingsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<SmsQuickReply | null>(null);
  const [label, setLabel] = useState('');
  const [body, setBody] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function openAdd() {
    setEditingReply(null);
    setLabel('');
    setBody('');
    setDialogOpen(true);
  }

  function openEdit(reply: SmsQuickReply) {
    setEditingReply(reply);
    setLabel(reply.label);
    setBody(reply.body);
    setDialogOpen(true);
  }

  function save() {
    if (!label.trim() || !body.trim()) return;
    if (editingReply) {
      onEdit({ ...editingReply, label: label.trim(), body: body.trim() });
      toast.success('Quick reply updated');
    } else {
      onAdd({ id: `qr-${Date.now()}`, label: label.trim(), body: body.trim(), position: replies.length });
      toast.success('Quick reply added');
    }
    setDialogOpen(false);
  }

  function confirmDelete(id: string) {
    if (deleteConfirm === id) {
      onDelete(id);
      toast.success('Quick reply deleted');
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
    }
  }

  if (replies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-2xl bg-[#F3F3EE] p-4 mb-4">
          <Zap className="h-8 w-8 text-[#9CA3AF]" />
        </div>
        <p className="text-[#1A1A1A] font-semibold mb-1">No quick replies</p>
        <p className="text-sm text-[#6B7280] mb-4">Create quick replies for faster messaging</p>
        <Button size="sm" onClick={openAdd} className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Quick Reply
        </Button>
        <ReplyDialog open={dialogOpen} onClose={() => setDialogOpen(false)} label={label} body={body} onLabelChange={setLabel} onBodyChange={setBody} onSave={save} editing={!!editingReply} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {replies.map((reply) => (
        <div
          key={reply.id}
          className="flex items-start justify-between p-3 rounded-lg border border-[#E5E7EB] bg-white"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1A1A1A]">{reply.label}</p>
            <p className="text-sm text-[#6B7280] truncate">{reply.body}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-3">
            <Button variant="ghost" size="sm" onClick={() => openEdit(reply)} className="h-7 w-7 p-0 text-[#9CA3AF] hover:text-[#1A1A1A]">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => confirmDelete(reply.id)}
              className={cn('h-7 w-7 p-0', deleteConfirm === reply.id ? 'text-[#EF4444]' : 'text-[#9CA3AF] hover:text-[#EF4444]')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={openAdd} className="rounded-lg border-[#E5E7EB] text-[#6B7280]">
        <Plus className="h-4 w-4 mr-1.5" />
        Add Quick Reply
      </Button>

      <ReplyDialog open={dialogOpen} onClose={() => setDialogOpen(false)} label={label} body={body} onLabelChange={setLabel} onBodyChange={setBody} onSave={save} editing={!!editingReply} />
    </div>
  );
}

function ReplyDialog({
  open, onClose, label, body, onLabelChange, onBodyChange, onSave, editing,
}: {
  open: boolean; onClose: () => void;
  label: string; body: string;
  onLabelChange: (v: string) => void; onBodyChange: (v: string) => void;
  onSave: () => void; editing: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A]">{editing ? 'Edit' : 'Add'} Quick Reply</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium text-[#1A1A1A]">Label</Label>
            <Input
              value={label}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder="e.g. Will reply"
              className="mt-1.5 rounded-lg border-[#E5E7EB]"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-[#1A1A1A]">Message body</Label>
            <Textarea
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              placeholder="Type your quick reply message..."
              className="mt-1.5 rounded-lg border-[#E5E7EB] resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-lg border-[#E5E7EB]">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={!label.trim() || !body.trim()}
            className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
          >
            {editing ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
