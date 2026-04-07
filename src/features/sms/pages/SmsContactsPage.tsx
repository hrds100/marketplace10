import { useState } from 'react';
import { Plus, Upload, Download, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { mockContacts as initialContacts } from '../data/mockContacts';
import { mockLabels } from '../data/mockLabels';
import { mockStages } from '../data/mockStages';
import type { SmsContact } from '../types';
import ContactsTable from '../components/contacts/ContactsTable';
import ContactForm from '../components/contacts/ContactForm';
import CsvImportDialog from '../components/contacts/CsvImportDialog';

export default function SmsContactsPage() {
  const [contacts, setContacts] = useState<SmsContact[]>(initialContacts);
  const [formOpen, setFormOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<SmsContact | null>(null);

  function handleAddContact() {
    setEditingContact(null);
    setFormOpen(true);
  }

  function handleEditContact(contact: SmsContact) {
    setEditingContact(contact);
    setFormOpen(true);
  }

  function handleSaveContact(data: {
    displayName: string;
    phoneNumber: string;
    labels: typeof mockLabels;
    pipelineStageId: string | null;
    notes: string;
  }) {
    if (editingContact) {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === editingContact.id
            ? {
                ...c,
                displayName: data.displayName || null,
                phoneNumber: data.phoneNumber,
                labels: data.labels,
                pipelineStageId: data.pipelineStageId,
                notes: data.notes,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );
    } else {
      const newContact: SmsContact = {
        id: `cnt-${Date.now()}`,
        phoneNumber: data.phoneNumber,
        displayName: data.displayName || null,
        labels: data.labels,
        pipelineStageId: data.pipelineStageId,
        notes: data.notes,
        assignedTo: null,
        optedOut: false,
        batchName: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setContacts((prev) => [newContact, ...prev]);
    }
  }

  function handleDeleteContact(contactId: string) {
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
    toast.success('Contact deleted');
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

  return (
    <div className="max-w-[1440px] mx-auto p-6 md:p-8">
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

      {/* Table */}
      <ContactsTable
        contacts={contacts}
        labels={mockLabels}
        stages={mockStages}
        onEdit={handleEditContact}
        onDelete={handleDeleteContact}
      />

      {/* Dialogs */}
      <ContactForm
        contact={editingContact}
        labels={mockLabels}
        stages={mockStages}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveContact}
      />

      <CsvImportDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        existingContacts={contacts}
      />
    </div>
  );
}
