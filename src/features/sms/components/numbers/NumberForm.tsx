import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface NumberFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { phoneNumber: string; twilioSid: string; label: string; channel: 'sms' | 'whatsapp' }) => void;
}

export default function NumberForm({ open, onClose, onSave }: NumberFormProps) {
  const [phone, setPhone] = useState('');
  const [twilioSid, setTwilioSid] = useState('');
  const [label, setLabel] = useState('');
  const [channel, setChannel] = useState<'sms' | 'whatsapp'>('sms');

  useEffect(() => {
    if (open) {
      setPhone('');
      setTwilioSid('');
      setLabel('');
      setChannel('sms');
    }
  }, [open]);

  function handleSubmit() {
    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!twilioSid.trim()) {
      toast.error('Twilio SID is required');
      return;
    }

    onSave({
      phoneNumber: phone.trim(),
      twilioSid: twilioSid.trim(),
      label: label.trim() || 'Untitled',
      channel,
    });

    toast.success('Number connected');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A]">Connect Phone Number</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Phone number */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#525252]">Phone number</Label>
            <Input
              placeholder="+447911234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-[10px] border-[#E5E5E5]"
            />
          </div>

          {/* Twilio SID */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#525252]">Twilio SID</Label>
            <Input
              placeholder="PN1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c"
              value={twilioSid}
              onChange={(e) => setTwilioSid(e.target.value)}
              className="rounded-[10px] border-[#E5E5E5] font-mono text-sm"
            />
            <p className="text-xs text-[#9CA3AF]">
              Find this in your Twilio console under Phone Numbers.
            </p>
          </div>

          {/* Channel */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#525252]">Channel</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setChannel('sms')}
                className={`flex-1 py-2 px-3 rounded-[10px] border text-sm font-medium transition-colors ${
                  channel === 'sms'
                    ? 'border-[#6B7280] bg-[#6B7280]/10 text-[#1A1A1A]'
                    : 'border-[#E5E5E5] text-[#6B7280] hover:border-[#9CA3AF]'
                }`}
              >
                SMS
              </button>
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={`flex-1 py-2 px-3 rounded-[10px] border text-sm font-medium transition-colors ${
                  channel === 'whatsapp'
                    ? 'border-[#25D366] bg-[#25D366]/10 text-[#25D366]'
                    : 'border-[#E5E5E5] text-[#6B7280] hover:border-[#9CA3AF]'
                }`}
              >
                WhatsApp
              </button>
            </div>
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#525252]">Label</Label>
            <Input
              placeholder="Main Line, Bookings, Marketing..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="rounded-[10px] border-[#E5E5E5]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-lg border-[#E5E7EB]">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
          >
            Connect Number
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
