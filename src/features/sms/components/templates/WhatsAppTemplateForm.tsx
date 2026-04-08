import { useState, useRef } from 'react';
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
import { MessageSquare, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppTemplateFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    category: string;
    language: string;
    components: unknown[];
  }) => void;
}

const CATEGORIES = [
  { value: 'UTILITY', label: 'Utility' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'AUTHENTICATION', label: 'Authentication' },
];

const LANGUAGES = [
  { value: 'en_US', label: 'English (US)' },
  { value: 'en_GB', label: 'English (UK)' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt_BR', label: 'Portuguese (BR)' },
  { value: 'fr', label: 'French' },
  { value: 'ar', label: 'Arabic' },
  { value: 'it', label: 'Italian' },
];

export default function WhatsAppTemplateForm({
  open,
  onClose,
  onSave,
}: WhatsAppTemplateFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('UTILITY');
  const [language, setLanguage] = useState('en_US');
  const [bodyText, setBodyText] = useState('');
  const [varCount, setVarCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function sanitizeName(val: string) {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/__+/g, '_')
      .replace(/^_/, '');
  }

  function insertVariable() {
    const next = varCount + 1;
    const variable = `{{${next}}}`;
    setVarCount(next);

    const el = textareaRef.current;
    if (!el) {
      setBodyText((prev) => prev + variable);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newBody = bodyText.slice(0, start) + variable + bodyText.slice(end);
    setBodyText(newBody);

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
    if (!bodyText.trim()) {
      toast.error('Message body is required');
      return;
    }
    if (bodyText.length > 1024) {
      toast.error('Message body cannot exceed 1024 characters');
      return;
    }

    onSave({
      name: name.trim(),
      category,
      language,
      components: [{ type: 'BODY', text: bodyText.trim() }],
    });

    // Reset form
    setName('');
    setCategory('UTILITY');
    setLanguage('en_US');
    setBodyText('');
    setVarCount(0);
    onClose();
  }

  // Build preview text — replace {{1}}, {{2}} etc with placeholder values
  const previewText = bodyText.replace(/\{\{(\d+)\}\}/g, (_match, num) => {
    const placeholders = ['John', '2pm Tuesday', '123 High St'];
    const idx = parseInt(num, 10) - 1;
    return placeholders[idx] || `[Param ${num}]`;
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A] flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#25D366]" />
            New WhatsApp Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#525252]">
              Template Name
            </Label>
            <Input
              placeholder="booking_confirmation"
              value={name}
              onChange={(e) => setName(sanitizeName(e.target.value))}
              className="rounded-[10px] border-[#E5E5E5] font-mono text-sm"
            />
            <p className="text-xs text-[#9CA3AF]">
              Lowercase letters, numbers, and underscores only
            </p>
          </div>

          {/* Category + Language row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#525252]">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-[10px] border-[#E5E5E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#525252]">
                Language
              </Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="rounded-[10px] border-[#E5E5E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[#525252]">
              Message Body
            </Label>
            <Textarea
              ref={textareaRef}
              placeholder="Hi {{1}}, your viewing is confirmed for {{2}}. Thank you!"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={5}
              className="rounded-[10px] border-[#E5E5E5] resize-none"
            />

            {/* Variable button + char count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#9CA3AF]">Insert:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={insertVariable}
                  className="h-6 px-2 text-xs rounded-md border-[#E5E7EB] text-[#6B7280] hover:text-[#25D366] hover:border-[#25D366]"
                >
                  {`{{${varCount + 1}}}`}
                </Button>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                {bodyText.length} / 1024
              </p>
            </div>
          </div>

          {/* Preview */}
          {bodyText.trim() && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[#525252] flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </Label>
              <div className="bg-[#ECFDF5] rounded-xl p-3 text-sm text-[#1A1A1A] leading-relaxed">
                {previewText}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-lg border-[#E5E7EB]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="rounded-lg bg-[#25D366] hover:bg-[#25D366]/90 text-white"
          >
            Submit for Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
