import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { mockAutomations } from '../data/mockAutomations';
import AutomationsList from '../components/automations/AutomationsList';
import type { SmsAutomation } from '../types';

export default function SmsAutomationsPage() {
  const navigate = useNavigate();
  const [automations, setAutomations] = useState<SmsAutomation[]>(mockAutomations);

  const handleToggle = useCallback((id: string, isActive: boolean) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive } : a))
    );
    toast.success(isActive ? 'Automation activated' : 'Automation paused');
  }, []);

  const handleDelete = useCallback((id: string) => {
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    toast.success('Automation deleted');
  }, []);

  const handleNew = useCallback(() => {
    // Navigate to editor with a new flow id
    navigate('/sms/automations/new');
  }, [navigate]);

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

      {/* Table */}
      <AutomationsList
        automations={automations}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onNew={handleNew}
      />
    </div>
  );
}
