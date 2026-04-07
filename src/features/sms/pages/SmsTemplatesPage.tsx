import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { mockTemplates as initialTemplates } from '../data/mockTemplates';
import type { SmsTemplate } from '../types';
import TemplatesList from '../components/templates/TemplatesList';
import TemplateForm from '../components/templates/TemplateForm';

export default function SmsTemplatesPage() {
  const [templates, setTemplates] = useState<SmsTemplate[]>(initialTemplates);
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

  function handleSave(data: { name: string; body: string; category: string | null }) {
    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id
            ? { ...t, name: data.name, body: data.body, category: data.category, updatedAt: new Date().toISOString() }
            : t
        )
      );
    } else {
      const newTemplate: SmsTemplate = {
        id: `tpl-${Date.now()}`,
        name: data.name,
        body: data.body,
        category: data.category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTemplates((prev) => [newTemplate, ...prev]);
    }
  }

  function handleDelete(templateId: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    toast.success('Template deleted');
  }

  return (
    <div className="max-w-[1440px] mx-auto p-6 md:p-8">
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
