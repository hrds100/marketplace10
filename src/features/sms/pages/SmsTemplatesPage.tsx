import { useState } from 'react';
import { Plus, FileText, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTemplates } from '../hooks/useTemplates';
import { useWhatsappTemplates } from '../hooks/useWhatsappTemplates';
import type { SmsTemplate } from '../types';
import TemplatesList from '../components/templates/TemplatesList';
import TemplateForm from '../components/templates/TemplateForm';
import WhatsAppTemplatesList from '../components/templates/WhatsAppTemplatesList';
import WhatsAppTemplateForm from '../components/templates/WhatsAppTemplateForm';

export default function SmsTemplatesPage() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const {
    templates: waTemplates,
    isLoading: waLoading,
    fetchTemplates: waFetch,
    createTemplate: waCreate,
    deleteTemplate: waDelete,
  } = useWhatsappTemplates();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [waFormOpen, setWaFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sms');

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

  if (isLoading && activeTab === 'sms') {
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
        </div>

        {activeTab === 'sms' ? (
          <Button
            size="sm"
            onClick={handleNew}
            className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Template
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => setWaFormOpen(true)}
            className="rounded-lg bg-[#25D366] hover:bg-[#25D366]/90 text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New WhatsApp Template
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-[#F3F3EE] rounded-xl p-1">
          <TabsTrigger
            value="sms"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm font-medium px-4"
          >
            <FileText className="h-4 w-4 mr-1.5" />
            SMS Templates
            <span className="ml-2 text-xs text-[#9CA3AF]">{templates.length}</span>
          </TabsTrigger>
          <TabsTrigger
            value="whatsapp"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm font-medium px-4"
          >
            <MessageSquare className="h-4 w-4 mr-1.5" />
            WhatsApp Templates
            <span className="ml-2 text-xs text-[#9CA3AF]">{waTemplates.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sms">
          <TemplatesList templates={templates} onEdit={handleEdit} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppTemplatesList
            templates={waTemplates}
            isLoading={waLoading}
            onFetch={waFetch}
            onDelete={waDelete}
          />
        </TabsContent>
      </Tabs>

      {/* SMS form dialog */}
      <TemplateForm
        template={editingTemplate}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />

      {/* WhatsApp form dialog */}
      <WhatsAppTemplateForm
        open={waFormOpen}
        onClose={() => setWaFormOpen(false)}
        onSave={waCreate}
      />
    </div>
  );
}
