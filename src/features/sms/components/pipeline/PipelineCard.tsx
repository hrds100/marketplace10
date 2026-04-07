import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SmsContact } from '../../types';
import LabelBadge from '../shared/LabelBadge';
import PhoneNumber from '../shared/PhoneNumber';
import { formatDistanceToNow } from 'date-fns';

interface PipelineCardProps {
  contact: SmsContact;
  onClick: () => void;
}

export default function PipelineCard({ contact, onClick }: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: contact.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white border border-[#E5E7EB] rounded-xl p-3 cursor-pointer',
        'hover:shadow-[rgba(0,0,0,0.08)_0_4px_24px_-2px] transition-shadow duration-200',
        isDragging && 'shadow-[rgba(0,0,0,0.1)_0_8px_32px] opacity-90 z-50'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 cursor-grab active:cursor-grabbing text-[#9CA3AF] hover:text-[#6B7280]"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1A1A1A] truncate">
            {contact.displayName || 'Unknown'}
          </p>
          <PhoneNumber number={contact.phoneNumber} className="text-xs text-[#6B7280]" />

          {contact.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {contact.labels.map((label) => (
                <LabelBadge key={label.id} label={label} />
              ))}
            </div>
          )}

          <p className="text-xs text-[#9CA3AF] mt-2">
            {formatDistanceToNow(new Date(contact.updatedAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
}
