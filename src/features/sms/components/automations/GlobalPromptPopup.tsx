import { useState, useEffect, useCallback } from 'react';
import { X, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useFlowContext } from './FlowContext';

export function GlobalPromptPopup() {
  const {
    showGlobalPrompt,
    setShowGlobalPrompt,
    globalPrompt,
    setGlobalPrompt,
    globalModel,
    setGlobalModel,
    globalTemperature,
    setGlobalTemperature,
    maxRepliesPerLead,
    setMaxRepliesPerLead,
  } = useFlowContext();

  const [draft, setDraft] = useState('');
  const [draftModel, setDraftModel] = useState('gpt-5.4-mini');
  const [draftTemp, setDraftTemp] = useState(0.7);
  const [draftMaxReplies, setDraftMaxReplies] = useState(10);

  useEffect(() => {
    if (showGlobalPrompt) {
      setDraft(globalPrompt);
      setDraftModel(globalModel);
      setDraftTemp(globalTemperature);
      setDraftMaxReplies(maxRepliesPerLead);
    }
  }, [showGlobalPrompt, globalPrompt, globalModel, globalTemperature, maxRepliesPerLead]);

  const handleSave = useCallback(() => {
    setGlobalPrompt(draft);
    setGlobalModel(draftModel);
    setGlobalTemperature(draftTemp);
    setMaxRepliesPerLead(Math.max(1, draftMaxReplies));
    toast.success('Global prompt updated');
    setShowGlobalPrompt(false);
  }, [draft, draftModel, draftTemp, draftMaxReplies, setGlobalPrompt, setGlobalModel, setGlobalTemperature, setMaxRepliesPerLead, setShowGlobalPrompt]);

  if (!showGlobalPrompt) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-white border-l border-[#E5E7EB] z-50 flex flex-col shadow-lg animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#1E9A80]" />
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Global Prompt</h3>
        </div>
        <button
          onClick={() => setShowGlobalPrompt(false)}
          className="p-1.5 rounded-lg hover:bg-[#F9FAFB] text-[#9CA3AF] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <p className="text-xs text-[#6B7280]">
          This prompt is the brain of your automation. One prompt handles all conversation.
        </p>

        {/* System Prompt */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">System Prompt</Label>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="You are a helpful property assistant..."
            rows={10}
            className="rounded-lg border-[#E5E7EB] resize-none text-sm"
          />
          <p className="text-[10px] text-[#9CA3AF] text-right">
            {draft.length} characters
          </p>
        </div>

        {/* Model */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Model</Label>
          <Select value={draftModel} onValueChange={setDraftModel}>
            <SelectTrigger className="rounded-lg border-[#E5E7EB] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-5.4-nano">GPT-5.4 Nano (fastest, cheapest)</SelectItem>
              <SelectItem value="gpt-5.4-mini">GPT-5.4 Mini (recommended)</SelectItem>
              <SelectItem value="gpt-5.4">GPT-5.4 (flagship)</SelectItem>
              <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
              <SelectItem value="gpt-5">GPT-5</SelectItem>
              <SelectItem value="o4-mini">O4 Mini (reasoning)</SelectItem>
              <SelectItem value="o3-mini">O3 Mini (reasoning)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Temperature */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">
            Temperature: {draftTemp.toFixed(1)}
          </Label>
          <Slider
            value={[draftTemp]}
            onValueChange={([v]) => setDraftTemp(v)}
            min={0}
            max={1}
            step={0.1}
            className="py-2"
          />
          <p className="text-[10px] text-[#9CA3AF]">
            Lower = more focused replies. Higher = more creative.
          </p>
        </div>

        {/* Max Replies */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">
            Max Replies Per Lead
          </Label>
          <Input
            type="number"
            value={draftMaxReplies}
            onChange={(e) => setDraftMaxReplies(parseInt(e.target.value) || 1)}
            min={1}
            className="rounded-lg border-[#E5E7EB] w-[120px]"
          />
          <p className="text-[10px] text-[#9CA3AF]">
            Automation stops responding to a lead after this many replies
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#E5E7EB]">
        <Button
          variant="outline"
          onClick={() => setShowGlobalPrompt(false)}
          className="rounded-xl border-[#E5E7EB]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white rounded-xl px-6"
        >
          Save
        </Button>
      </div>
    </div>
  );
}
