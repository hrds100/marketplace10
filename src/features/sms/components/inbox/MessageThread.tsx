import { useEffect, useRef, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Bot, Check, Info, Loader2, MessageSquare, Pencil, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import PhoneNumber from '../shared/PhoneNumber';
import MessageBubble from './MessageBubble';
import type { SmsAutomation, SmsContact, SmsMessage } from '../../types';

interface MessageThreadProps {
  messages: SmsMessage[];
  contact: SmsContact | null;
  onOpenContactInfo: () => void;
  isLoading?: boolean;
  onUpdateName?: (contactId: string, newName: string) => Promise<void>;
  automationEnabled?: boolean;
  automationName?: string | null;
  automations?: SmsAutomation[];
  onToggleAutomation?: (automationId: string | null, enabled: boolean) => void;
  isTogglingAutomation?: boolean;
}

function groupByDate(messages: SmsMessage[]): Map<string, SmsMessage[]> {
  const groups = new Map<string, SmsMessage[]>();
  for (const msg of messages) {
    const date = new Date(msg.createdAt);
    let label: string;
    if (isToday(date)) {
      label = 'Today';
    } else if (isYesterday(date)) {
      label = 'Yesterday';
    } else {
      label = format(date, 'd MMMM');
    }
    const existing = groups.get(label) ?? [];
    existing.push(msg);
    groups.set(label, existing);
  }
  return groups;
}

export default function MessageThread({
  messages,
  contact,
  onOpenContactInfo,
  isLoading,
  onUpdateName,
  automationEnabled = false,
  automationName,
  automations = [],
  onToggleAutomation,
  isTogglingAutomation = false,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSaveName() {
    if (!contact || !onUpdateName) return;
    try {
      setSaving(true);
      await onUpdateName(contact.id, nameValue.trim());
      setEditingName(false);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#9CA3AF] gap-3">
        <MessageSquare className="h-12 w-12" />
        <p className="text-sm">Select a conversation to start messaging</p>
      </div>
    );
  }

  const grouped = groupByDate(messages);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] bg-white">
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="h-7 text-sm max-w-[200px]"
                placeholder="Contact name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleSaveName}
                disabled={saving}
              >
                <Check className="h-3.5 w-3.5 text-[#1E9A80]" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setEditingName(false)}
              >
                <X className="h-3.5 w-3.5 text-[#6B7280]" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-[#1A1A1A] truncate">
                {contact.displayName ?? <PhoneNumber number={contact.phoneNumber} />}
              </p>
              {onUpdateName && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => {
                    setNameValue(contact.displayName ?? '');
                    setEditingName(true);
                  }}
                >
                  <Pencil className="h-3 w-3 text-[#9CA3AF]" />
                </Button>
              )}
            </div>
          )}
          {contact.displayName && !editingName && (
            <PhoneNumber number={contact.phoneNumber} className="text-xs text-[#9CA3AF]" />
          )}
        </div>
        {/* Automation toggle */}
        {onToggleAutomation && (
          <div className="flex items-center gap-2 mr-2">
            {automationEnabled && automationName && (
              <span className="text-xs text-[#1E9A80] font-medium truncate max-w-[140px] hidden sm:inline">
                {automationName}
              </span>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Bot className={`h-4 w-4 ${automationEnabled ? 'text-[#1E9A80]' : 'text-[#9CA3AF]'}`} />
                    <Switch
                      checked={automationEnabled}
                      disabled={isTogglingAutomation}
                      onCheckedChange={(checked) => {
                        if (!checked) {
                          onToggleAutomation(null, false);
                        } else if (automations.length === 1) {
                          onToggleAutomation(automations[0].id, true);
                        }
                        // If multiple automations and toggling on, show picker (handled by state below)
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{automationEnabled ? 'AI automation active' : 'Enable AI automation'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {!automationEnabled && automations.length > 1 && (
              <Select
                onValueChange={(val) => onToggleAutomation(val, true)}
                disabled={isTogglingAutomation}
              >
                <SelectTrigger className="h-7 w-[140px] text-xs">
                  <SelectValue placeholder="Pick automation" />
                </SelectTrigger>
                <SelectContent>
                  {automations.filter((a) => a.isActive).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={onOpenContactInfo}>
          <Info className="h-4 w-4 text-[#6B7280]" />
        </Button>
      </div>

      {/* Messages */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
        </div>
      ) : (
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([dateLabel, msgs]) => (
            <div key={dateLabel}>
              <div className="flex items-center justify-center my-3">
                <span className="text-xs text-[#9CA3AF] bg-[#F3F3EE] px-3 py-1 rounded-full">
                  {dateLabel}
                </span>
              </div>
              <div className="space-y-2">
                {msgs.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </ScrollArea>
      )}
    </div>
  );
}
