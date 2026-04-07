import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockLabels as initialLabels } from '../data/mockLabels';
import { mockStages as initialStages } from '../data/mockStages';
import { mockQuickReplies as initialReplies } from '../data/mockQuickReplies';
import { mockContacts } from '../data/mockContacts';
import type { SmsLabel, SmsPipelineStage, SmsQuickReply, SmsTeamMember } from '../types';
import LabelsSettings from '../components/settings/LabelsSettings';
import StagesSettings from '../components/settings/StagesSettings';
import QuickRepliesSettings from '../components/settings/QuickRepliesSettings';
import TeamSettings from '../components/settings/TeamSettings';
import IntegrationsSettings from '../components/settings/IntegrationsSettings';
import OptOutList from '../components/settings/OptOutList';

const initialMembers: SmsTeamMember[] = [
  { id: 'tm-1', name: 'Hugo', email: 'hugo@nfstay.com', role: 'admin' },
  { id: 'tm-2', name: 'Sarah Agent', email: 'sarah@nfstay.com', role: 'agent' },
];

export default function SmsSettingsPage() {
  const [labels, setLabels] = useState<SmsLabel[]>(initialLabels);
  const [stages, setStages] = useState<SmsPipelineStage[]>(initialStages);
  const [replies, setReplies] = useState<SmsQuickReply[]>(initialReplies);
  const [members, setMembers] = useState<SmsTeamMember[]>(initialMembers);
  const [browserNotifications, setBrowserNotifications] = useState(true);

  return (
    <div className="max-w-[1440px] mx-auto p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6 text-[#1E9A80]" />
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Settings</h1>
      </div>

      <Tabs defaultValue="labels" className="space-y-6">
        <TabsList className="bg-[#F3F3EE] rounded-xl p-1 h-auto flex-wrap">
          <TabsTrigger value="labels" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-[#1E9A80]">Labels</TabsTrigger>
          <TabsTrigger value="stages" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-[#1E9A80]">Stages</TabsTrigger>
          <TabsTrigger value="quick-replies" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-[#1E9A80]">Quick Replies</TabsTrigger>
          <TabsTrigger value="team" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-[#1E9A80]">Team</TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-[#1E9A80]">Integrations</TabsTrigger>
          <TabsTrigger value="opt-out" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-[#1E9A80]">Opt-out List</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-[#1E9A80]">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="labels">
          <LabelsSettings
            labels={labels}
            onAdd={(l) => setLabels((prev) => [...prev, l])}
            onEdit={(l) => setLabels((prev) => prev.map((x) => x.id === l.id ? l : x))}
            onDelete={(id) => setLabels((prev) => prev.filter((x) => x.id !== id))}
          />
        </TabsContent>

        <TabsContent value="stages">
          <StagesSettings
            stages={stages}
            onAdd={(s) => setStages((prev) => [...prev, s])}
            onEdit={(s) => setStages((prev) => prev.map((x) => x.id === s.id ? s : x))}
            onDelete={(id) => setStages((prev) => prev.filter((x) => x.id !== id))}
          />
        </TabsContent>

        <TabsContent value="quick-replies">
          <QuickRepliesSettings
            replies={replies}
            onAdd={(r) => setReplies((prev) => [...prev, r])}
            onEdit={(r) => setReplies((prev) => prev.map((x) => x.id === r.id ? r : x))}
            onDelete={(id) => setReplies((prev) => prev.filter((x) => x.id !== id))}
          />
        </TabsContent>

        <TabsContent value="team">
          <TeamSettings
            members={members}
            onAdd={(m) => setMembers((prev) => [...prev, m])}
            onRemove={(id) => setMembers((prev) => prev.filter((x) => x.id !== id))}
          />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsSettings />
        </TabsContent>

        <TabsContent value="opt-out">
          <OptOutList contacts={mockContacts} />
        </TabsContent>

        <TabsContent value="notifications">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 max-w-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">Browser notifications</p>
                <p className="text-xs text-[#6B7280] mt-0.5">Get notified when new messages arrive</p>
              </div>
              <Switch checked={browserNotifications} onCheckedChange={setBrowserNotifications} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
