import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import type { SmsContact, SmsPipelineStage } from '../../types';
import PipelineCard from './PipelineCard';

interface PipelineColumnProps {
  stage: SmsPipelineStage;
  contacts: SmsContact[];
  onCardClick: (contactId: string) => void;
}

export default function PipelineColumn({ stage, contacts, onCardClick }: PipelineColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id });

  return (
    <div className="flex-shrink-0 w-72">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-1 h-5 rounded-full" style={{ backgroundColor: stage.colour }} />
        <h3 className="text-sm font-semibold text-[#1A1A1A]">{stage.name}</h3>
        <span className="text-xs font-medium text-[#6B7280] bg-[#F3F3EE] rounded-full px-2 py-0.5">
          {contacts.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 min-h-[200px] p-2 rounded-xl border border-dashed transition-colors duration-200',
          isOver ? 'border-[#1E9A80] bg-[#ECFDF5]' : 'border-transparent'
        )}
      >
        <SortableContext items={contacts.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {contacts.map((contact) => (
            <PipelineCard
              key={contact.id}
              contact={contact}
              onClick={() => onCardClick(contact.id)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
