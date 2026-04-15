import { useState, useEffect } from 'react';
import { Loader2, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { SmsWebhookEndpoint } from '../../types';
import { useWebhookEndpoints, type CreateEndpointPayload } from '../../hooks/useWebhookEndpoints';
import { useWebhookSettings } from '../../hooks/useWebhookSettings';

interface Props {
  open: boolean;
  onClose: () => void;
  editing: SmsWebhookEndpoint | null;
}

function toTimeInput(hms: string): string {
  // "HH:MM:SS" → "HH:MM"
  return hms.slice(0, 5);
}

function fromTimeInput(hm: string): string {
  // "HH:MM" → "HH:MM:00"
  return hm.length === 5 ? `${hm}:00` : hm;
}

export default function WebhookEndpointDialog({ open, onClose, editing }: Props) {
  const { createEndpoint, updateEndpoint, testSend, isCreating, isUpdating, isTesting } =
    useWebhookEndpoints();
  const { settings } = useWebhookSettings();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [active, setActive] = useState(true);
  const [windowStart, setWindowStart] = useState('08:00');
  const [windowEnd, setWindowEnd] = useState('21:00');
  const [testPhone, setTestPhone] = useState('');

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setUrl(editing.url);
      setActive(editing.status === 'active');
      setWindowStart(toTimeInput(editing.sendWindowStart));
      setWindowEnd(toTimeInput(editing.sendWindowEnd));
    } else {
      setName('');
      setUrl('');
      setActive(true);
      setWindowStart('08:00');
      setWindowEnd('21:00');
      setTestPhone('');
    }
  }, [editing, open]);

  async function handleSave() {
    if (!name.trim() || !url.trim()) {
      toast.error('Name and URL required');
      return;
    }
    const payload: CreateEndpointPayload = {
      name: name.trim(),
      url: url.trim(),
      status: active ? 'active' : 'inactive',
      sendWindowStart: fromTimeInput(windowStart),
      sendWindowEnd: fromTimeInput(windowEnd),
    };
    try {
      if (editing) {
        await updateEndpoint({ id: editing.id, updates: payload });
      } else {
        await createEndpoint(payload);
      }
      onClose();
    } catch {
      // toast handled by hook
    }
  }

  async function handleTest() {
    if (!url.trim() || !testPhone.trim()) {
      toast.error('URL and test phone required');
      return;
    }
    try {
      await testSend({
        url: url.trim(),
        workflow: settings?.workflowName || 'Add to Group - NFSTAY',
        phone: testPhone.trim(),
      });
    } catch {
      // toast handled
    }
  }

  const saving = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A]">
            {editing ? 'Edit Webhook Endpoint' : 'Add Webhook Endpoint'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium text-[#1A1A1A]">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="WA Group A"
              className="mt-1.5 rounded-lg border-[#E5E7EB]"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-[#1A1A1A]">Webhook URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://wa-toolbox.web.app/webhooks/XYZ"
              className="mt-1.5 rounded-lg border-[#E5E7EB] font-mono text-xs"
            />
            <p className="text-xs text-[#9CA3AF] mt-1">
              POST with {'{ action, workflow, phone }'} payload
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-[#1A1A1A]">Active</Label>
              <p className="text-xs text-[#6B7280]">
                Only active endpoints receive dispatches
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <div>
            <Label className="text-sm font-medium text-[#1A1A1A]">
              Send window (UK time)
            </Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Input
                type="time"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                className="rounded-lg border-[#E5E7EB] w-32"
              />
              <span className="text-sm text-[#6B7280]">to</span>
              <Input
                type="time"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                className="rounded-lg border-[#E5E7EB] w-32"
              />
            </div>
            <p className="text-xs text-[#9CA3AF] mt-1">
              WhatsApp-safe hours — sends pause outside this window
            </p>
          </div>

          <div className="pt-2 border-t border-[#E5E7EB]">
            <Label className="text-sm font-medium text-[#1A1A1A]">Test send</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="447863992555"
                className="rounded-lg border-[#E5E7EB] font-mono text-xs"
              />
              <Button
                onClick={handleTest}
                disabled={isTesting}
                variant="outline"
                className="rounded-lg border-[#E5E7EB]"
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Test
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Sends a one-off payload to this URL (does not touch the queue)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-lg border-[#E5E7EB]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
