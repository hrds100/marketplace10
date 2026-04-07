import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAutomations } from '../hooks/useAutomations';
import AutomationsList from '../components/automations/AutomationsList';

export default function SmsAutomationsPage() {
  const navigate = useNavigate();
  const {
    automations,
    isLoading,
    toggleActive,
    deleteAutomation,
    createAutomation,
  } = useAutomations();

  const handleToggle = useCallback(
    async (id: string, isActive: boolean) => {
      try {
        await toggleActive({ id, is_active: isActive });
        toast.success(isActive ? 'Automation activated' : 'Automation paused');
      } catch {
        // toast.error already handled inside hook
      }
    },
    [toggleActive]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteAutomation(id);
        toast.success('Automation deleted');
      } catch {
        // toast.error already handled inside hook
      }
    },
    [deleteAutomation]
  );

  const handleNew = useCallback(async () => {
    try {
      const newId = await createAutomation({
        name: 'Untitled Flow',
        trigger_type: 'new_message',
        trigger_config: {},
        flow_json: {
          nodes: [
            {
              id: 'n-1',
              type: 'DEFAULT',
              position: { x: 300, y: 0 },
              data: {
                name: 'Start',
                isStart: true,
                prompt: 'Greet the user and ask how you can help with their property search.',
                modelOptions: { temperature: 0.7 },
              },
            },
          ],
          edges: [],
          globalPrompt: 'You are a helpful property assistant for NFStay. Be professional and concise.',
        },
      });
      navigate(`/sms/automations/${newId}`);
    } catch {
      // toast.error already handled inside hook
    }
  }, [createAutomation, navigate]);

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1A1A1A]">Automations</h1>
        <Button
          onClick={handleNew}
          className="bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white rounded-xl gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New Flow
        </Button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#9CA3AF] animate-spin" />
        </div>
      ) : (
        <AutomationsList
          automations={automations}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onNew={handleNew}
        />
      )}
    </div>
  );
}
