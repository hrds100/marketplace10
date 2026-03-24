import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Sparkles, BookmarkCheck, Star, Archive, Home } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Thread } from './types';

interface Props {
  thread: Thread;
  isSelected: boolean;
  onSelect: () => void;
  searchQuery?: string;
  onArchive?: (id: string) => void;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-yellow-100 text-yellow-900 rounded-sm px-0.5">{part}</mark> : part
  );
}

export default function ThreadItem({ thread, isSelected, onSelect, searchQuery = '', onArchive }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  // Message preview with sender prefix
  const firstName = thread.contactName.split(' ')[0];
  const prefix = thread.isSupport ? '' : thread.lastMessageSenderIsOperator ? 'You: ' : `${firstName}: `;
  const preview = `${prefix}${thread.lastMessage}`.slice(0, 45) + (thread.lastMessage.length > 45 ? '…' : '');

  return (
    <div
      data-feature="CRM_INBOX__THREAD_LIST"
      className={`relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors group ${isSelected ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}
      onClick={onSelect}
    >
      {/* Avatar with online dot */}
      <div className="relative w-10 h-10 shrink-0">
        <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden">
          {thread.isSupport ? (
            <div className="w-full h-full bg-primary flex items-center justify-center"><Sparkles className="w-5 h-5 text-primary-foreground" /></div>
          ) : thread.propertyImage ? (
            <div className="relative w-full h-full">
              <img src={thread.propertyImage} alt=""
                className="w-full h-full object-cover"
                style={thread.propertyImageBlurred ? { filter: 'blur(6px)', transform: 'scale(1.1)' } : undefined} />
            </div>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center"><Home className="w-5 h-5 text-gray-400" /></div>
          )}
        </div>
        {!thread.isSupport && (
          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${thread.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground truncate">
            {thread.isSupport ? 'nfstay Support' : highlightMatch(thread.propertyTitle, searchQuery)}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0">{thread.lastMessageAt}</span>
        </div>
        {!thread.isSupport && (
          <div className="text-[11px] text-muted-foreground mt-0.5">{thread.contactName}</div>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          {thread.unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
          <p className="text-xs text-muted-foreground truncate">{highlightMatch(preview, searchQuery)}</p>
        </div>
      </div>

      {/* Context menu */}
      {!thread.isSupport && (
        <button className="absolute top-3 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
          onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }}>
          <MoreHorizontal className="w-4 h-4 text-gray-500" />
        </button>
      )}
      {showMenu && (
        <div ref={menuRef} className="absolute top-10 right-3 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 min-w-[180px]">
          <button className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 transition-colors"
            onClick={async e => {
              e.stopPropagation(); setShowMenu(false);
              if (thread.isSupport) return;
              const { error } = await supabase.from('chat_threads').update({ is_read: false }).eq('id', thread.id);
              if (error) toast.error('Failed to mark as unread');
              else toast.success('Marked as unread');
            }}>
            <BookmarkCheck className="w-[18px] h-[18px] text-gray-700" />
            <span className="text-sm text-gray-800">Mark as unread</span>
          </button>
          <button className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 transition-colors"
            onClick={async e => {
              e.stopPropagation(); setShowMenu(false);
              if (thread.isSupport) return;
              const { error } = await supabase.from('chat_threads').update({ starred: true }).eq('id', thread.id);
              if (error) toast.error('Failed to star');
              else toast.success('Starred');
            }}>
            <Star className="w-[18px] h-[18px] text-gray-700" />
            <span className="text-sm text-gray-800">Star</span>
          </button>
          <button className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 transition-colors"
            onClick={e => {
              e.stopPropagation(); setShowMenu(false);
              onArchive?.(thread.id);
            }}>
            <Archive className="w-[18px] h-[18px] text-gray-700" />
            <span className="text-sm text-gray-800">Archive</span>
          </button>
        </div>
      )}
    </div>
  );
}
