import { useEffect, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Info, Loader2, MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import PhoneNumber from '../shared/PhoneNumber';
import MessageBubble from './MessageBubble';
import type { SmsContact, SmsMessage } from '../../types';

interface MessageThreadProps {
  messages: SmsMessage[];
  contact: SmsContact | null;
  onOpenContactInfo: () => void;
  isLoading?: boolean;
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

export default function MessageThread({ messages, contact, onOpenContactInfo, isLoading }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

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
        <div>
          <p className="text-sm font-semibold text-[#1A1A1A]">
            {contact.displayName ?? <PhoneNumber number={contact.phoneNumber} />}
          </p>
          {contact.displayName && (
            <PhoneNumber number={contact.phoneNumber} className="text-xs text-[#9CA3AF]" />
          )}
        </div>
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
