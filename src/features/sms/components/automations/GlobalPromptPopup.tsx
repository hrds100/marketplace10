import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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

  return (
    <Dialog open={showGlobalPrompt} onOpenChange={(open) => !open && setShowGlobalPrompt(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#1A1A1A]">
            Global System Prompt
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B7280]">
            This prompt is the brain of your automation. One prompt handles all conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* System Prompt */}
          <div className="space-y-1.5">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="You are a helpful property assistant..."
              rows={8}
              className="rounded-lg border-[#E5E7EB] resize-none text-sm"
            />
            <p className="text-[10px] text-[#9CA3AF] text-right">
              {draft.length} characters
            </p>
          </div>

          {/* Model + Temperature */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Model</Label>
              <Select value={draftModel} onValueChange={setDraftModel}>
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
            </div>
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
              Automation will stop responding to a lead after this many replies
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setShowGlobalPrompt(false)}
            className="rounded-xl"
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
      </DialogContent>
    </Dialog>
  );
}
