import { useState } from 'react';
import { Loader2, Megaphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SmsCampaign } from '../../types';

interface PushToCampaignDialogProps {
  open: boolean;
  contactCount: number;
  campaigns: SmsCampaign[];
  onClose: () => void;
  onPush: (campaignId: string) => Promise<void>;
}

export default function PushToCampaignDialog({
  open,
  contactCount,
  campaigns,
  onClose,
  onPush,
}: PushToCampaignDialogProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [pushing, setPushing] = useState(false);

  // Only show campaigns that can accept new recipients (draft or paused)
  const eligibleCampaigns = campaigns.filter(
    (c) => c.status === 'draft' || c.status === 'paused'
  );

  async function handlePush() {
    if (!selectedCampaignId) return;
    setPushing(true);
    try {
      await onPush(selectedCampaignId);
      onClose();
    } finally {
      setPushing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A] flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[#1E9A80]" />
            Push to Campaign
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-[#6B7280]">
            Add <strong>{contactCount}</strong> selected contact{contactCount !== 1 ? 's' : ''} as
            recipients to an existing campaign.
          </p>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#525252]">Select Campaign</Label>
            {eligibleCampaigns.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] py-2">
                No draft or paused campaigns available. Create a campaign first from the Campaigns page.
              </p>
            ) : (
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger className="rounded-[10px] border-[#E5E5E5]">
                  <SelectValue placeholder="Choose a campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleCampaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span>{c.name}</span>
                        <span className="text-[#9CA3AF] text-xs">
                          ({c.status} &middot; {c.totalRecipients} recipients)
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedCampaignId && (
            <div className="rounded-lg bg-[#F3F3EE] p-3 text-xs text-[#6B7280] space-y-1">
              <p>Contacts will be added as pending recipients.</p>
              <p>Duplicates (already in campaign) will be skipped.</p>
              <p>After pushing, use <strong>Resume</strong> on the campaign to start sending.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-lg border-[#E5E7EB]">
            Cancel
          </Button>
          <Button
            onClick={handlePush}
            disabled={pushing || !selectedCampaignId}
            className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
          >
            {pushing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Push {contactCount} Contact{contactCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
