import { useState, useRef, useEffect } from 'react';
import { Search, Settings, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import type { Thread } from './types';
import ThreadItem from './ThreadItem';

interface Props {
  threads: Thread[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenSettings: () => void;
  onArchive?: (id: string) => void;
  isCollapsed?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
}

export default function ThreadList({ threads, selectedId, onSelect, onOpenSettings, onArchive, isCollapsed, onExpand, onCollapse }: Props) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const handleCloseSearch = () => {
    setSearchOpen(false);
    setSearch('');
  };

  const filtered = threads.filter(t => {
    if (filter === 'unread' && !t.unread && !t.isSupport) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.propertyTitle.toLowerCase().includes(q) || t.contactName.toLowerCase().includes(q) || t.lastMessage.toLowerCase().includes(q);
    }
    return true;
  });

  const supportThreads = filtered.filter(t => t.isSupport);
  const regularThreads = filtered.filter(t => !t.isSupport);

  // Collapsed rail mode — narrow sidebar with expand button
  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col items-center bg-white border-r border-border py-4 w-14">
        <button data-feature="CRM_INBOX__THREAD_COLLAPSE" onClick={onExpand} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Expand messages">
          <PanelLeftOpen className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div data-feature="CRM_INBOX__THREAD_LIST" className="h-full flex flex-col bg-white border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        {searchOpen ? (
          <div className="flex items-center gap-2 w-full">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              data-feature="CRM_INBOX__THREAD_SEARCH"
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="flex-1 text-sm text-foreground placeholder:text-gray-400 bg-transparent focus:outline-none"
            />
            <button onClick={handleCloseSearch} className="text-sm text-gray-600 hover:text-gray-900 shrink-0">Cancel</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              {onCollapse && (
                <button data-feature="CRM_INBOX__THREAD_COLLAPSE" className="p-1.5 rounded-lg hover:bg-secondary transition-colors" onClick={onCollapse} title="Collapse">
                  <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <h2 className="text-lg font-bold text-foreground">Messages</h2>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors" onClick={() => setSearchOpen(true)}>
                <Search className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors" onClick={onOpenSettings}>
                <Settings className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 px-4 py-2">
        {(['all', 'unread'] as const).map(f => (
          <button
            data-feature="CRM_INBOX__THREAD_FILTER"
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${filter === f ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {supportThreads.length === 0 && regularThreads.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {search ? `No results for "${search}"` : 'No messages yet'}
          </div>
        ) : (
          <>
            {supportThreads.length > 0 && (
              <>
                <div data-feature="CRM_INBOX__SUPPORT" className="text-xs text-gray-400 uppercase tracking-wide px-4 py-1">Pinned</div>
                {supportThreads.map(thread => (
                  <ThreadItem key={thread.id} thread={thread} isSelected={selectedId === thread.id} onSelect={() => onSelect(thread.id)} searchQuery={search} onArchive={onArchive} />
                ))}
                <div className="border-b border-gray-100" />
              </>
            )}
            {regularThreads.map(thread => (
              <ThreadItem key={thread.id} thread={thread} isSelected={selectedId === thread.id} onSelect={() => onSelect(thread.id)} searchQuery={search} onArchive={onArchive} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
