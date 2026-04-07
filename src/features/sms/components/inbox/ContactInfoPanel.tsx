import { useState } from 'react';
import { Check, Pencil, Phone, Plus, Tag, User, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import LabelBadge from '../shared/LabelBadge';
import PhoneNumber from '../shared/PhoneNumber';
import { useUpdateContact } from '../../hooks/useUpdateContact';
import { useContactLabels } from '../../hooks/useContactLabels';
import { useLabels } from '../../hooks/useLabels';
import { useStages } from '../../hooks/useStages';
import type { SmsContact, SmsInternalNote } from '../../types';

interface ContactInfoPanelProps {
  contact: SmsContact | null;
  open: boolean;
  onClose: () => void;
  internalNotes: SmsInternalNote[];
  onContactUpdated?: () => void;
}

export default function ContactInfoPanel({
  contact,
  open,
  onClose,
  internalNotes,
  onContactUpdated,
}: ContactInfoPanelProps) {
  const { updateContact, isUpdating } = useUpdateContact();
  const { addLabel, removeLabel, isUpdating: labelsUpdating } = useContactLabels();
  const { labels: allLabels } = useLabels();
  const { stages } = useStages();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  if (!contact) return null;

  const stage = stages.find((s) => s.id === contact.pipelineStageId);
  const contactLabelIds = new Set(contact.labels.map((l) => l.id));

  function startEditName() {
    setNameValue(contact?.displayName ?? '');
    setEditingName(true);
  }

  async function saveName() {
    if (!contact) return;
    try {
      await updateContact(contact.id, { display_name: nameValue.trim() || null as never });
      toast.success('Contact name updated');
      setEditingName(false);
      onContactUpdated?.();
    } catch {
      // toast already shown by hook
    }
  }

  function startEditNotes() {
    setNotesValue(contact?.notes ?? '');
    setEditingNotes(true);
  }

  async function saveNotes() {
    if (!contact) return;
    try {
      await updateContact(contact.id, { notes: notesValue.trim() });
      toast.success('Notes updated');
      setEditingNotes(false);
      onContactUpdated?.();
    } catch {
      // toast already shown by hook
    }
  }

  async function handleStageChange(stageId: string) {
    if (!contact) return;
    try {
      await updateContact(contact.id, { pipeline_stage_id: stageId });
      toast.success('Stage updated');
      onContactUpdated?.();
    } catch {
      // toast already shown by hook
    }
  }

  async function handleToggleLabel(labelId: string, isChecked: boolean) {
    if (!contact) return;
    try {
      if (isChecked) {
        await addLabel(contact.id, labelId);
        toast.success('Label added');
      } else {
        await removeLabel(contact.id, labelId);
        toast.success('Label removed');
      }
      onContactUpdated?.();
    } catch {
      // toast already shown by hook
    }
  }

  async function handleRemoveLabel(labelId: string) {
    if (!contact) return;
    try {
      await removeLabel(contact.id, labelId);
      toast.success('Label removed');
      onContactUpdated?.();
    } catch {
      // toast already shown by hook
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[340px] sm:w-[380px] p-0">
        <SheetHeader className="px-4 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#F3F3EE] flex items-center justify-center">
              {contact.displayName ? (
                <span className="text-sm font-medium text-[#1A1A1A]">
                  {contact.displayName
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              ) : (
                <Phone className="h-4 w-4 text-[#9CA3AF]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="h-7 text-sm"
                    placeholder="Contact name"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveName();
                      if (e.key === 'Escape') setEditingName(false);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={saveName}
                    disabled={isUpdating}
                  >
                    <Check className="h-3.5 w-3.5 text-[#1E9A80]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setEditingName(false)}
                  >
                    <X className="h-3.5 w-3.5 text-[#6B7280]" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <SheetTitle className="text-sm font-semibold text-[#1A1A1A] truncate">
                    {contact.displayName ?? 'Unknown'}
                  </SheetTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={startEditName}
                  >
                    <Pencil className="h-3 w-3 text-[#9CA3AF]" />
                  </Button>
                </div>
              )}
              <PhoneNumber number={contact.phoneNumber} className="text-xs text-[#9CA3AF]" />
            </div>
          </div>
        </SheetHeader>

        <div className="px-4 py-4 space-y-4 overflow-y-auto">
          {/* Labels */}
          <div>
            <p className="text-xs font-medium text-[#6B7280] mb-2">Labels</p>
            <div className="flex flex-wrap gap-1.5">
              {contact.labels.map((l) => (
                <span key={l.id} className="inline-flex items-center gap-1">
                  <LabelBadge label={l} />
                  <button
                    type="button"
                    className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-[#E5E7EB] transition-colors"
                    onClick={() => handleRemoveLabel(l.id)}
                    disabled={labelsUpdating}
                  >
                    <X className="h-2.5 w-2.5 text-[#6B7280]" />
                  </button>
                </span>
              ))}

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-[#6B7280] hover:text-[#1A1A1A]"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add label
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-2" align="start">
                  <p className="text-xs font-medium text-[#6B7280] mb-2 px-1">All labels</p>
                  <div className="space-y-1">
                    {allLabels.map((label) => (
                      <label
                        key={label.id}
                        className="flex items-center gap-2 px-1 py-1 rounded hover:bg-[#F3F3EE] cursor-pointer"
                      >
                        <Checkbox
                          checked={contactLabelIds.has(label.id)}
                          onCheckedChange={(checked) =>
                            handleToggleLabel(label.id, checked === true)
                          }
                          disabled={labelsUpdating}
                        />
                        <Tag
                          className="h-3 w-3 shrink-0"
                          style={{ color: label.colour }}
                        />
                        <span className="text-sm text-[#1A1A1A]">{label.name}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator className="bg-[#E5E7EB]" />

          {/* Pipeline Stage */}
          <div>
            <p className="text-xs font-medium text-[#6B7280] mb-2">Pipeline Stage</p>
            <Select
              value={contact.pipelineStageId ?? ''}
              onValueChange={handleStageChange}
              disabled={isUpdating}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select stage">
                  {stage ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: stage.colour }}
                      />
                      <span>{stage.name}</span>
                    </div>
                  ) : (
                    'Not set'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.colour }}
                      />
                      <span>{s.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-[#E5E7EB]" />

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-[#6B7280]">Notes</p>
              {!editingNotes && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-xs text-[#6B7280]"
                  onClick={startEditNotes}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  className="text-sm min-h-[80px]"
                  placeholder="Add notes..."
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white text-xs"
                    onClick={saveNotes}
                    disabled={isUpdating}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setEditingNotes(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#1A1A1A]">
                {contact.notes || <span className="text-[#9CA3AF]">No notes</span>}
              </p>
            )}
          </div>

          <Separator className="bg-[#E5E7EB]" />

          {/* Internal Notes */}
          <div>
            <p className="text-xs font-medium text-[#6B7280] mb-2">Internal Notes</p>
            {internalNotes.length === 0 ? (
              <p className="text-sm text-[#9CA3AF]">No internal notes</p>
            ) : (
              <div className="space-y-2">
                {internalNotes.map((note) => (
                  <div key={note.id} className="bg-[#F3F3EE] rounded-lg p-2.5">
                    <p className="text-sm text-[#1A1A1A]">{note.body}</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">
                      {note.authorName} &middot;{' '}
                      {new Date(note.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="bg-[#E5E7EB]" />

          {/* Assigned To */}
          <div>
            <p className="text-xs font-medium text-[#6B7280] mb-2">Assigned To</p>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-[#9CA3AF]" />
              <span className="text-sm text-[#1A1A1A]">
                {contact.assignedTo ?? <span className="text-[#9CA3AF]">Unassigned</span>}
              </span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
