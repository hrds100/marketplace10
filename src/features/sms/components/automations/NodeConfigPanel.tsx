import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { mockLabels } from '../../data/mockLabels';
import { mockTemplates } from '../../data/mockTemplates';
import { mockStages } from '../../data/mockStages';
import type { SmsFlowNodeData, SmsFlowNodeType } from '../../types';

interface NodeConfigPanelProps {
  node: { id: string; data: SmsFlowNodeData } | null;
  onUpdate: (nodeId: string, config: Record<string, unknown>) => void;
  onClose: () => void;
}

const TEAM_MEMBERS = [
  { id: 'hugo', name: 'Hugo' },
  { id: 'sarah', name: 'Sarah' },
];

const NODE_TYPE_LABELS: Record<SmsFlowNodeType, string> = {
  trigger: 'Trigger',
  ai_response: 'AI Response',
  condition: 'Condition',
  delay: 'Delay',
  label: 'Label',
  transfer: 'Transfer',
  template: 'Template',
  webhook: 'Webhook',
  move_stage: 'Move Stage',
};

export default function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (node) {
      setConfig({ ...node.data.config });
    }
  }, [node]);

  if (!node) return null;

  const { type } = node.data;

  const handleSave = () => {
    onUpdate(node.id, config);
  };

  const updateField = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <aside className="w-[320px] border-l border-[#E5E7EB] bg-white flex-shrink-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
        <h3 className="text-sm font-semibold text-[#1A1A1A]">
          {NODE_TYPE_LABELS[type]}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[#F3F3EE] text-[#9CA3AF] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {type === 'trigger' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Trigger Type</Label>
              <Select
                value={(config.triggerType as string) || 'new_message'}
                onValueChange={(v) => updateField('triggerType', v)}
              >
                <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_message">New Message</SelectItem>
                  <SelectItem value="keyword">Keyword</SelectItem>
                  <SelectItem value="time_based">Time Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Phone Number</Label>
              <Input
                value={(config.number as string) || ''}
                onChange={(e) => updateField('number', e.target.value)}
                placeholder="+44 7XXX..."
                className="rounded-lg border-[#E5E7EB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Keywords (comma separated)</Label>
              <Input
                value={((config.keywords as string[]) || []).join(', ')}
                onChange={(e) =>
                  updateField(
                    'keywords',
                    e.target.value.split(',').map((k) => k.trim()).filter(Boolean)
                  )
                }
                placeholder="rent, property, viewing"
                className="rounded-lg border-[#E5E7EB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Time Range</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={(config.timeStart as string) || '09:00'}
                  onChange={(e) => updateField('timeStart', e.target.value)}
                  className="rounded-lg border-[#E5E7EB] flex-1"
                />
                <span className="text-xs text-[#9CA3AF]">to</span>
                <Input
                  type="time"
                  value={(config.timeEnd as string) || '18:00'}
                  onChange={(e) => updateField('timeEnd', e.target.value)}
                  className="rounded-lg border-[#E5E7EB] flex-1"
                />
              </div>
            </div>
          </>
        )}

        {type === 'ai_response' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">System Prompt</Label>
              <Textarea
                value={(config.systemPrompt as string) || ''}
                onChange={(e) => updateField('systemPrompt', e.target.value)}
                placeholder="You are a helpful property assistant..."
                rows={4}
                className="rounded-lg border-[#E5E7EB] resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Model</Label>
              <Select
                value={(config.model as string) || 'GPT-4o'}
                onValueChange={(v) => updateField('model', v)}
              >
                <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GPT-4o">GPT-4o</SelectItem>
                  <SelectItem value="GPT-4o-mini">GPT-4o-mini</SelectItem>
                  <SelectItem value="GPT-3.5">GPT-3.5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">
                Temperature: {((config.temperature as number) ?? 0.7).toFixed(1)}
              </Label>
              <Slider
                value={[(config.temperature as number) ?? 0.7]}
                onValueChange={([v]) => updateField('temperature', v)}
                min={0}
                max={2}
                step={0.1}
                className="py-2"
              />
            </div>
          </>
        )}

        {type === 'condition' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Field</Label>
              <Select
                value={(config.field as string) || 'message'}
                onValueChange={(v) => updateField('field', v)}
              >
                <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">Message</SelectItem>
                  <SelectItem value="label">Label</SelectItem>
                  <SelectItem value="time">Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Operator</Label>
              <Select
                value={(config.operator as string) || 'contains'}
                onValueChange={(v) => updateField('operator', v)}
              >
                <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="regex">Regex</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Value</Label>
              <Input
                value={(config.value as string) || ''}
                onChange={(e) => updateField('value', e.target.value)}
                placeholder="viewing"
                className="rounded-lg border-[#E5E7EB]"
              />
            </div>
          </>
        )}

        {type === 'delay' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Duration</Label>
              <Input
                type="number"
                value={(config.duration as number) || ''}
                onChange={(e) => updateField('duration', parseInt(e.target.value) || 0)}
                placeholder="30"
                min={1}
                className="rounded-lg border-[#E5E7EB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Unit</Label>
              <Select
                value={(config.unit as string) || 'minutes'}
                onValueChange={(v) => updateField('unit', v)}
              >
                <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {type === 'label' && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#6B7280]">Label</Label>
            <Select
              value={(config.labelId as string) || ''}
              onValueChange={(v) => {
                const lbl = mockLabels.find((l) => l.id === v);
                updateField('labelId', v);
                updateField('labelName', lbl?.name || '');
                updateField('labelColour', lbl?.colour || '#1E9A80');
              }}
            >
              <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                <SelectValue placeholder="Select a label" />
              </SelectTrigger>
              <SelectContent>
                {mockLabels.map((lbl) => (
                  <SelectItem key={lbl.id} value={lbl.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: lbl.colour }}
                      />
                      {lbl.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {type === 'transfer' && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#6B7280]">Assign To</Label>
            <Select
              value={(config.assigneeId as string) || ''}
              onValueChange={(v) => {
                const member = TEAM_MEMBERS.find((m) => m.id === v);
                updateField('assigneeId', v);
                updateField('assignee', member?.name || '');
              }}
            >
              <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_MEMBERS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {type === 'template' && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#6B7280]">Template</Label>
            <Select
              value={(config.templateId as string) || ''}
              onValueChange={(v) => {
                const tpl = mockTemplates.find((t) => t.id === v);
                updateField('templateId', v);
                updateField('templateName', tpl?.name || '');
              }}
            >
              <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {mockTemplates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {type === 'webhook' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">URL</Label>
              <Input
                value={(config.url as string) || ''}
                onChange={(e) => updateField('url', e.target.value)}
                placeholder="https://api.example.com/webhook"
                className="rounded-lg border-[#E5E7EB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Method</Label>
              <Select
                value={(config.method as string) || 'POST'}
                onValueChange={(v) => updateField('method', v)}
              >
                <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {type === 'move_stage' && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#6B7280]">Target Stage</Label>
            <Select
              value={(config.stageId as string) || ''}
              onValueChange={(v) => {
                const stage = mockStages.find((s) => s.id === v);
                updateField('stageId', v);
                updateField('stageName', stage?.name || '');
              }}
            >
              <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                <SelectValue placeholder="Select a stage" />
              </SelectTrigger>
              <SelectContent>
                {mockStages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: stage.colour }}
                      />
                      {stage.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="p-4 border-t border-[#E5E7EB]">
        <Button
          onClick={handleSave}
          className="w-full bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white rounded-xl"
        >
          Save
        </Button>
      </div>
    </aside>
  );
}
