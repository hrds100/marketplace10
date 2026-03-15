import { useState } from 'react';
import { Search, Settings } from 'lucide-react';
import type { Thread } from './types';
import ThreadItem from './ThreadItem';

interface Props {
  threads: Thread[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenSettings: () => void;
}

export default function ThreadList({ threads, selectedId, onSelect, onOpenSettings }: Props) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');

  const filtered = threads.filter(t => {
    if (filter === 'unread' && !t.unread && !t.isSupport) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.propertyTitle.toLowerCase().includes(q) || t.contactName.toLowerCase().includes(q);
    }
    return true;
  });

  const supportThreads = filtered.filter(t => t.isSupport);
  const regularThreads = filtered.filter(t => !t.isSupport);

  return (
    <div className="h-full flex flex-col bg-white border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">Messages</h2>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <Search className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="p-2 rounded-lg hover:bg-secondary transition-colors" onClick={onOpenSettings}>
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search messages..."
          className="w-full h-9 rounded-lg bg-secondary px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 px-4 pb-2">
        {(['all', 'unread'] as const).map(f => (
          <button
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
          <div className="text-center py-12 text-sm text-muted-foreground">No messages yet</div>
        ) : (
          <>
            {/* Pinned support thread */}
            {supportThreads.length > 0 && (
              <>
                <div className="text-xs text-gray-400 uppercase tracking-wide px-4 py-1">Pinned</div>
                {supportThreads.map(thread => (
                  <ThreadItem key={thread.id} thread={thread} isSelected={selectedId === thread.id} onSelect={() => onSelect(thread.id)} />
                ))}
                <div className="border-b border-gray-100" />
              </>
            )}

            {/* Regular threads */}
            {regularThreads.map(thread => (
              <ThreadItem key={thread.id} thread={thread} isSelected={selectedId === thread.id} onSelect={() => onSelect(thread.id)} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
