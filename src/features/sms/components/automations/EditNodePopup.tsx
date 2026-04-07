import { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus, X, GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { SmsNodeType, type SmsNodeData, type SmsFollowUpStep } from '../../types';
import { mockLabels } from '../../data/mockLabels';
import { mockStages } from '../../data/mockStages';
import { useFlowContext } from './FlowContext';

const TEAM_MEMBERS = [
  { id: 'hugo', name: 'Hugo' },
  { id: 'sarah', name: 'Sarah' },
];

const NODE_TYPE_OPTIONS: { value: SmsNodeType; label: string }[] = [
  { value: SmsNodeType.DEFAULT, label: 'AI Response' },
  { value: SmsNodeType.STOP_CONVERSATION, label: 'Stop Conversation' },
  { value: SmsNodeType.FOLLOW_UP, label: 'Follow Up' },
  { value: SmsNodeType.TRANSFER, label: 'Transfer' },
  { value: SmsNodeType.LABEL, label: 'Label' },
  { value: SmsNodeType.MOVE_STAGE, label: 'Move Stage' },
  { value: SmsNodeType.WEBHOOK, label: 'Webhook' },
];

function generateStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function EditNodePopup() {
  const { isEditingNode, setIsEditingNode, nodes, setNodes, updateNode, deleteNodes } =
    useFlowContext();

  const node = nodes.find((n) => n.id === isEditingNode);
  const nodeType = (node?.type as SmsNodeType) || SmsNodeType.DEFAULT;
  const nodeData = node?.data as SmsNodeData | undefined;

  const [name, setName] = useState('');
  const [type, setType] = useState<SmsNodeType>(SmsNodeType.DEFAULT);
  const [useAiPrompt, setUseAiPrompt] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [text, setText] = useState('');
  const [delay, setDelay] = useState(0);
  const [temperature, setTemperature] = useState(0.7);
  const [steps, setSteps] = useState<SmsFollowUpStep[]>([]);
  const [assignTo, setAssignTo] = useState('');
  const [labelId, setLabelId] = useState('');
  const [stageId, setStageId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookMethod, setWebhookMethod] = useState('POST');
  const [model, setModel] = useState('gpt-5.4-mini');

  useEffect(() => {
    if (nodeData && node) {
      setName(nodeData.name || '');
      setType(nodeType);
      setPrompt(nodeData.prompt || '');
      setText(nodeData.text || '');
      setUseAiPrompt(!nodeData.text);
      setDelay(nodeData.delay || 0);
      setTemperature(nodeData.modelOptions?.temperature ?? 0.7);
      setModel(nodeData.modelOptions?.model || 'gpt-5.4-mini');
      setSteps(nodeData.steps || []);
      setAssignTo(nodeData.assignTo || '');
      setLabelId(nodeData.labelId || '');
      setStageId(nodeData.stageId || '');
      setWebhookUrl(nodeData.webhookUrl || '');
      setWebhookMethod(nodeData.webhookMethod || 'POST');
    }
  }, [nodeData, node, nodeType]);

  const handleSave = useCallback(() => {
    if (!isEditingNode || !node) return;

    // If type changed, update the node type in the nodes array
    if (type !== nodeType) {
      setNodes((prev) =>
        prev.map((n) => (n.id === isEditingNode ? { ...n, type } : n))
      );
    }

    const updates: Partial<SmsNodeData> = { name };

    if (type === SmsNodeType.DEFAULT || type === SmsNodeType.STOP_CONVERSATION) {
      updates.prompt = useAiPrompt ? prompt : undefined;
      updates.text = useAiPrompt ? undefined : text;
      updates.delay = delay;
      updates.modelOptions = { temperature, model };
    }
    if (type === SmsNodeType.FOLLOW_UP) {
      updates.steps = steps;
    }
    if (type === SmsNodeType.TRANSFER) {
      updates.assignTo = assignTo;
    }
    if (type === SmsNodeType.LABEL) {
      updates.labelId = labelId;
    }
    if (type === SmsNodeType.MOVE_STAGE) {
      updates.stageId = stageId;
    }
    if (type === SmsNodeType.WEBHOOK) {
      updates.webhookUrl = webhookUrl;
      updates.webhookMethod = webhookMethod;
    }

    updateNode(isEditingNode, updates);
    toast.success('Node updated');
    setIsEditingNode(null);
  }, [
    isEditingNode,
    node,
    type,
    nodeType,
    name,
    useAiPrompt,
    prompt,
    text,
    delay,
    temperature,
    model,
    steps,
    assignTo,
    labelId,
    stageId,
    webhookUrl,
    webhookMethod,
    setNodes,
    updateNode,
    setIsEditingNode,
  ]);

  const handleDelete = useCallback(() => {
    if (!isEditingNode) return;
    deleteNodes([isEditingNode]);
    toast.success('Node deleted');
  }, [isEditingNode, deleteNodes]);

  const addStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      { id: generateStepId(), name: `Step ${prev.length + 1}`, waitMinutes: 60, prompt: '' },
    ]);
  }, []);

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateStep = useCallback((id: string, updates: Partial<SmsFollowUpStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  if (!isEditingNode || !node) return null;

  const isStart = nodeData?.isStart === true;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && setIsEditingNode(null)}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#1A1A1A]">
            Edit Node
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#6B7280]">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border-[#E5E7EB]"
            />
          </div>

          {/* Type selector */}
          {!isStart && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Node Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as SmsNodeType)}>
                <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NODE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* DEFAULT fields */}
          {(type === SmsNodeType.DEFAULT || type === SmsNodeType.STOP_CONVERSATION) && (
            <>
              <div className="flex items-center gap-3">
                <Label className="text-xs font-medium text-[#6B7280]">Message Type</Label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${useAiPrompt ? 'text-[#1E9A80] font-medium' : 'text-[#9CA3AF]'}`}>
                    AI Prompt
                  </span>
                  <Switch
                    checked={!useAiPrompt}
                    onCheckedChange={(checked) => setUseAiPrompt(!checked)}
                  />
                  <span className={`text-xs ${!useAiPrompt ? 'text-[#1E9A80] font-medium' : 'text-[#9CA3AF]'}`}>
                    Exact Text
                  </span>
                </div>
              </div>

              {useAiPrompt ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#6B7280]">AI Prompt Instructions</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Instructions for the AI to generate a response..."
                    rows={4}
                    className="rounded-lg border-[#E5E7EB] resize-none text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#6B7280]">Exact Message</Label>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="The exact message to send..."
                    rows={4}
                    className="rounded-lg border-[#E5E7EB] resize-none text-sm"
                  />
                </div>
              )}

              {type === SmsNodeType.DEFAULT && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#6B7280]">
                      Delay before sending (minutes)
                    </Label>
                    <Input
                      type="number"
                      value={delay || ''}
                      onChange={(e) => setDelay(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      min={0}
                      className="rounded-lg border-[#E5E7EB] w-[120px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#6B7280]">
                      Temperature: {temperature.toFixed(1)}
                    </Label>
                    <Slider
                      value={[temperature]}
                      onValueChange={([v]) => setTemperature(v)}
                      min={0}
                      max={1}
                      step={0.1}
                      className="py-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[#6B7280]">AI Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="rounded-lg border-[#E5E7EB]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-5.4-nano">GPT-5.4 Nano (fastest, cheapest)</SelectItem>
                        <SelectItem value="gpt-5.4-mini">GPT-5.4 Mini (fast + smart, recommended)</SelectItem>
                        <SelectItem value="gpt-5.4">GPT-5.4 (flagship)</SelectItem>
                        <SelectItem value="gpt-5.4-pro">GPT-5.4 Pro (extended reasoning)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </>
          )}

          {/* FOLLOW_UP fields */}
          {type === SmsNodeType.FOLLOW_UP && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-[#6B7280]">
                  Steps ({steps.length})
                </Label>
                <button
                  onClick={addStep}
                  className="flex items-center gap-1 text-xs font-medium text-[#1E9A80] hover:text-[#1E9A80]/80 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Step
                </button>
              </div>

              {steps.length === 0 && (
                <p className="text-xs text-[#9CA3AF]">No steps yet. Add your first follow-up step.</p>
              )}

              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="p-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-3 h-3 text-[#9CA3AF] flex-shrink-0" />
                    <span className="text-[10px] font-semibold text-[#9CA3AF]">
                      #{index + 1}
                    </span>
                    <Input
                      value={step.name}
                      onChange={(e) => updateStep(step.id, { name: e.target.value })}
                      placeholder="Step name"
                      className="h-7 rounded-md border-[#E5E7EB] text-xs flex-1"
                    />
                    <button
                      onClick={() => removeStep(step.id)}
                      className="p-1 rounded hover:bg-[#EF4444]/10 text-[#9CA3AF] hover:text-[#EF4444] transition-colors flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-[#9CA3AF] flex-shrink-0">Wait</Label>
                    <Input
                      type="number"
                      value={step.waitMinutes || ''}
                      onChange={(e) =>
                        updateStep(step.id, { waitMinutes: parseInt(e.target.value) || 0 })
                      }
                      placeholder="60"
                      min={1}
                      className="h-7 rounded-md border-[#E5E7EB] text-xs w-[80px]"
                    />
                    <span className="text-[10px] text-[#9CA3AF]">min</span>
                  </div>
                  <Textarea
                    value={step.prompt || step.text || ''}
                    onChange={(e) => updateStep(step.id, { prompt: e.target.value })}
                    placeholder="Message content or AI prompt..."
                    rows={2}
                    className="rounded-md border-[#E5E7EB] resize-none text-xs"
                  />
                </div>
              ))}
            </div>
          )}

          {/* TRANSFER fields */}
          {type === SmsNodeType.TRANSFER && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Assign To</Label>
              <Select value={assignTo} onValueChange={setAssignTo}>
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

          {/* LABEL fields */}
          {type === SmsNodeType.LABEL && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Label</Label>
              <Select value={labelId} onValueChange={setLabelId}>
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

          {/* MOVE_STAGE fields */}
          {type === SmsNodeType.MOVE_STAGE && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Target Stage</Label>
              <Select value={stageId} onValueChange={setStageId}>
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

          {/* WEBHOOK fields */}
          {type === SmsNodeType.WEBHOOK && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B7280]">URL</Label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://api.example.com/webhook"
                  className="rounded-lg border-[#E5E7EB]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B7280]">Method</Label>
                <Select value={webhookMethod} onValueChange={setWebhookMethod}>
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E5E7EB]">
          {!isStart ? (
            <Button
              onClick={handleDelete}
              variant="outline"
              className="rounded-xl border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10 hover:text-[#EF4444] gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          ) : (
            <div />
          )}
          <Button
            onClick={handleSave}
            className="bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white rounded-xl px-6"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
