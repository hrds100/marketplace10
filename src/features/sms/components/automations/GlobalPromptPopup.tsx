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
import { toast } from 'sonner';
import { useFlowContext } from './FlowContext';

export function GlobalPromptPopup() {
  const { showGlobalPrompt, setShowGlobalPrompt, globalPrompt, setGlobalPrompt } = useFlowContext();
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (showGlobalPrompt) {
      setDraft(globalPrompt);
    }
  }, [showGlobalPrompt, globalPrompt]);

  const handleSave = useCallback(() => {
    setGlobalPrompt(draft);
    toast.success('Global prompt updated');
    setShowGlobalPrompt(false);
  }, [draft, setGlobalPrompt, setShowGlobalPrompt]);

  return (
    <Dialog open={showGlobalPrompt} onOpenChange={(open) => !open && setShowGlobalPrompt(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#1A1A1A]">
            Global System Prompt
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B7280]">
            This prompt applies to all AI response nodes in this flow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
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
