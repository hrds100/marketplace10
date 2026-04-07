import { useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Upload,
  Users,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLabels } from '../../hooks/useLabels';
import { useStages } from '../../hooks/useStages';
import { useTemplates } from '../../hooks/useTemplates';
import { useNumbers } from '../../hooks/useNumbers';
import { useContacts } from '../../hooks/useContacts';

interface CampaignWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: {
    name: string;
    message_body: string;
    number_ids: string[];
    rotation: boolean;
    include_opt_out: boolean;
    scheduled_at: string | null;
    contact_ids: string[];
    sendNow: boolean;
  }) => void;
  isSubmitting?: boolean;
}

interface WizardData {
  name: string;
  description: string;
  recipientSource: 'contacts' | 'csv';
  selectedLabels: string[];
  selectedStages: string[];
  csvFile: File | null;
  messageBody: string;
  selectedNumberIds: string[];
  rotation: boolean;
  includeOptOut: boolean;
  scheduleType: 'now' | 'later';
  scheduledDate: Date | undefined;
  scheduledTime: string;
}

const STEPS = [
  'Name',
  'Recipients',
  'Compose',
  'Number',
  'Opt-out',
  'Schedule',
  'Review',
] as const;

const VARIABLES = ['{name}', '{phone}'];

function getSegmentCount(text: string): number {
  const len = text.length;
  if (len === 0) return 0;
  if (len <= 160) return 1;
  return Math.ceil(len / 153);
}

const INITIAL_DATA: WizardData = {
  name: '',
  description: '',
  recipientSource: 'contacts',
  selectedLabels: [],
  selectedStages: [],
  csvFile: null,
  messageBody: '',
  selectedNumberIds: [],
  rotation: false,
  includeOptOut: false,
  scheduleType: 'now',
  scheduledDate: undefined,
  scheduledTime: '09:00',
};

export default function CampaignWizard({ open, onClose, onComplete, isSubmitting }: CampaignWizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({ ...INITIAL_DATA });

  // Real DB data
  const { labels } = useLabels();
  const { stages } = useStages();
  const { templates } = useTemplates();
  const { numbers } = useNumbers();
  const { contacts } = useContacts();

  function update(partial: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  // Filter contacts matching selected labels/stages
  function getMatchingContactIds(): string[] {
    if (data.recipientSource !== 'contacts') return [];
    return contacts
      .filter((c) => {
        const matchesLabel = data.selectedLabels.length === 0 ||
          c.labels.some((l) => data.selectedLabels.includes(l.id));
        const matchesStage = data.selectedStages.length === 0 ||
          (c.pipelineStageId && data.selectedStages.includes(c.pipelineStageId));
        return matchesLabel || matchesStage;
      })
      .map((c) => c.id);
  }

  function canAdvance(): boolean {
    switch (step) {
      case 0: return data.name.trim().length > 0;
      case 1: return data.recipientSource === 'csv' ? data.csvFile !== null : (data.selectedLabels.length > 0 || data.selectedStages.length > 0);
      case 2: return data.messageBody.trim().length > 0;
      case 3: return data.selectedNumberIds.length > 0;
      case 4: return true;
      case 5: return data.scheduleType === 'now' || (data.scheduledDate !== undefined && data.scheduledTime.length > 0);
      case 6: return true;
      default: return false;
    }
  }

  function handleCreate() {
    const contactIds = getMatchingContactIds();

    let scheduledAt: string | null = null;
    if (data.scheduleType === 'later' && data.scheduledDate) {
      const d = new Date(data.scheduledDate);
      const [hours, minutes] = data.scheduledTime.split(':').map(Number);
      d.setHours(hours, minutes, 0, 0);
      scheduledAt = d.toISOString();
    }

    onComplete({
      name: data.name,
      message_body: data.messageBody,
      number_ids: data.selectedNumberIds,
      rotation: data.rotation,
      include_opt_out: data.includeOptOut,
      scheduled_at: scheduledAt,
      contact_ids: contactIds,
      sendNow: data.scheduleType === 'now',
    });

    setStep(0);
    setData({ ...INITIAL_DATA });
  }

  function toggleInArray(arr: string[], id: string): string[] {
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  }

  function insertVariable(v: string) {
    update({ messageBody: data.messageBody + v });
  }

  function handleTemplateSelect(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) update({ messageBody: tpl.body });
  }

  const matchingCount = getMatchingContactIds().length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A]">New Campaign</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className={cn(
                  'flex items-center justify-center h-7 w-7 rounded-full text-xs font-semibold shrink-0',
                  i < step && 'bg-[#1E9A80] text-white',
                  i === step && 'bg-[#1E9A80] text-white ring-2 ring-[#1E9A80]/30',
                  i > step && 'bg-[#F3F3EE] text-[#9CA3AF]',
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs whitespace-nowrap hidden sm:inline',
                  i === step ? 'text-[#1A1A1A] font-medium' : 'text-[#9CA3AF]',
                )}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn('h-px w-4 shrink-0', i < step ? 'bg-[#1E9A80]' : 'bg-[#E5E7EB]')} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[260px]">
          {/* Step 1: Name */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-[#1A1A1A]">Campaign name</Label>
                <Input
                  value={data.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="e.g. April New Listings"
                  className="mt-1.5 rounded-lg border-[#E5E7EB]"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-[#1A1A1A]">Description (optional)</Label>
                <Textarea
                  value={data.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="Internal notes about this campaign"
                  className="mt-1.5 rounded-lg border-[#E5E7EB] resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Recipients */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex gap-3">
                <Button
                  variant={data.recipientSource === 'contacts' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => update({ recipientSource: 'contacts' })}
                  className={cn(
                    'rounded-lg',
                    data.recipientSource === 'contacts' && 'bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white',
                  )}
                >
                  <Users className="h-4 w-4 mr-1.5" />
                  Select from contacts
                </Button>
                <Button
                  variant={data.recipientSource === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => update({ recipientSource: 'csv' })}
                  className={cn(
                    'rounded-lg',
                    data.recipientSource === 'csv' && 'bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white',
                  )}
                >
                  <Upload className="h-4 w-4 mr-1.5" />
                  Upload CSV
                </Button>
              </div>

              {data.recipientSource === 'contacts' ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A] mb-2">Filter by label</p>
                    <div className="flex flex-wrap gap-2">
                      {labels.map((l) => (
                        <label key={l.id} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox
                            checked={data.selectedLabels.includes(l.id)}
                            onCheckedChange={() => update({ selectedLabels: toggleInArray(data.selectedLabels, l.id) })}
                          />
                          <span className="text-sm text-[#1A1A1A]">{l.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A] mb-2">Filter by stage</p>
                    <div className="flex flex-wrap gap-2">
                      {stages.map((s) => (
                        <label key={s.id} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox
                            checked={data.selectedStages.includes(s.id)}
                            onCheckedChange={() => update({ selectedStages: toggleInArray(data.selectedStages, s.id) })}
                          />
                          <span className="text-sm text-[#1A1A1A]">{s.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-[#6B7280]">
                    {data.selectedLabels.length + data.selectedStages.length > 0
                      ? `${matchingCount} contact${matchingCount !== 1 ? 's' : ''} matching filters`
                      : 'Select at least one label or stage'}
                  </p>
                </div>
              ) : (
                <div>
                  <Label className="text-sm font-medium text-[#1A1A1A]">Upload CSV file</Label>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => update({ csvFile: e.target.files?.[0] ?? null })}
                    className="mt-1.5 rounded-lg border-[#E5E7EB]"
                  />
                  {data.csvFile && (
                    <p className="text-xs text-[#1E9A80] mt-1">{data.csvFile.name} selected</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Compose */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-[#1A1A1A]">Load from template</Label>
                <Select onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="mt-1.5 rounded-lg border-[#E5E7EB]">
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-[#1A1A1A]">Message</Label>
                <Textarea
                  value={data.messageBody}
                  onChange={(e) => update({ messageBody: e.target.value })}
                  placeholder="Type your message..."
                  className="mt-1.5 rounded-lg border-[#E5E7EB] resize-none font-mono text-sm"
                  rows={5}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-1.5">
                    {VARIABLES.map((v) => (
                      <Button
                        key={v}
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(v)}
                        className="rounded-md text-xs h-7 border-[#E5E7EB] text-[#6B7280]"
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                  <span className="text-xs text-[#9CA3AF] tabular-nums">
                    {data.messageBody.length} chars / {getSegmentCount(data.messageBody)} segment{getSegmentCount(data.messageBody) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Number */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[#1A1A1A] mb-2">Select sending numbers</p>
              <div className="space-y-2">
                {numbers.map((n) => (
                  <label
                    key={n.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[#E5E7EB] cursor-pointer hover:bg-[#F3F3EE]/30 transition-colors"
                  >
                    <Checkbox
                      checked={data.selectedNumberIds.includes(n.id)}
                      onCheckedChange={() => update({ selectedNumberIds: toggleInArray(data.selectedNumberIds, n.id) })}
                    />
                    <div>
                      <span className="text-sm font-medium text-[#1A1A1A]">{n.label}</span>
                      <span className="text-sm text-[#6B7280] ml-2">{n.phoneNumber}</span>
                    </div>
                    {n.isDefault && (
                      <span className="ml-auto text-xs font-medium text-[#1E9A80]">Default</span>
                    )}
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={data.rotation}
                  onCheckedChange={(v) => update({ rotation: v })}
                />
                <Label className="text-sm text-[#1A1A1A]">Enable number rotation</Label>
              </div>
            </div>
          )}

          {/* Step 5: Opt-out */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={data.includeOptOut}
                  onCheckedChange={(v) => update({ includeOptOut: v })}
                />
                <Label className="text-sm text-[#1A1A1A]">Append opt-out message</Label>
              </div>
              {data.includeOptOut && (
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F3F3EE]/50 p-3">
                  <p className="text-sm text-[#6B7280] italic">
                    Preview: &quot;...{data.messageBody.slice(-30)}{data.messageBody.length > 30 ? '' : ''} Reply STOP to unsubscribe&quot;
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Schedule */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button
                  variant={data.scheduleType === 'now' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => update({ scheduleType: 'now' })}
                  className={cn(
                    'rounded-lg',
                    data.scheduleType === 'now' && 'bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white',
                  )}
                >
                  Send now
                </Button>
                <Button
                  variant={data.scheduleType === 'later' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => update({ scheduleType: 'later' })}
                  className={cn(
                    'rounded-lg',
                    data.scheduleType === 'later' && 'bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white',
                  )}
                >
                  Schedule
                </Button>
              </div>
              {data.scheduleType === 'later' && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Calendar
                    mode="single"
                    selected={data.scheduledDate}
                    onSelect={(d) => update({ scheduledDate: d ?? undefined })}
                    className="rounded-lg border border-[#E5E7EB]"
                  />
                  <div>
                    <Label className="text-sm font-medium text-[#1A1A1A]">Time</Label>
                    <Input
                      type="time"
                      value={data.scheduledTime}
                      onChange={(e) => update({ scheduledTime: e.target.value })}
                      className="mt-1.5 rounded-lg border-[#E5E7EB] w-32"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 7: Review */}
          {step === 6 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F3F3EE]/30 p-4 space-y-3">
                <Row label="Name" value={data.name} />
                <Row label="Recipients" value={data.recipientSource === 'csv' ? `CSV: ${data.csvFile?.name}` : `${matchingCount} contact${matchingCount !== 1 ? 's' : ''}`} />
                <Row label="Message" value={data.messageBody.slice(0, 80) + (data.messageBody.length > 80 ? '...' : '')} />
                <Row label="Numbers" value={data.selectedNumberIds.map((id) => numbers.find((n) => n.id === id)?.label).filter(Boolean).join(', ')} />
                <Row label="Rotation" value={data.rotation ? 'Yes' : 'No'} />
                <Row label="Opt-out" value={data.includeOptOut ? 'Appended' : 'No'} />
                <Row label="Schedule" value={data.scheduleType === 'now' ? 'Send immediately' : `${data.scheduledDate?.toLocaleDateString()} at ${data.scheduledTime}`} />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
          <Button
            variant="outline"
            size="sm"
            onClick={() => step === 0 ? onClose() : setStep(step - 1)}
            className="rounded-lg border-[#E5E7EB]"
            disabled={isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              size="sm"
              disabled={!canAdvance()}
              onClick={() => setStep(step + 1)}
              className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={isSubmitting}
              className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Creating...
                </>
              ) : (
                data.scheduleType === 'now' ? 'Create & Send' : 'Create Campaign'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-medium text-[#9CA3AF] w-20 shrink-0">{label}</span>
      <span className="text-sm text-[#1A1A1A]">{value}</span>
    </div>
  );
}
