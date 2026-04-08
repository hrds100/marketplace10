import { formatDistanceToNow } from 'date-fns';
import { Archive, Phone, Tag, Trash2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import PhoneNumber from '../shared/PhoneNumber';
import type { SmsConversation } from '../../types';

interface ConversationRowProps {
  conversation: SmsConversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ConversationRow({ conversation, isSelected, onSelect }: ConversationRowProps) {
  const { contact } = conversation;
  const hasName = !!contact.displayName;
  const isUnread = conversation.unreadCount > 0;
  const preview =
    conversation.lastMessagePreview.length > 40
      ? conversation.lastMessagePreview.slice(0, 40) + '...'
      : conversation.lastMessagePreview;

  const relativeTime = formatDistanceToNow(new Date(conversation.lastMessageAt), {
    addSuffix: true,
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={() => onSelect(conversation.id)}
          className={cn(
            'w-full flex items-start gap-3 px-3 py-3 text-left transition-colors',
            'hover:bg-black/[0.04]',
            isSelected && 'bg-[#1E9A80]/5 border-l-2 border-[#1E9A80]',
            !isSelected && 'border-l-2 border-transparent'
          )}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-full bg-[#F3F3EE] flex items-center justify-center text-sm font-medium text-[#1A1A1A]">
              {hasName ? getInitials(contact.displayName!) : <Phone className="h-4 w-4 text-[#9CA3AF]" />}
            </div>
            {isUnread && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#EF4444]" />
            )}
            {conversation.channel === 'whatsapp' && (
              <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#25D366] flex items-center justify-center text-white text-[8px] font-bold">
                W
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className={cn('text-sm truncate', isUnread ? 'font-semibold text-[#1A1A1A]' : 'font-medium text-[#1A1A1A]')}>
                {hasName ? contact.displayName : <PhoneNumber number={contact.phoneNumber} />}
              </span>
              <span className="text-xs text-[#9CA3AF] whitespace-nowrap shrink-0">{relativeTime}</span>
            </div>
            <p className={cn('text-xs mt-0.5 truncate', isUnread ? 'font-medium text-[#6B7280]' : 'text-[#9CA3AF]')}>
              {preview}
            </p>
          </div>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem>
          <Archive className="h-4 w-4 mr-2" /> Archive
        </ContextMenuItem>
        <ContextMenuItem>
          <Trash2 className="h-4 w-4 mr-2" /> Delete
        </ContextMenuItem>
        <ContextMenuItem>
          <Eye className="h-4 w-4 mr-2" /> Mark as Unread
        </ContextMenuItem>
        <ContextMenuItem>
          <Tag className="h-4 w-4 mr-2" /> Add Label
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
