import { useState } from 'react';
import { Plus, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { mockNumbers as initialNumbers } from '../data/mockNumbers';
import type { SmsPhoneNumber } from '../types';
import NumbersList from '../components/numbers/NumbersList';
import NumberForm from '../components/numbers/NumberForm';

export default function SmsNumbersPage() {
  const [numbers, setNumbers] = useState<SmsPhoneNumber[]>(initialNumbers);
  const [formOpen, setFormOpen] = useState(false);

  function handleEdit(num: SmsPhoneNumber) {
    // For now, just show a toast — full edit form can be added later
    toast.info(`Edit label for ${num.phoneNumber}`);
  }

  function handleSetDefault(numberId: string) {
    setNumbers((prev) =>
      prev.map((n) => ({ ...n, isDefault: n.id === numberId }))
    );
    toast.success('Default number updated');
  }

  function handleRemove(numberId: string) {
    setNumbers((prev) => prev.filter((n) => n.id !== numberId));
    toast.success('Number removed');
  }

  function handleSave(data: { phoneNumber: string; twilioSid: string; label: string }) {
    const newNumber: SmsPhoneNumber = {
      id: `num-${Date.now()}`,
      phoneNumber: data.phoneNumber,
      twilioSid: data.twilioSid,
      label: data.label,
      isDefault: numbers.length === 0,
      webhookUrl: 'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/sms-webhook',
      messageCount: 0,
      createdAt: new Date().toISOString(),
    };
    setNumbers((prev) => [...prev, newNumber]);
  }

  return (
    <div className="max-w-[1440px] mx-auto p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Phone className="h-6 w-6 text-[#1E9A80]" />
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Phone Numbers</h1>
          <span className="text-sm text-[#6B7280]">{numbers.length} connected</span>
        </div>

        <Button
          size="sm"
          onClick={() => setFormOpen(true)}
          className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Connect Number
        </Button>
      </div>

      {/* List */}
      <NumbersList
        numbers={numbers}
        onEdit={handleEdit}
        onSetDefault={handleSetDefault}
        onRemove={handleRemove}
      />

      {/* Form dialog */}
      <NumberForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
