import { Phone, User } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import LabelBadge from '../shared/LabelBadge';
import PhoneNumber from '../shared/PhoneNumber';
import type { SmsContact, SmsInternalNote, SmsPipelineStage } from '../../types';

interface ContactInfoPanelProps {
  contact: SmsContact | null;
  open: boolean;
  onClose: () => void;
  stages: SmsPipelineStage[];
  internalNotes: SmsInternalNote[];
}

export default function ContactInfoPanel({
  contact,
  open,
  onClose,
  stages,
  internalNotes,
}: ContactInfoPanelProps) {
  if (!contact) return null;

  const stage = stages.find((s) => s.id === contact.pipelineStageId);

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
            <div>
              <SheetTitle className="text-sm font-semibold text-[#1A1A1A]">
                {contact.displayName ?? 'Unknown'}
              </SheetTitle>
              <PhoneNumber number={contact.phoneNumber} className="text-xs text-[#9CA3AF]" />
            </div>
          </div>
        </SheetHeader>

        <div className="px-4 py-4 space-y-4 overflow-y-auto">
          {/* Labels */}
          {contact.labels.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#6B7280] mb-2">Labels</p>
              <div className="flex flex-wrap gap-1.5">
                {contact.labels.map((l) => (
                  <LabelBadge key={l.id} label={l} />
                ))}
              </div>
            </div>
          )}

          <Separator className="bg-[#E5E7EB]" />

          {/* Pipeline Stage */}
          <div>
            <p className="text-xs font-medium text-[#6B7280] mb-2">Pipeline Stage</p>
            {stage ? (
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: stage.colour }}
                />
                <span className="text-sm text-[#1A1A1A]">{stage.name}</span>
              </div>
            ) : (
              <span className="text-sm text-[#9CA3AF]">Not set</span>
            )}
          </div>

          <Separator className="bg-[#E5E7EB]" />

          {/* Notes */}
          <div>
            <p className="text-xs font-medium text-[#6B7280] mb-2">Notes</p>
            <p className="text-sm text-[#1A1A1A]">
              {contact.notes || <span className="text-[#9CA3AF]">No notes</span>}
            </p>
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
