import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Columns3 } from 'lucide-react';
import { mockContacts as initialContacts } from '../data/mockContacts';
import { mockStages } from '../data/mockStages';
import type { SmsContact } from '../types';
import PipelineBoard from '../components/pipeline/PipelineBoard';

export default function SmsPipelinePage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<SmsContact[]>(initialContacts);

  function handleMoveContact(contactId: string, newStageId: string) {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId ? { ...c, pipelineStageId: newStageId } : c
      )
    );
  }

  function handleCardClick(contactId: string) {
    navigate('/sms/inbox');
  }

  // Contacts that have a pipeline stage
  const pipelineContacts = contacts.filter((c) => c.pipelineStageId !== null);

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Columns3 className="h-6 w-6 text-[#1E9A80]" />
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Pipeline</h1>
        <span className="text-sm text-[#6B7280]">
          {pipelineContacts.length} contacts
        </span>
      </div>

      {/* Board */}
      {pipelineContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Columns3 className="h-12 w-12 text-[#9CA3AF] mb-4" />
          <p className="text-lg font-medium text-[#1A1A1A] mb-1">No contacts in pipeline yet</p>
          <p className="text-sm text-[#6B7280]">
            Assign contacts to pipeline stages to track them here.
          </p>
        </div>
      ) : (
        <PipelineBoard
          contacts={pipelineContacts}
          stages={mockStages}
          onMoveContact={handleMoveContact}
          onCardClick={handleCardClick}
        />
      )}
    </div>
  );
}
