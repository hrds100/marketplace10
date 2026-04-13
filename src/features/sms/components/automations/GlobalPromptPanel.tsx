import { useState, useEffect, useCallback } from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';
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
import { useFlowContext } from './FlowContext';

export function GlobalPromptPanel() {
  const {
    globalPrompt,
    setGlobalPrompt,
    globalModel,
    setGlobalModel,
    globalTemperature,
    setGlobalTemperature,
    maxRepliesPerLead,
    setMaxRepliesPerLead,
  } = useFlowContext();

  const [isExpanded, setIsExpanded] = useState(true);
  const [draftPrompt, setDraftPrompt] = useState(globalPrompt);

  useEffect(() => {
    setDraftPrompt(globalPrompt);
  }, [globalPrompt]);

  const handlePromptBlur = useCallback(() => {
    if (draftPrompt !== globalPrompt) {
      setGlobalPrompt(draftPrompt);
    }
  }, [draftPrompt, globalPrompt, setGlobalPrompt]);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2.5 px-4 py-3 border-l-4 border-l-[#1E9A80] hover:bg-[#F9FAFB] transition-colors"
      >
        <div className="w-6 h-6 rounded-md bg-[#1E9A80]/10 flex items-center justify-center flex-shrink-0">
          <Brain className="w-3.5 h-3.5 text-[#1E9A80]" />
        </div>
        <span className="text-sm font-semibold text-[#1A1A1A] flex-1 text-left">
          Global Prompt
        </span>
        <span className="text-[10px] text-[#6B7280]">
          The brain of your automation
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#9CA3AF]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 space-y-4 border-t border-[#E5E7EB]">
          {/* System Prompt */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#6B7280]">
              System Prompt
            </Label>
            <Textarea
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              onBlur={handlePromptBlur}
              placeholder="You are a helpful property assistant..."
              rows={5}
              className="rounded-lg border-[#E5E7EB] resize-none text-sm"
            />
            <p className="text-[10px] text-[#9CA3AF] text-right">
              {draftPrompt.length} characters
            </p>
          </div>

          {/* Model + Temperature row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Model</Label>
              <Select value={globalModel} onValueChange={setGlobalModel}>
                <SelectTrigger className="rounded-lg border-[#E5E7EB] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-5.4-nano">GPT-5.4 Nano</SelectItem>
                  <SelectItem value="gpt-5.4-mini">GPT-5.4 Mini</SelectItem>
                  <SelectItem value="gpt-5.4">GPT-5.4</SelectItem>
                  <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                  <SelectItem value="gpt-5">GPT-5</SelectItem>
                  <SelectItem value="o4-mini">O4 Mini</SelectItem>
                  <SelectItem value="o3-mini">O3 Mini</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">
                Temperature: {globalTemperature.toFixed(1)}
              </Label>
              <Slider
                value={[globalTemperature]}
                onValueChange={([v]) => setGlobalTemperature(v)}
                min={0}
                max={1}
                step={0.1}
                className="py-2"
              />
            </div>
          </div>

          {/* Max Replies Per Lead */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#6B7280]">
              Max Replies Per Lead
            </Label>
            <Input
              type="number"
              value={maxRepliesPerLead}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setMaxRepliesPerLead(Math.max(1, val));
              }}
              min={1}
              className="rounded-lg border-[#E5E7EB] w-[120px]"
            />
            <p className="text-[10px] text-[#9CA3AF]">
              Automation will stop responding to a lead after this many replies
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
