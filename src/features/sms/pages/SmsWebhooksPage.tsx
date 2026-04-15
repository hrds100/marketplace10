import { useState } from 'react';
import { Plus, Webhook, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebhookEndpoints } from '../hooks/useWebhookEndpoints';
import { useWebhookLogs } from '../hooks/useWebhookLogs';
import type { SmsWebhookEndpoint } from '../types';
import WebhookEndpointsTable from '../components/webhooks/WebhookEndpointsTable';
import WebhookEndpointDialog from '../components/webhooks/WebhookEndpointDialog';
import WebhookSettingsCard from '../components/webhooks/WebhookSettingsCard';
import WebhookQueueStats from '../components/webhooks/WebhookQueueStats';
import WebhookActivityTable from '../components/webhooks/WebhookActivityTable';

export default function SmsWebhooksPage() {
  const { endpoints, isLoading, deleteEndpoint } = useWebhookEndpoints();
  const { logs, isLoading: logsLoading, stats, removeFromHistory, isRemoving } = useWebhookLogs(
    100
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SmsWebhookEndpoint | null>(null);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(endpoint: SmsWebhookEndpoint) {
    setEditing(endpoint);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      await deleteEndpoint(id);
    } catch {
      // toast handled
    }
  }

  async function handleRemoveFromHistory(phone: string) {
    try {
      await removeFromHistory(phone);
    } catch {
      // toast handled
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
    <div className="p-6 md:p-8 overflow-y-auto h-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Webhook className="h-6 w-6 text-[#1E9A80]" />
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Webhook Automation</h1>
            <p className="text-sm text-[#6B7280]">
              Dispatch contacts to WAtoolbox with rate limiting, time windows, and permanent dedupe
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={openAdd}
          className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Endpoint
        </Button>
      </div>

      {/* Queue stats */}
      <WebhookQueueStats stats={stats} />

      {/* Settings */}
      <div>
        <h2 className="text-lg font-semibold text-[#1A1A1A] mb-3">Dispatcher settings</h2>
        <WebhookSettingsCard />
      </div>

      {/* Endpoints */}
      <div>
        <h2 className="text-lg font-semibold text-[#1A1A1A] mb-3">
          Endpoints{' '}
          <span className="text-sm font-normal text-[#6B7280]">({endpoints.length})</span>
        </h2>
        <WebhookEndpointsTable
          endpoints={endpoints}
          onEdit={openEdit}
          onDelete={handleDelete}
          onAdd={openAdd}
        />
      </div>

      {/* Activity log */}
      <div>
        <h2 className="text-lg font-semibold text-[#1A1A1A] mb-3">Recent activity</h2>
        <WebhookActivityTable
          logs={logs}
          isLoading={logsLoading}
          onRemoveFromHistory={handleRemoveFromHistory}
          isRemoving={isRemoving}
        />
      </div>

      <WebhookEndpointDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
      />
    </div>
  );
}
