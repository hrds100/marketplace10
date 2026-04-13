import { useState } from 'react';
import Papa from 'papaparse';
import {
  Bot,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Users,
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
import { useAutomations } from '../../hooks/useAutomations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CampaignWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data: {
    name: string;
    message_body: string;
    templates: string[];
    template_rotation: boolean;
    number_ids: string[];
    rotation: boolean;
    include_opt_out: boolean;
    scheduled_at: string | null;
    contact_ids: string[];
    sendNow: boolean;
    send_speed: { min: number; max: number } | null;
    batch_size: number | null;
    batch_name: string | null;
    automation_id: string | null;
    followUp: {
      enabled: boolean;
      waitValue: number;
      waitUnit: 'seconds' | 'minutes' | 'hours' | 'days';
      message: string;
      maxFollowUps: number;
    } | null;
  }) => void;
  isSubmitting?: boolean;
}

interface CsvParsedRow {
  name?: string;
  phone?: string;
  [key: string]: string | undefined;
}

interface CsvUploadState {
  file: File | null;
  listName: string;
  parsedRows: CsvParsedRow[];
  totalFound: number;
  duplicatesRemoved: number;
  uniqueContactIds: string[];
  importComplete: boolean;
}

type SendSpeedPreset = 'fast' | 'normal' | 'slow' | 'custom';

interface WizardData {
  name: string;
  description: string;
  recipientSource: 'contacts' | 'csv' | 'group';
  selectedLabels: string[];
  selectedStages: string[];
  selectedBatchName: string | null;
  csv: CsvUploadState;
  automationId: string | null;
  // Compose step — multi-template
  messageTemplates: string[];
  customDraft: string;
  templateRotation: boolean;
  aiVariantCount: number;
  isGeneratingAi: boolean;
  // Numbers
  selectedNumberIds: string[];
  rotation: boolean;
  // Opt-out
  includeOptOut: boolean;
  // Send speed
  sendSpeedPreset: SendSpeedPreset;
  sendSpeedMin: number;
  sendSpeedMax: number;
  // Batch
  batchSendAll: boolean;
  batchSize: number;
  // Follow-up
  followUpEnabled: boolean;
  followUpWaitValue: number;
  followUpWaitUnit: 'seconds' | 'minutes' | 'hours' | 'days';
  followUpMessage: string;
  followUpMax: number;
  // Schedule
  scheduleType: 'now' | 'later';
  scheduledDate: Date | undefined;
  scheduledTime: string;
}

const STEPS = [
  'Name',
  'Recipients',
  'Compose',
  'Number',
  'Send Speed',
  'Batch',
  'Follow-up',
  'Automation',
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

const INITIAL_CSV: CsvUploadState = {
  file: null,
  listName: '',
  parsedRows: [],
  totalFound: 0,
  duplicatesRemoved: 0,
  uniqueContactIds: [],
  importComplete: false,
};

const INITIAL_DATA: WizardData = {
  name: '',
  description: '',
  recipientSource: 'contacts',
  selectedLabels: [],
  selectedStages: [],
  selectedBatchName: null,
  csv: { ...INITIAL_CSV },
  automationId: null,
  messageTemplates: [],
  customDraft: '',
  templateRotation: false,
  aiVariantCount: 3,
  isGeneratingAi: false,
  selectedNumberIds: [],
  rotation: false,
  includeOptOut: false,
  sendSpeedPreset: 'normal',
  sendSpeedMin: 5,
  sendSpeedMax: 10,
  batchSendAll: true,
  batchSize: 100,
  followUpEnabled: false,
  followUpWaitValue: 3,
  followUpWaitUnit: 'days',
  followUpMessage: '',
  followUpMax: 1,
  scheduleType: 'now',
  scheduledDate: undefined,
  scheduledTime: '09:00',
};

function speedPresetToRange(preset: SendSpeedPreset): { min: number; max: number } {
  switch (preset) {
    case 'fast': return { min: 1, max: 3 };
    case 'normal': return { min: 5, max: 10 };
    case 'slow': return { min: 15, max: 30 };
    default: return { min: 5, max: 10 };
  }
}

export default function CampaignWizard({ open, onClose, onComplete, isSubmitting }: CampaignWizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({ ...INITIAL_DATA });

  const { labels } = useLabels();
  const { stages } = useStages();
  const { templates } = useTemplates();
  const { numbers } = useNumbers();
  const { contacts, bulkCreateContacts, batchGroups } = useContacts();
  const { automations } = useAutomations();

  function update(partial: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function updateCsv(partial: Partial<CsvUploadState>) {
    setData((prev) => ({ ...prev, csv: { ...prev.csv, ...partial } }));
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

  function getRecipientContactIds(): string[] {
    if (data.recipientSource === 'csv') return data.csv.uniqueContactIds;
    if (data.recipientSource === 'group') {
      return contacts.filter((c) => c.batchName === data.selectedBatchName).map((c) => c.id);
    }
    return getMatchingContactIds();
  }

  function canAdvance(): boolean {
    switch (step) {
      case 0: return data.name.trim().length > 0;
      case 1: {
        if (data.recipientSource === 'csv') {
          return data.csv.importComplete && data.csv.uniqueContactIds.length > 0;
        }
        if (data.recipientSource === 'group') {
          return data.selectedBatchName !== null && contacts.some((c) => c.batchName === data.selectedBatchName);
        }
        return data.selectedLabels.length > 0 || data.selectedStages.length > 0;
      }
      case 2: return data.messageTemplates.length > 0;
      case 3: return data.selectedNumberIds.length > 0;
      case 4: return data.sendSpeedPreset !== 'custom' || (data.sendSpeedMin > 0 && data.sendSpeedMax >= data.sendSpeedMin);
      case 5: return true; // Batch
      case 6: return true; // Follow-up
      case 7: return data.automationId !== null; // Automation (required)
      case 8: return true; // Opt-out
      case 9: return data.scheduleType === 'now' || (data.scheduledDate !== undefined && data.scheduledTime.length > 0);
      case 10: return true; // Review
      default: return false;
    }
  }

  // Normalise parsed CSV rows — map any phone-like column to `phone`, name-like to `name`
  function normaliseCsvRows(raw: CsvParsedRow[]): CsvParsedRow[] {
    if (raw.length === 0) return raw;
    const keys = Object.keys(raw[0]);
    const phoneKey = keys.find((k) =>
      /^(phone[\s_]?number?|mobile|tel(ephone)?|contact[\s_]?number?)$/i.test(k.trim())
    ) || keys.find((k) => /phone|mobile|tel/i.test(k));
    const nameKey = keys.find((k) =>
      /^(full[\s_]?name|contact[\s_]?name|display[\s_]?name|first[\s_]?name|name)$/i.test(k.trim())
    ) || keys.find((k) => /name/i.test(k));
    if (!phoneKey) return raw;
    return raw.map((r) => ({ ...r, phone: r[phoneKey]?.trim() || undefined, name: nameKey ? (r[nameKey]?.trim() || undefined) : r.name }));
  }

  // CSV parsing
  function handleCsvFile(file: File) {
    updateCsv({ file });
    Papa.parse<CsvParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = normaliseCsvRows(result.data).filter((r) => r.phone && r.phone.trim().length > 0);
        const existingPhones = new Set(contacts.map((c) => c.phoneNumber));
        const uniqueRows = rows.filter((r) => !existingPhones.has(r.phone!));
        const duplicatesRemoved = rows.length - uniqueRows.length;
        updateCsv({
          parsedRows: uniqueRows,
          totalFound: rows.length,
          duplicatesRemoved,
        });
      },
    });
  }

  async function handleCsvImport() {
    if (data.csv.parsedRows.length === 0) return;
    try {
      const batchName = data.csv.listName.trim() || null;
      const rowsToInsert = data.csv.parsedRows.map((r) => ({
        phone_number: r.phone!,
        display_name: r.name || undefined,
        batch_name: batchName,
      }));

      // Use bulkCreateContacts — it invalidates query cache
      await bulkCreateContacts(rowsToInsert as { phone_number: string; display_name?: string }[]);

      // After import, we need to find the IDs of the newly created contacts
      // Re-fetch contacts to get the new IDs
      const { data: newContacts, error } = await (supabase
        .from('sms_contacts' as never)
        .select('id, phone_number')
        .in('phone_number', data.csv.parsedRows.map((r) => r.phone!)) as never);

      if (error) throw error;
      const ids = ((newContacts as { id: string; phone_number: string }[]) ?? []).map((c) => c.id);
      updateCsv({ uniqueContactIds: ids, importComplete: true });
      toast.success(`${ids.length} contacts imported`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import contacts');
    }
  }

  // Compose step helpers
  function addTemplateFromExisting(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl && !data.messageTemplates.includes(tpl.body)) {
      update({ messageTemplates: [...data.messageTemplates, tpl.body] });
    }
  }

  function addCustomMessage() {
    if (data.customDraft.trim().length === 0) return;
    update({
      messageTemplates: [...data.messageTemplates, data.customDraft.trim()],
      customDraft: '',
    });
  }

  function removeTemplate(index: number) {
    update({ messageTemplates: data.messageTemplates.filter((_, i) => i !== index) });
  }

  function insertVariableInDraft(v: string) {
    update({ customDraft: data.customDraft + v });
  }

  async function generateAiVariants() {
    if (data.customDraft.trim().length === 0 && data.messageTemplates.length === 0) {
      toast.error('Write a base message first');
      return;
    }
    const baseMessage = data.customDraft.trim() || data.messageTemplates[0];
    update({ isGeneratingAi: true });
    try {
      const { data: aiData, error } = await supabase.functions.invoke('sms-ai-respond', {
        body: {
          system_prompt: `Generate ${data.aiVariantCount} natural variations of the user's SMS message. Keep the same meaning, tone, and language. Include emojis where the original has them. Return as a JSON array of strings only, no other text.`,
          user_message: baseMessage,
          model: 'gpt-5.4-mini',
          temperature: 0.8,
        },
      });

      if (error) throw error;

      let variants: string[] = [];
      if (aiData?.reply) {
        try {
          // Try to parse JSON from the reply
          const parsed = JSON.parse(aiData.reply);
          if (Array.isArray(parsed)) {
            variants = parsed.filter((v: unknown) => typeof v === 'string');
          }
        } catch {
          // If the reply has JSON embedded in text, try to extract it
          const jsonMatch = (aiData.reply as string).match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsed)) {
                variants = parsed.filter((v: unknown) => typeof v === 'string');
              }
            } catch {
              toast.error('Could not parse AI response');
            }
          }
        }
      }

      if (variants.length > 0) {
        update({ messageTemplates: [...data.messageTemplates, ...variants] });
        toast.success(`Generated ${variants.length} variants`);
      } else {
        toast.error('AI returned no variants');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate variants');
    } finally {
      update({ isGeneratingAi: false });
    }
  }

  function handleCreate() {
    const contactIds = getRecipientContactIds();

    let scheduledAt: string | null = null;
    if (data.scheduleType === 'later' && data.scheduledDate) {
      const d = new Date(data.scheduledDate);
      const [hours, minutes] = data.scheduledTime.split(':').map(Number);
      d.setHours(hours, minutes, 0, 0);
      scheduledAt = d.toISOString();
    }

    const speedRange = data.sendSpeedPreset === 'custom'
      ? { min: data.sendSpeedMin, max: data.sendSpeedMax }
      : speedPresetToRange(data.sendSpeedPreset);

    onComplete({
      name: data.name,
      message_body: data.messageTemplates[0] || '',
      templates: data.messageTemplates,
      template_rotation: data.templateRotation,
      number_ids: data.selectedNumberIds,
      rotation: data.rotation,
      include_opt_out: data.includeOptOut,
      scheduled_at: scheduledAt,
      contact_ids: contactIds,
      sendNow: data.scheduleType === 'now',
      send_speed: speedRange,
      batch_size: data.batchSendAll ? null : data.batchSize,
      batch_name: data.recipientSource === 'csv' ? (data.csv.listName.trim() || null) : (data.recipientSource === 'group' ? data.selectedBatchName : null),
      automation_id: data.automationId,
      followUp: data.followUpEnabled
        ? {
            enabled: true,
            waitValue: data.followUpWaitValue,
            waitUnit: data.followUpWaitUnit,
            message: data.followUpMessage,
            maxFollowUps: data.followUpMax,
          }
        : null,
    });

    setStep(0);
    setData({ ...INITIAL_DATA });
  }

  function toggleInArray(arr: string[], id: string): string[] {
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  }

  const matchingCount = data.recipientSource === 'contacts'
    ? getMatchingContactIds().length
    : data.recipientSource === 'group'
    ? contacts.filter((c) => c.batchName === data.selectedBatchName).length
    : data.csv.uniqueContactIds.length;
  const recipientCount = getRecipientContactIds().length;

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
                {batchGroups.length > 0 && (
                  <Button
                    variant={data.recipientSource === 'group' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => update({ recipientSource: 'group' })}
                    className={cn(
                      'rounded-lg',
                      data.recipientSource === 'group' && 'bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white',
                    )}
                  >
                    <FolderOpen className="h-4 w-4 mr-1.5" />
                    Contact Group
                  </Button>
                )}
              </div>

              {data.recipientSource === 'group' ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A] mb-2">Select a contact group</p>
                    <Select
                      value={data.selectedBatchName ?? ''}
                      onValueChange={(v) => update({ selectedBatchName: v })}
                    >
                      <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                        <SelectValue placeholder="Choose a group..." />
                      </SelectTrigger>
                      <SelectContent>
                        {batchGroups.map((g) => (
                          <SelectItem key={g.batchName} value={g.batchName}>
                            {g.batchName} ({g.count} contact{g.count !== 1 ? 's' : ''})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {data.selectedBatchName && (
                    <p className="text-xs text-[#6B7280]">
                      {contacts.filter((c) => c.batchName === data.selectedBatchName).length} contact{contacts.filter((c) => c.batchName === data.selectedBatchName).length !== 1 ? 's' : ''} in this group
                    </p>
                  )}
                </div>
              ) : data.recipientSource === 'contacts' ? (
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
                <div className="space-y-4">
                  {/* CSV upload flow */}
                  {!data.csv.file ? (
                    <div>
                      <Label className="text-sm font-medium text-[#1A1A1A]">Upload CSV file</Label>
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCsvFile(file);
                        }}
                        className="mt-1.5 rounded-lg border-[#E5E7EB]"
                      />
                    </div>
                  ) : !data.csv.importComplete ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-[#E5E7EB] bg-[#F3F3EE]/30 p-3">
                        <p className="text-sm text-[#1A1A1A] font-medium">{data.csv.file.name}</p>
                        <p className="text-xs text-[#6B7280] mt-1">
                          Found {data.csv.totalFound} contacts. {data.csv.duplicatesRemoved} duplicates removed.
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-[#1A1A1A]">List name</Label>
                        <Input
                          value={data.csv.listName}
                          onChange={(e) => updateCsv({ listName: e.target.value })}
                          placeholder="e.g. April leads, London landlords"
                          className="mt-1.5 rounded-lg border-[#E5E7EB]"
                        />
                        <p className="text-xs text-[#9CA3AF] mt-1">
                          This name will be saved as the batch name for these contacts
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCsv({ ...INITIAL_CSV })}
                          className="rounded-lg border-[#E5E7EB]"
                        >
                          Choose different file
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleCsvImport}
                          disabled={data.csv.parsedRows.length === 0}
                          className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
                        >
                          Import {data.csv.parsedRows.length} contacts
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-[#1E9A80]/30 bg-[#ECFDF5] p-4">
                      <CheckCircle className="h-5 w-5 text-[#1E9A80] shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">
                          Found {data.csv.totalFound} contacts. {data.csv.duplicatesRemoved} duplicates removed.
                        </p>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          {data.csv.uniqueContactIds.length} unique contacts ready to receive messages
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Compose — Multi-template */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Existing message cards */}
              {data.messageTemplates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#1A1A1A]">
                    Messages ({data.messageTemplates.length})
                  </p>
                  {data.messageTemplates.map((msg, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-[#E5E7EB] bg-white p-3 flex items-start gap-2"
                    >
                      <span className="text-xs font-medium text-[#9CA3AF] mt-0.5 shrink-0 w-5">
                        #{i + 1}
                      </span>
                      <p className="text-sm text-[#1A1A1A] flex-1 whitespace-pre-wrap break-words">
                        {msg.length > 120 ? msg.slice(0, 120) + '...' : msg}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTemplate(i)}
                        className="shrink-0 h-7 w-7 p-0 text-[#9CA3AF] hover:text-[#EF4444]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add from template */}
              <div>
                <Label className="text-sm font-medium text-[#1A1A1A]">Add from template</Label>
                <Select onValueChange={addTemplateFromExisting}>
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

              {/* Custom message */}
              <div>
                <Label className="text-sm font-medium text-[#1A1A1A]">Write custom message</Label>
                <Textarea
                  value={data.customDraft}
                  onChange={(e) => update({ customDraft: e.target.value })}
                  placeholder="Type your message..."
                  className="mt-1.5 rounded-lg border-[#E5E7EB] resize-none font-mono text-sm"
                  rows={4}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-1.5">
                    {VARIABLES.map((v) => (
                      <Button
                        key={v}
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariableInDraft(v)}
                        className="rounded-md text-xs h-7 border-[#E5E7EB] text-[#6B7280]"
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                  <span className="text-xs text-[#9CA3AF] tabular-nums">
                    {data.customDraft.length} chars / {getSegmentCount(data.customDraft)} segment{getSegmentCount(data.customDraft) !== 1 ? 's' : ''}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addCustomMessage}
                  disabled={data.customDraft.trim().length === 0}
                  className="mt-2 rounded-lg border-[#E5E7EB]"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add custom message
                </Button>
              </div>

              {/* AI Variants */}
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F3F3EE]/30 p-3 space-y-3">
                <p className="text-sm font-medium text-[#1A1A1A] flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#1E9A80]" />
                  Generate AI Variants
                </p>
                <p className="text-xs text-[#6B7280]">
                  Write a base message above, then generate natural variations.
                  The AI will use your draft or first message as the base.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-[#6B7280]">Variants:</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={data.aiVariantCount}
                      onChange={(e) => update({ aiVariantCount: Math.min(10, Math.max(1, parseInt(e.target.value) || 3)) })}
                      className="w-16 h-8 rounded-md border-[#E5E7EB] text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={generateAiVariants}
                    disabled={data.isGeneratingAi || (data.customDraft.trim().length === 0 && data.messageTemplates.length === 0)}
                    className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
                  >
                    {data.isGeneratingAi ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        Generate Variants
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Template rotation toggle */}
              {data.messageTemplates.length > 1 && (
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    checked={data.templateRotation}
                    onCheckedChange={(v) => update({ templateRotation: v })}
                  />
                  <Label className="text-sm text-[#1A1A1A]">
                    Rotate through templates (each recipient gets a different message)
                  </Label>
                </div>
              )}
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

          {/* Step 5: Send Speed */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[#1A1A1A]">Delay between messages</p>
              <div className="space-y-2">
                {([
                  { value: 'fast' as const, label: 'Fast', desc: '1-3 seconds between messages' },
                  { value: 'normal' as const, label: 'Normal', desc: '5-10 seconds between messages' },
                  { value: 'slow' as const, label: 'Slow', desc: '15-30 seconds between messages' },
                  { value: 'custom' as const, label: 'Custom', desc: 'Set your own delay range' },
                ]).map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      data.sendSpeedPreset === option.value
                        ? 'border-[#1E9A80] bg-[#ECFDF5]'
                        : 'border-[#E5E7EB] hover:bg-[#F3F3EE]/30',
                    )}
                  >
                    <div
                      className={cn(
                        'h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                        data.sendSpeedPreset === option.value
                          ? 'border-[#1E9A80]'
                          : 'border-[#9CA3AF]',
                      )}
                    >
                      {data.sendSpeedPreset === option.value && (
                        <div className="h-2 w-2 rounded-full bg-[#1E9A80]" />
                      )}
                    </div>
                    <div
                      onClick={() => update({ sendSpeedPreset: option.value })}
                      className="flex-1"
                    >
                      <span className="text-sm font-medium text-[#1A1A1A]">{option.label}</span>
                      <span className="text-xs text-[#6B7280] ml-2">{option.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
              {data.sendSpeedPreset === 'custom' && (
                <div className="flex items-center gap-3 pl-10">
                  <div>
                    <Label className="text-xs text-[#6B7280]">Min (seconds)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={data.sendSpeedMin}
                      onChange={(e) => update({ sendSpeedMin: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-20 h-8 rounded-md border-[#E5E7EB] text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[#6B7280]">Max (seconds)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={data.sendSpeedMax}
                      onChange={(e) => update({ sendSpeedMax: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-20 h-8 rounded-md border-[#E5E7EB] text-sm mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Batch Size */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[#1A1A1A]">How many to send per batch?</p>
              <div className="flex items-center gap-2">
                <Switch
                  checked={data.batchSendAll}
                  onCheckedChange={(v) => update({ batchSendAll: v })}
                />
                <Label className="text-sm text-[#1A1A1A]">Send all at once</Label>
              </div>
              {!data.batchSendAll && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-[#1A1A1A]">Batch size</Label>
                    <Input
                      type="number"
                      min={1}
                      value={data.batchSize}
                      onChange={(e) => update({ batchSize: Math.max(1, parseInt(e.target.value) || 100) })}
                      className="mt-1.5 rounded-lg border-[#E5E7EB] w-32"
                    />
                  </div>
                  <div className="rounded-lg border border-[#E5E7EB] bg-[#F3F3EE]/30 p-3">
                    <p className="text-sm text-[#6B7280]">
                      First batch will send <span className="font-medium text-[#1A1A1A]">{Math.min(data.batchSize, recipientCount)}</span> messages.
                      {recipientCount > data.batchSize && (
                        <> You can send the next batch from the campaign page.</>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 7: Follow-up */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={data.followUpEnabled}
                  onCheckedChange={(v) => update({ followUpEnabled: v })}
                />
                <Label className="text-sm text-[#1A1A1A]">Auto follow-up if no reply</Label>
              </div>
              {data.followUpEnabled && (
                <div className="space-y-4 pl-1">
                  <div>
                    <Label className="text-sm font-medium text-[#1A1A1A]">Wait before follow-up</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Input
                        type="number"
                        min={1}
                        value={data.followUpWaitValue}
                        onChange={(e) => update({ followUpWaitValue: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="rounded-lg border-[#E5E7EB] w-24"
                      />
                      <Select
                        value={data.followUpWaitUnit}
                        onValueChange={(v) => update({ followUpWaitUnit: v as WizardData['followUpWaitUnit'] })}
                      >
                        <SelectTrigger className="rounded-lg border-[#E5E7EB] w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seconds">Seconds</SelectItem>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#1A1A1A]">Follow-up message</Label>
                    {templates.length > 0 && (
                      <Select
                        onValueChange={(id) => {
                          const tpl = templates.find((t) => t.id === id);
                          if (tpl) update({ followUpMessage: tpl.body });
                        }}
                      >
                        <SelectTrigger className="mt-1.5 rounded-lg border-[#E5E7EB]">
                          <SelectValue placeholder="Pick from template (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Textarea
                      value={data.followUpMessage}
                      onChange={(e) => update({ followUpMessage: e.target.value })}
                      placeholder="Type follow-up message..."
                      className="mt-1.5 rounded-lg border-[#E5E7EB] resize-none text-sm"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#1A1A1A]">Max follow-ups</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={data.followUpMax}
                      onChange={(e) => update({ followUpMax: Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) })}
                      className="mt-1.5 rounded-lg border-[#E5E7EB] w-32"
                    />
                  </div>
                  <p className="text-xs text-[#6B7280]">
                    A follow-up message will be sent if the contact hasn&apos;t replied after the wait period
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 8: Automation */}
          {step === 7 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[#1A1A1A]">Reply automation</p>
              <p className="text-xs text-[#6B7280]">
                Select an automation to handle inbound replies from this campaign. This is required to launch the campaign.
              </p>
              <Select
                value={data.automationId ?? 'none'}
                onValueChange={(v) => update({ automationId: v === 'none' ? null : v })}
              >
                <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                  <SelectValue placeholder="No automation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No automation</SelectItem>
                  {automations.filter((a) => a.isActive).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-[#1E9A80]" />
                        {a.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {data.automationId && (
                <div className="rounded-lg border border-[#1E9A80]/30 bg-[#ECFDF5] p-3">
                  <p className="text-sm text-[#1A1A1A]">
                    Replies will be routed to: <span className="font-medium">{automations.find((a) => a.id === data.automationId)?.name}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 9: Opt-out */}
          {step === 8 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={data.includeOptOut}
                  onCheckedChange={(v) => update({ includeOptOut: v })}
                />
                <Label className="text-sm text-[#1A1A1A]">Append opt-out message</Label>
              </div>
              {data.includeOptOut && data.messageTemplates.length > 0 && (
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F3F3EE]/50 p-3">
                  <p className="text-sm text-[#6B7280] italic">
                    Preview: &quot;...{data.messageTemplates[0].slice(-30)} Reply STOP to unsubscribe&quot;
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 10: Schedule */}
          {step === 9 && (
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

          {/* Step 11: Review */}
          {step === 10 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F3F3EE]/30 p-4 space-y-3">
                <Row label="Name" value={data.name} />
                <Row
                  label="Recipients"
                  value={
                    data.recipientSource === 'csv'
                      ? `CSV: ${data.csv.file?.name} (${data.csv.uniqueContactIds.length} contacts)`
                      : data.recipientSource === 'group'
                      ? `Group: ${data.selectedBatchName} (${matchingCount} contacts)`
                      : `${matchingCount} contact${matchingCount !== 1 ? 's' : ''}`
                  }
                />
                {data.csv.listName && (
                  <Row label="List name" value={data.csv.listName} />
                )}
                <Row
                  label="Messages"
                  value={`${data.messageTemplates.length} template${data.messageTemplates.length !== 1 ? 's' : ''}`}
                />
                {data.messageTemplates.map((msg, i) => (
                  <Row
                    key={i}
                    label={`  #${i + 1}`}
                    value={msg.length > 60 ? msg.slice(0, 60) + '...' : msg}
                  />
                ))}
                <Row label="Numbers" value={data.selectedNumberIds.map((id) => numbers.find((n) => n.id === id)?.label).filter(Boolean).join(', ')} />
                <Row label="Num rotation" value={data.rotation ? 'Yes' : 'No'} />
                <Row label="Tpl rotation" value={data.templateRotation ? 'Yes' : 'No'} />
                <Row
                  label="Send speed"
                  value={
                    data.sendSpeedPreset === 'custom'
                      ? `${data.sendSpeedMin}-${data.sendSpeedMax}s`
                      : `${data.sendSpeedPreset} (${speedPresetToRange(data.sendSpeedPreset).min}-${speedPresetToRange(data.sendSpeedPreset).max}s)`
                  }
                />
                <Row label="Batch" value={data.batchSendAll ? 'Send all' : `${data.batchSize} per batch`} />
                <Row
                  label="Follow-up"
                  value={
                    data.followUpEnabled
                      ? `${data.followUpMax}x after ${data.followUpWaitValue} ${data.followUpWaitUnit}`
                      : 'Off'
                  }
                />
                <Row label="Automation" value={data.automationId ? (automations.find((a) => a.id === data.automationId)?.name ?? 'Selected') : 'None'} />
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
