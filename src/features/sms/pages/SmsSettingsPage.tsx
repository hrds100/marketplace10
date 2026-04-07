import { useState } from 'react';
import { Settings, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from '../hooks/useSettings';
import { useContacts } from '../hooks/useContacts';
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
  const {
    labels, stages, replies, isLoading,
    addLabel, updateLabel, deleteLabel,
    addStage, updateStage, deleteStage,
    addReply, updateReply, deleteReply,
  } = useSettings();
  const { contacts } = useContacts();
  const [members, setMembers] = useState<SmsTeamMember[]>(initialMembers);
  const [browserNotifications, setBrowserNotifications] = useState(true);

  async function handleAddLabel(label: SmsLabel) {
    try {
      await addLabel({ name: label.name, colour: label.colour, position: label.position });
    } catch { /* handled by hook */ }
  }

  async function handleEditLabel(label: SmsLabel) {
    try {
      await updateLabel(label);
    } catch { /* handled by hook */ }
  }

  async function handleDeleteLabel(id: string) {
    try {
      await deleteLabel(id);
    } catch { /* handled by hook */ }
  }

  async function handleAddStage(stage: SmsPipelineStage) {
    try {
      await addStage({ name: stage.name, colour: stage.colour, position: stage.position });
    } catch { /* handled by hook */ }
  }

  async function handleEditStage(stage: SmsPipelineStage) {
    try {
      await updateStage(stage);
    } catch { /* handled by hook */ }
  }

  async function handleDeleteStage(id: string) {
    try {
      await deleteStage(id);
    } catch { /* handled by hook */ }
  }

  async function handleAddReply(reply: SmsQuickReply) {
    try {
      await addReply({ label: reply.label, body: reply.body, position: reply.position });
    } catch { /* handled by hook */ }
  }

  async function handleEditReply(reply: SmsQuickReply) {
    try {
      await updateReply(reply);
    } catch { /* handled by hook */ }
  }

  async function handleDeleteReply(id: string) {
    try {
      await deleteReply(id);
    } catch { /* handled by hook */ }
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
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6 text-[#1E9A80]" />
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Settings</h1>
      </div>

      <Tabs defaultValue="labels" className="space-y-6">
        <TabsList className="bg-[#F5F5F5] rounded-xl p-1 h-auto flex-wrap">
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
            onAdd={handleAddLabel}
            onEdit={handleEditLabel}
            onDelete={handleDeleteLabel}
          />
        </TabsContent>

        <TabsContent value="stages">
          <StagesSettings
            stages={stages}
            onAdd={handleAddStage}
            onEdit={handleEditStage}
            onDelete={handleDeleteStage}
          />
        </TabsContent>

        <TabsContent value="quick-replies">
          <QuickRepliesSettings
            replies={replies}
            onAdd={handleAddReply}
            onEdit={handleEditReply}
            onDelete={handleDeleteReply}
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
          <OptOutList contacts={contacts} />
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
