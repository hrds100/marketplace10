import { useState } from 'react';
import { Plus, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNumbers } from '../hooks/useNumbers';
import type { SmsPhoneNumber } from '../types';
import NumbersList from '../components/numbers/NumbersList';
import NumberForm from '../components/numbers/NumberForm';

export default function SmsNumbersPage() {
  const { numbers, isLoading, addNumber, removeNumber, setDefault } = useNumbers();
  const [formOpen, setFormOpen] = useState(false);

  function handleEdit(num: SmsPhoneNumber) {
    toast.info(`Edit label for ${num.phoneNumber}`);
  }

  async function handleSetDefault(numberId: string) {
    try {
      await setDefault(numberId);
      toast.success('Default number updated');
    } catch {
      // Error already handled by hook toast
    }
  }

  async function handleRemove(numberId: string) {
    try {
      await removeNumber(numberId);
      toast.success('Number removed');
    } catch {
      // Error already handled by hook toast
    }
  }

  async function handleSave(data: { phoneNumber: string; twilioSid: string; label: string; channel: 'sms' | 'whatsapp' }) {
    try {
      await addNumber({
        phone_number: data.phoneNumber,
        twilio_sid: data.twilioSid,
        label: data.label,
        is_default: numbers.length === 0,
        channel: data.channel,
      });
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
