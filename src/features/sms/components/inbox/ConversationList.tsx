import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import ConversationRow from './ConversationRow';
import type { SmsConversation, SmsLabel } from '../../types';
import { useMemo, useState } from 'react';

interface ConversationListProps {
  conversations: SmsConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  labels: SmsLabel[];
  isLoading?: boolean;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  searchTerm,
  onSearchChange,
  labels,
  isLoading,
}: ConversationListProps) {
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('inbox');

  const filtered = useMemo(() => {
    let result = [...conversations];

    // Status filter
    if (statusFilter === 'inbox') {
      result = result.filter((c) => !c.isArchived);
    } else if (statusFilter === 'archived') {
      result = result.filter((c) => c.isArchived);
    }

    // Label filter
    if (labelFilter !== 'all') {
      result = result.filter((c) =>
        c.contact.labels.some((l) => l.id === labelFilter)
      );
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          (c.contact.displayName?.toLowerCase().includes(q) ?? false) ||
          c.contact.phoneNumber.includes(q)
      );
    }

    // Sort: unread first, then by lastMessageAt descending
    result.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    return result;
  }, [conversations, statusFilter, labelFilter, searchTerm]);

  return (
    <div className="flex flex-col h-full border-r border-[#E5E7EB]">
      {/* Search */}
      <div className="p-3 border-b border-[#E5E7EB]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm bg-[#F3F3EE] border-none focus-visible:ring-[#1E9A80]"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E5E7EB]">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 text-xs flex-1 border-[#E5E7EB]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inbox">Inbox</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>

        <Select value={labelFilter} onValueChange={setLabelFilter}>
          <SelectTrigger className="h-7 text-xs flex-1 border-[#E5E7EB]">
            <SelectValue placeholder="Label" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Labels</SelectItem>
            {labels.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: l.colour }}
                  />
                  {l.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-[#9CA3AF]">
            No conversations found
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationRow
              key={conv.id}
              conversation={conv}
              isSelected={conv.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
