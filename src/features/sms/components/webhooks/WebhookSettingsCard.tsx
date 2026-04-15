import { useEffect, useState } from 'react';
import { Loader2, Save, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useWebhookSettings } from '../../hooks/useWebhookSettings';
import { useStages } from '../../hooks/useStages';

export default function WebhookSettingsCard() {
  const { settings, isLoading, updateSettings, backfill, isUpdating, isBackfilling } =
    useWebhookSettings();
  const { stages } = useStages();

  const [enabled, setEnabled] = useState(false);
  const [numbersPerHour, setNumbersPerHour] = useState(60);
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [workflowName, setWorkflowName] = useState('Add to Group - NFSTAY');
  const [triggerStages, setTriggerStages] = useState<string[]>([]);
  const [moveToStageId, setMoveToStageId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setNumbersPerHour(settings.numbersPerHour);
      setDelaySeconds(settings.delaySeconds);
      setWorkflowName(settings.workflowName);
      setTriggerStages(settings.triggerStages);
      setMoveToStageId(settings.moveToStageId);
      setDirty(false);
    }
  }, [settings]);

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setDirty(true);
    };
  }

  function toggleTriggerStage(stageId: string) {
    setDirty(true);
    setTriggerStages((prev) =>
      prev.includes(stageId) ? prev.filter((s) => s !== stageId) : [...prev, stageId]
    );
  }

  async function handleSave() {
    try {
      await updateSettings({
        enabled,
        numbersPerHour,
        delaySeconds,
        workflowName,
        triggerStages,
        moveToStageId,
      });
      setDirty(false);
    } catch {
      // toast handled
    }
  }

  async function handleBackfill() {
    if (triggerStages.length === 0) {
      toast.error('Select at least one trigger stage first');
      return;
    }
    try {
      await backfill();
    } catch {
      // toast handled
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#1E9A80]" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 text-sm text-[#6B7280]">
        No settings row found. Run the webhook migration first.
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5">
      {/* Enabled toggle */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
        <div>
          <Label className="text-sm font-semibold text-[#1A1A1A]">Dispatcher enabled</Label>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Master switch — when off, the cron job stops sending
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={markDirty(setEnabled)} />
      </div>

      {/* Rate limits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-[#1A1A1A]">Numbers per hour</Label>
          <Input
            type="number"
            min={1}
            max={1000}
            value={numbersPerHour}
            onChange={(e) => markDirty(setNumbersPerHour)(parseInt(e.target.value, 10) || 0)}
            className="mt-1.5 rounded-lg border-[#E5E7EB]"
          />
          <p className="text-xs text-[#9CA3AF] mt-1">
            Max sends across all endpoints per rolling hour
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium text-[#1A1A1A]">Delay between sends (s)</Label>
          <Input
            type="number"
            min={0}
            max={300}
            value={delaySeconds}
            onChange={(e) => markDirty(setDelaySeconds)(parseInt(e.target.value, 10) || 0)}
            className="mt-1.5 rounded-lg border-[#E5E7EB]"
          />
          <p className="text-xs text-[#9CA3AF] mt-1">Pause between consecutive dispatches</p>
        </div>
      </div>

      {/* Workflow name */}
      <div>
        <Label className="text-sm font-medium text-[#1A1A1A]">WAtoolbox workflow name</Label>
        <Input
          value={workflowName}
          onChange={(e) => markDirty(setWorkflowName)(e.target.value)}
          className="mt-1.5 rounded-lg border-[#E5E7EB] font-mono text-xs"
        />
        <p className="text-xs text-[#9CA3AF] mt-1">
          Sent as the {'"workflow"'} field in the webhook payload
        </p>
      </div>

      {/* Trigger stages */}
      <div>
        <Label className="text-sm font-medium text-[#1A1A1A]">Trigger stages</Label>
        <p className="text-xs text-[#9CA3AF] mb-2">
          Contacts entering these stages get queued automatically
        </p>
        {stages.length === 0 ? (
          <p className="text-xs text-[#6B7280] py-2">No pipeline stages defined yet</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stages.map((stage) => {
              const checked = triggerStages.includes(stage.id);
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => toggleTriggerStage(stage.id)}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    checked
                      ? 'bg-[#ECFDF5] border-[#1E9A80] text-[#1E9A80]'
                      : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#1E9A80]/50'
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: stage.colour }}
                  />
                  {stage.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Move to stage */}
      <div>
        <Label className="text-sm font-medium text-[#1A1A1A]">Move to stage after send</Label>
        <p className="text-xs text-[#9CA3AF] mb-2">
          Optional — contact pipeline stage after dispatch succeeds
        </p>
        <select
          value={moveToStageId ?? ''}
          onChange={(e) => markDirty(setMoveToStageId)(e.target.value || null)}
          className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#1A1A1A]"
        >
          <option value="">— Do not move —</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-[#E5E7EB]">
        <Button
          onClick={handleSave}
          disabled={!dirty || isUpdating}
          className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-1.5" /> Save Settings
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleBackfill}
          disabled={isBackfilling || triggerStages.length === 0}
          className="rounded-lg border-[#E5E7EB] text-[#1A1A1A] ml-auto"
        >
          {isBackfilling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Database className="h-4 w-4 mr-1.5" /> Backfill existing contacts
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
