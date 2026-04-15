import { useState } from 'react';
import { Plus, Upload, Download, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { useContacts } from '../hooks/useContacts';
import { useLabels } from '../hooks/useLabels';
import { useStages } from '../hooks/useStages';
import { useCampaigns } from '../hooks/useCampaigns';
import type { SmsContact, SmsLabel } from '../types';
import ContactsTable from '../components/contacts/ContactsTable';
import ContactForm from '../components/contacts/ContactForm';
import CsvImportDialog from '../components/contacts/CsvImportDialog';
import BulkActionsBar from '../components/contacts/BulkActionsBar';
import PushToCampaignDialog from '../components/contacts/PushToCampaignDialog';

export default function SmsContactsPage() {
  const {
    contacts, isLoading, createContact, updateContact, deleteContact,
    bulkCreateContacts, bulkUpdateStage, bulkAddLabel, bulkDelete, pushToCampaign,
  } = useContacts();
  const { labels } = useLabels();
  const { stages } = useStages();
  const { campaigns } = useCampaigns();
  const [formOpen, setFormOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<SmsContact | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pushDialogOpen, setPushDialogOpen] = useState(false);

  function handleAddContact() {
    setEditingContact(null);
    setFormOpen(true);
  }

  function handleEditContact(contact: SmsContact) {
    setEditingContact(contact);
    setFormOpen(true);
  }

  async function handleSaveContact(data: {
    displayName: string;
    phoneNumber: string;
    labels: SmsLabel[];
    pipelineStageId: string | null;
    notes: string;
  }) {
    try {
      if (editingContact) {
        await updateContact({
          id: editingContact.id,
          phone_number: data.phoneNumber,
          display_name: data.displayName || null,
          notes: data.notes,
          pipeline_stage_id: data.pipelineStageId,
          labelIds: data.labels.map((l) => l.id),
        });
      } else {
        await createContact({
          phone_number: data.phoneNumber,
          display_name: data.displayName || undefined,
          notes: data.notes || undefined,
          pipeline_stage_id: data.pipelineStageId,
          labelIds: data.labels.map((l) => l.id),
        });
      }
    } catch {
      // Error already handled by hook toast
    }
  }

  async function handleDeleteContact(contactId: string) {
    try {
      await deleteContact(contactId);
      toast.success('Contact deleted');
    } catch {
      // Error already handled by hook toast
    }
  }

  function handleExportCsv() {
    const csvData = contacts.map((c) => ({
      name: c.displayName || '',
      phone: c.phoneNumber,
      labels: c.labels.map((l) => l.name).join(', '),
      notes: c.notes,
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sms-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Contacts exported');
  }

  const selectedArray = Array.from(selectedIds);

  async function handleBulkAssignStage(stageId: string | null) {
    await bulkUpdateStage({ contactIds: selectedArray, stageId });
    setSelectedIds(new Set());
  }

  async function handleBulkAddLabel(labelId: string) {
    await bulkAddLabel({ contactIds: selectedArray, labelId });
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    await bulkDelete(selectedArray);
    setSelectedIds(new Set());
  }

  async function handlePushToCampaign(campaignId: string) {
    await pushToCampaign({ contactIds: selectedArray, campaignId });
    setSelectedIds(new Set());
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-[#1E9A80]" />
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Contacts</h1>
          <span className="text-sm text-[#6B7280]">{contacts.length} total</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCsvOpen(true)}
            className="rounded-lg border-[#E5E7EB]"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Import CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="rounded-lg border-[#E5E7EB]"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={handleAddContact}
            className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        labels={labels}
        stages={stages}
        onAssignStage={handleBulkAssignStage}
        onAssignLabel={handleBulkAddLabel}
        onPushToCampaign={() => setPushDialogOpen(true)}
        onDelete={handleBulkDelete}
        onClear={() => setSelectedIds(new Set())}
      />

      {/* Table */}
      <div className={selectedIds.size > 0 ? 'mt-4' : ''}>
        <ContactsTable
          contacts={contacts}
          labels={labels}
          stages={stages}
          onEdit={handleEditContact}
          onDelete={handleDeleteContact}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>

      {/* Dialogs */}
      <ContactForm
        contact={editingContact}
        labels={labels}
        stages={stages}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveContact}
      />

      <CsvImportDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        existingContacts={contacts}
        onImport={bulkCreateContacts}
      />

      <PushToCampaignDialog
        open={pushDialogOpen}
        contactCount={selectedIds.size}
        campaigns={campaigns}
        onClose={() => setPushDialogOpen(false)}
        onPush={handlePushToCampaign}
      />
    </div>
  );
}
