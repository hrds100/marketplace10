import { useState } from 'react';
import {
  DndContext,
  closestCorners,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { SmsContact, SmsPipelineStage } from '../../types';
import PipelineColumn from './PipelineColumn';
import PipelineCard from './PipelineCard';

interface PipelineBoardProps {
  contacts: SmsContact[];
  stages: SmsPipelineStage[];
  onMoveContact: (contactId: string, newStageId: string) => void;
  onCardClick: (contactId: string) => void;
}

export default function PipelineBoard({
  contacts,
  stages,
  onMoveContact,
  onCardClick,
}: PipelineBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeContact = activeId ? contacts.find((c) => c.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const contactId = active.id as string;
    const overId = over.id as string;

    // If dropped on a stage column
    const targetStage = stages.find((s) => s.id === overId);
    if (targetStage) {
      onMoveContact(contactId, targetStage.id);
      return;
    }

    // If dropped on another card, move to that card's stage
    const targetContact = contacts.find((c) => c.id === overId);
    if (targetContact && targetContact.pipelineStageId) {
      onMoveContact(contactId, targetContact.pipelineStageId);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages
          .sort((a, b) => a.position - b.position)
          .map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              contacts={contacts.filter((c) => c.pipelineStageId === stage.id)}
              onCardClick={onCardClick}
            />
          ))}
      </div>

      <DragOverlay>
        {activeContact ? (
          <PipelineCard contact={activeContact} onClick={() => {}} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
