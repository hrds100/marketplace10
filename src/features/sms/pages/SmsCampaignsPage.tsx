import { Megaphone, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCampaigns } from '../hooks/useCampaigns';
import CampaignsList from '../components/campaigns/CampaignsList';
import CampaignWizard from '../components/campaigns/CampaignWizard';
import { useState } from 'react';

export default function SmsCampaignsPage() {
  const { campaigns, isLoading, createCampaign, launchCampaign, isCreating } = useCampaigns();
  const [wizardOpen, setWizardOpen] = useState(false);

  async function handleComplete(data: {
    name: string;
    message_body: string;
    number_ids: string[];
    rotation: boolean;
    include_opt_out: boolean;
    scheduled_at: string | null;
    contact_ids: string[];
    sendNow: boolean;
  }) {
    try {
      const campaignId = await createCampaign({
        name: data.name,
        message_body: data.message_body,
        number_ids: data.number_ids,
        rotation: data.rotation,
        include_opt_out: data.include_opt_out,
        scheduled_at: data.scheduled_at,
        status: data.sendNow ? 'draft' : (data.scheduled_at ? 'scheduled' : 'draft'),
        contact_ids: data.contact_ids,
      });

      if (data.sendNow) {
        await launchCampaign(campaignId);
      }

      setWizardOpen(false);
    } catch {
      // Error handled by hook toast
    }
  }

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-[#1E9A80]" />
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Campaigns</h1>
          <span className="text-sm text-[#6B7280]">{campaigns.length} total</span>
        </div>

        <Button
          size="sm"
          onClick={() => setWizardOpen(true)}
          className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
        </div>
      ) : (
        <CampaignsList campaigns={campaigns} onNew={() => setWizardOpen(true)} />
      )}

      <CampaignWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleComplete}
        isSubmitting={isCreating}
      />
    </div>
  );
}
