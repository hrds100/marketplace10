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
import {
  MessageSquare,
  Eye,
  Calendar,
  Bell,
  FileText,
  CreditCard,
  CheckCircle,
  Wrench,
  Key,
  Home,
  LogOut,
  Star,
  TrendingDown,
  RefreshCw,
  Users,
  DoorOpen,
  Shield,
  Lock,
  Clock,
  ShoppingBag,
  Sparkles,
  PenLine,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  WA_TEMPLATE_STARTERS,
  type WaTemplateStarter,
} from '../../data/waTemplateStarters';

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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Calendar,
  Bell,
  FileText,
  CreditCard,
  CheckCircle,
  Wrench,
  Key,
  MessageSquare,
  Home,
  LogOut,
  Star,
  TrendingDown,
  RefreshCw,
  Users,
  DoorOpen,
  Shield,
  Lock,
  Clock,
  ShoppingBag,
};

type StarterFilter = 'ALL' | 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';

const FILTER_PILLS: { value: StarterFilter; label: string; className: string }[] = [
  { value: 'ALL', label: 'All', className: 'bg-[#F3F3EE] text-[#1A1A1A]' },
  { value: 'UTILITY', label: 'Utility', className: 'bg-[#ECFDF5] text-[#1E9A80]' },
  { value: 'MARKETING', label: 'Marketing', className: 'bg-[#FEF3C7] text-[#F59E0B]' },
  { value: 'AUTHENTICATION', label: 'Auth', className: 'bg-[#F3F3EE] text-[#525252]' },
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
  const [showForm, setShowForm] = useState(false);
  const [starterFilter, setStarterFilter] = useState<StarterFilter>('ALL');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function sanitizeName(val: string) {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/__+/g, '_')
      .replace(/^_/, '');
  }

  function countVariables(text: string): number {
    const matches = text.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  }

  function selectStarter(starter: WaTemplateStarter) {
    setName(starter.name);
    setCategory(starter.category);
    setLanguage('en_US');
    setBodyText(starter.body);
    setVarCount(countVariables(starter.body));
    setShowForm(true);
  }

  function startFromScratch() {
    setName('');
    setCategory('UTILITY');
    setLanguage('en_US');
    setBodyText('');
    setVarCount(0);
    setShowForm(true);
  }

  function handleClose() {
    setShowForm(false);
    setStarterFilter('ALL');
    setName('');
    setCategory('UTILITY');
    setLanguage('en_US');
    setBodyText('');
    setVarCount(0);
    onClose();
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

    handleClose();
  }

  // Build preview text
  const previewText = bodyText.replace(/\{\{(\d+)\}\}/g, (_match, num) => {
    const placeholders = ['John', '2pm Tuesday', '123 High St', '10:00', '14:00', 'SW1A 1AA'];
    const idx = parseInt(num, 10) - 1;
    return placeholders[idx] || `[Param ${num}]`;
  });

  const filteredStarters =
    starterFilter === 'ALL'
      ? WA_TEMPLATE_STARTERS
      : WA_TEMPLATE_STARTERS.filter((s) => s.category === starterFilter);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className={showForm ? 'sm:max-w-lg' : 'sm:max-w-2xl'}>
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A] flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#25D366]" />
            {showForm ? 'New WhatsApp Template' : 'Choose a Starter Template'}
          </DialogTitle>
        </DialogHeader>

        {!showForm ? (
          /* ---- STARTER PICKER ---- */
          <div className="space-y-4 py-2">
            {/* Filter pills */}
            <div className="flex items-center gap-2">
              {FILTER_PILLS.map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => setStarterFilter(pill.value)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                    starterFilter === pill.value
                      ? `${pill.className} ring-1 ring-offset-1 ring-[#E5E7EB]`
                      : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F3F3EE]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Starter grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
              {filteredStarters.map((starter) => {
                const IconComp = ICON_MAP[starter.icon] || MessageSquare;
                return (
                  <button
                    key={starter.name}
                    onClick={() => selectStarter(starter)}
                    className="flex flex-col items-start gap-2 p-3 bg-white border border-[#E5E7EB] rounded-xl text-left hover:border-[#25D366] hover:shadow-[rgba(0,0,0,0.08)_0_4px_24px_-2px] transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-[#ECFDF5] flex items-center justify-center group-hover:bg-[#25D366]/10 transition-colors">
                        <IconComp className="h-3.5 w-3.5 text-[#1E9A80]" />
                      </div>
                      <span className="text-xs font-semibold text-[#1A1A1A] font-mono leading-tight">
                        {starter.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] leading-snug line-clamp-2">
                      {starter.description}
                    </p>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        starter.category === 'UTILITY'
                          ? 'bg-[#ECFDF5] text-[#1E9A80]'
                          : starter.category === 'MARKETING'
                            ? 'bg-[#FEF3C7] text-[#F59E0B]'
                            : 'bg-[#F3F3EE] text-[#525252]'
                      }`}
                    >
                      {starter.category}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Or start from scratch */}
            <button
              onClick={startFromScratch}
              className="flex items-center gap-2 text-sm text-[#1E9A80] hover:text-[#1E9A80]/80 font-medium transition-colors"
            >
              <PenLine className="h-4 w-4" />
              Or start from scratch
            </button>
          </div>
        ) : (
          /* ---- FORM ---- */
          <>
            <div className="space-y-4 py-2">
              {/* Back to starters link */}
              <button
                onClick={() => setShowForm(false)}
                className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#1E9A80] transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Pick a different starter
              </button>

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
                  onChange={(e) => {
                    setBodyText(e.target.value);
                    setVarCount(countVariables(e.target.value));
                  }}
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
                onClick={handleClose}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
