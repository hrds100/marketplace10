import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { SmsTemplate } from '../../types';

interface TemplateFormProps {
  template: SmsTemplate | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; body: string; category: string | null }) => void;
}

const CATEGORIES = ['Greeting', 'Response', 'Scheduling', 'Nurture', 'Payment', 'Support'];
const VARIABLES = ['{name}', '{phone}'];

export default function TemplateForm({ template, open, onClose, onSave }: TemplateFormProps) {
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string>('none');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setBody(template.body);
      setCategory(template.category || 'none');
    } else {
      setName('');
      setBody('');
      setCategory('none');
    }
  }, [template, open]);

  function insertVariable(variable: string) {
    const el = textareaRef.current;
    if (!el) {
      setBody((prev) => prev + variable);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newBody = body.slice(0, start) + variable + body.slice(end);
    setBody(newBody);

    // Restore cursor position after variable
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + variable.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (!body.trim()) {
      toast.error('Template body is required');
      return;
    }

    onSave({
      name: name.trim(),
      body: body.trim(),
      category: category === 'none' ? null : category,
    });

    toast.success(template ? 'Template updated' : 'Template created');
    onClose();
  }

  const charCount = body.length;
  const segments = Math.max(1, Math.ceil(charCount / 160));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A]">
            {template ? 'Edit Template' : 'New Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#525252]">Name</Label>
            <Input
              placeholder="Welcome message"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-[10px] border-[#E5E5E5]"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#525252]">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="rounded-[10px] border-[#E5E5E5]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#525252]">Message body</Label>
            <Textarea
              ref={textareaRef}
              placeholder="Type your template message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="rounded-[10px] border-[#E5E5E5] resize-none"
            />

            {/* Variable buttons */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#9CA3AF]">Insert:</span>
              {VARIABLES.map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariable(v)}
                  className="h-6 px-2 text-xs rounded-md border-[#E5E7EB] text-[#6B7280] hover:text-[#1E9A80] hover:border-[#1E9A80]"
                >
                  {v}
                </Button>
              ))}
            </div>

            {/* Character count */}
            <p className="text-xs text-[#9CA3AF] text-right">
              {charCount} / 160 characters ({segments} segment{segments !== 1 ? 's' : ''})
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-lg border-[#E5E7EB]">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
          >
            {template ? 'Save Changes' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
