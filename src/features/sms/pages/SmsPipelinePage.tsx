import { useNavigate } from 'react-router-dom';
import { Columns3, Loader2 } from 'lucide-react';
import { usePipeline } from '../hooks/usePipeline';
import PipelineBoard from '../components/pipeline/PipelineBoard';

export default function SmsPipelinePage() {
  const navigate = useNavigate();
  const { contacts, stages, isLoading, moveContact } = usePipeline();

  async function handleMoveContact(contactId: string, newStageId: string) {
    try {
      await moveContact({ contactId, stageId: newStageId });
    } catch {
      // Error already handled by hook toast
    }
  }

  function handleCardClick(_contactId: string) {
    navigate('/sms/inbox');
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-[#1E9A80]" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Columns3 className="h-6 w-6 text-[#1E9A80]" />
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Pipeline</h1>
        <span className="text-sm text-[#6B7280]">
          {contacts.length} contacts
        </span>
      </div>

      {/* Board */}
      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Columns3 className="h-12 w-12 text-[#9CA3AF] mb-4" />
          <p className="text-lg font-medium text-[#1A1A1A] mb-1">No contacts in pipeline yet</p>
          <p className="text-sm text-[#6B7280]">
            Assign contacts to pipeline stages to track them here.
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
