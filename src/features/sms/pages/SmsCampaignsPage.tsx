import { useState } from 'react';
import { Megaphone, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mockCampaigns as initialCampaigns } from '../data/mockCampaigns';
import type { SmsCampaign } from '../types';
import CampaignsList from '../components/campaigns/CampaignsList';
import CampaignWizard from '../components/campaigns/CampaignWizard';

export default function SmsCampaignsPage() {
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>(initialCampaigns);
  const [wizardOpen, setWizardOpen] = useState(false);

  function handleComplete() {
    const newCampaign: SmsCampaign = {
      id: `cmp-${Date.now()}`,
      name: 'New Campaign',
      batchName: null,
      messageBody: '',
      numberIds: [],
      rotation: false,
      includeOptOut: false,
      status: 'draft',
      scheduledAt: null,
      totalRecipients: 0,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      skippedCount: 0,
      createdAt: new Date().toISOString(),
    };
    setCampaigns((prev) => [newCampaign, ...prev]);
    setWizardOpen(false);
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

      <CampaignsList campaigns={campaigns} onNew={() => setWizardOpen(true)} />

      <CampaignWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleComplete}
      />
    </div>
  );
}
