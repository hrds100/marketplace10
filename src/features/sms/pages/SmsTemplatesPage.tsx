import { useState } from 'react';
import { Plus, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTemplates } from '../hooks/useTemplates';
import type { SmsTemplate } from '../types';
import TemplatesList from '../components/templates/TemplatesList';
import TemplateForm from '../components/templates/TemplateForm';

export default function SmsTemplatesPage() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);

  function handleNew() {
    setEditingTemplate(null);
    setFormOpen(true);
  }

  function handleEdit(tpl: SmsTemplate) {
    setEditingTemplate(tpl);
    setFormOpen(true);
  }

  async function handleSave(data: { name: string; body: string; category: string | null }) {
    try {
      if (editingTemplate) {
        await updateTemplate({ id: editingTemplate.id, ...data });
      } else {
        await createTemplate(data);
      }
    } catch {
      // Error already handled by hook toast
    }
  }

  async function handleDelete(templateId: string) {
    try {
      await deleteTemplate(templateId);
    } catch {
      // Error already handled by hook toast
    }
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-[#1E9A80]" />
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Templates</h1>
          <span className="text-sm text-[#6B7280]">{templates.length} total</span>
        </div>

        <Button
          size="sm"
          onClick={handleNew}
          className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Template
        </Button>
      </div>

      {/* List */}
      <TemplatesList templates={templates} onEdit={handleEdit} onDelete={handleDelete} />

      {/* Form dialog */}
      <TemplateForm
        template={editingTemplate}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
