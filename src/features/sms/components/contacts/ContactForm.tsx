import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { SmsContact, SmsLabel, SmsPipeline, SmsPipelineStage } from '../../types';
import LabelBadge from '../shared/LabelBadge';

interface ContactFormProps {
  contact: SmsContact | null;
  labels: SmsLabel[];
  stages: SmsPipelineStage[];
  /** Optional — when provided, stage dropdown groups options by pipeline. */
  pipelines?: SmsPipeline[];
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    displayName: string;
    phoneNumber: string;
    labels: SmsLabel[];
    pipelineStageId: string | null;
    notes: string;
  }) => void;
}

export default function ContactForm({
  contact,
  labels,
  stages,
  pipelines,
  open,
  onClose,
  onSave,
}: ContactFormProps) {
  // Group stages by pipeline when pipelines are passed; otherwise flat.
  const stagesByPipeline = (() => {
    if (!pipelines || pipelines.length === 0) return null;
    const byId = new Map(pipelines.map((p) => [p.id, p] as const));
    const grouped = new Map<string, { pipeline: SmsPipeline; stages: SmsPipelineStage[] }>();
    for (const s of stages) {
      const p = byId.get(s.pipelineId);
      if (!p) continue;
      const bucket = grouped.get(p.id) ?? { pipeline: p, stages: [] };
      bucket.stages.push(s);
      grouped.set(p.id, bucket);
    }
    return Array.from(grouped.values())
      .sort((a, b) => a.pipeline.position - b.pipeline.position)
      .map((g) => ({
        pipeline: g.pipeline,
        stages: g.stages.sort((a, b) => a.position - b.position),
      }));
  })();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [stageId, setStageId] = useState<string>('none');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (contact) {
      setName(contact.displayName || '');
      setPhone(contact.phoneNumber);
      setSelectedLabels(contact.labels.map((l) => l.id));
      setStageId(contact.pipelineStageId || 'none');
      setNotes(contact.notes);
    } else {
      setName('');
      setPhone('');
      setSelectedLabels([]);
      setStageId('none');
      setNotes('');
    }
  }, [contact, open]);

  function handleSubmit() {
    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    onSave({
      displayName: name.trim() || '',
      phoneNumber: phone.trim(),
      labels: labels.filter((l) => selectedLabels.includes(l.id)),
      pipelineStageId: stageId === 'none' ? null : stageId,
      notes: notes.trim(),
    });

    toast.success(contact ? 'Contact updated' : 'Contact added');
    onClose();
  }

  function toggleLabel(labelId: string) {
    setSelectedLabels((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  }

  const isEditing = contact !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A]">
            {isEditing ? 'Edit Contact' : 'Add Contact'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#525252]">Name</Label>
            <Input
              placeholder="John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-[10px] border-[#E5E5E5]"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#525252]">Phone number</Label>
            <Input
              placeholder="+447700100000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-[10px] border-[#E5E5E5]"
            />
          </div>

          {/* Labels */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#525252]">Labels</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between rounded-[10px] border-[#E5E5E5] font-normal"
                >
                  {selectedLabels.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {labels
                        .filter((l) => selectedLabels.includes(l.id))
                        .map((l) => (
                          <LabelBadge key={l.id} label={l} />
                        ))}
                    </div>
                  ) : (
                    <span className="text-[#9CA3AF]">Select labels...</span>
                  )}
                  <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                {labels.map((label) => (
                  <label
                    key={label.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#F3F3EE] cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedLabels.includes(label.id)}
                      onCheckedChange={() => toggleLabel(label.id)}
                    />
                    <LabelBadge label={label} />
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {/* Stage */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#525252]">Pipeline stage</Label>
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger className="rounded-[10px] border-[#E5E5E5]">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No stage</SelectItem>
                {stagesByPipeline
                  ? stagesByPipeline.flatMap((g) =>
                      g.stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {g.pipeline.name} → {s.name}
                        </SelectItem>
                      ))
                    )
                  : stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#525252]">Notes</Label>
            <Textarea
              placeholder="Add notes about this contact..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-[10px] border-[#E5E5E5] resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-lg border-[#E5E7EB]">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
          >
            {isEditing ? 'Save Changes' : 'Add Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
