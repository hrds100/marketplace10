import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { SmsCampaign } from '../../types';

interface EditCampaignDialogProps {
  campaign: SmsCampaign | null;
  open: boolean;
  onClose: () => void;
  onSave: (campaignId: string, updates: Record<string, unknown>) => Promise<void>;
  isSaving: boolean;
}

export default function EditCampaignDialog({
  campaign,
  open,
  onClose,
  onSave,
  isSaving,
}: EditCampaignDialogProps) {
  const [name, setName] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [includeOptOut, setIncludeOptOut] = useState(false);
  const [speedMin, setSpeedMin] = useState(1);
  const [speedMax, setSpeedMax] = useState(1);
  const [batchSendAll, setBatchSendAll] = useState(true);
  const [batchSize, setBatchSize] = useState(100);

  // Sync form state when campaign changes
  const [lastCampaignId, setLastCampaignId] = useState<string | null>(null);
  if (campaign && campaign.id !== lastCampaignId) {
    setLastCampaignId(campaign.id);
    setName(campaign.name);
    setMessageBody(campaign.messageBody);
    setIncludeOptOut(campaign.includeOptOut);
    setSpeedMin(campaign.sendSpeed?.min ?? 1);
    setSpeedMax(campaign.sendSpeed?.max ?? 1);
    setBatchSendAll(campaign.batchSize === null);
    setBatchSize(campaign.batchSize ?? 100);
  }

  async function handleSave() {
    if (!campaign) return;
    await onSave(campaign.id, {
      name,
      message_body: messageBody,
      include_opt_out: includeOptOut,
      send_speed: { min: speedMin, max: speedMax },
      batch_size: batchSendAll ? null : batchSize,
    });
    onClose();
  }

  if (!campaign) return null;

  const canEdit = campaign.status === 'draft' || campaign.status === 'paused';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A]">Edit Campaign</DialogTitle>
        </DialogHeader>

        {!canEdit ? (
          <p className="text-sm text-[#6B7280] py-4">
            Campaign must be paused or in draft to edit. Current status: <strong>{campaign.status}</strong>
          </p>
        ) : (
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#525252]">Campaign Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-[10px] border-[#E5E5E5] focus-visible:ring-[#1E9A80]"
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#525252]">Message Body</Label>
              <Textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={5}
                className="rounded-[10px] border-[#E5E5E5] focus-visible:ring-[#1E9A80] resize-none"
                placeholder="Use {name} and {phone} as variables"
              />
              <p className="text-xs text-[#9CA3AF]">
                Variables: {'{name}'}, {'{phone}'}. Changes apply to remaining unsent contacts only.
              </p>
            </div>

            {/* Opt-out */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-[#525252]">Include opt-out text</Label>
              <Switch
                checked={includeOptOut}
                onCheckedChange={setIncludeOptOut}
              />
            </div>

            {/* Send Speed */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#525252]">Delay between messages (seconds)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={speedMin}
                  onChange={(e) => setSpeedMin(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 rounded-[10px] border-[#E5E5E5] focus-visible:ring-[#1E9A80]"
                />
                <span className="text-sm text-[#6B7280]">to</span>
                <Input
                  type="number"
                  min={1}
                  value={speedMax}
                  onChange={(e) => setSpeedMax(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 rounded-[10px] border-[#E5E5E5] focus-visible:ring-[#1E9A80]"
                />
                <span className="text-sm text-[#6B7280]">seconds</span>
              </div>
            </div>

            {/* Batch Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-[#525252]">Send all remaining at once</Label>
                <Switch
                  checked={batchSendAll}
                  onCheckedChange={setBatchSendAll}
                />
              </div>
              {!batchSendAll && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#6B7280]">Batch size</Label>
                  <Input
                    type="number"
                    min={1}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 100))}
                    className="w-28 rounded-[10px] border-[#E5E5E5] focus-visible:ring-[#1E9A80]"
                  />
                </div>
              )}
            </div>

            {/* Status info */}
            <div className="rounded-lg bg-[#F3F3EE] p-3 text-xs text-[#6B7280] space-y-1">
              <p>Sent: {campaign.sentCount} / {campaign.totalRecipients}</p>
              <p>Remaining: {Math.max(0, campaign.totalRecipients - campaign.sentCount - campaign.failedCount - campaign.skippedCount)}</p>
              <p>After saving, use <strong>Resume</strong> to continue sending to remaining contacts.</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-lg border-[#E5E7EB]"
          >
            Cancel
          </Button>
          {canEdit && (
            <Button
              onClick={handleSave}
              disabled={isSaving || !name.trim() || !messageBody.trim()}
              className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
