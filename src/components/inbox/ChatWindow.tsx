import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ChevronRight, ChevronLeft, Plus, LayoutGrid, Send } from 'lucide-react';
import type { Thread, Message } from './types';
import MessageBubble from './MessageBubble';
import QuickRepliesModal from './QuickRepliesModal';

interface Props {
  thread: Thread;
  messages: Message[];
  onBack: () => void;
  onToggleDetails: () => void;
  showDetailsOpen: boolean;
  isMobile: boolean;
}

export default function ChatWindow({ thread, messages, onBack, onToggleDetails, showDetailsOpen, isMobile }: Props) {
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState(messages);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalMessages(messages); }, [messages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [localMessages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: `local-${Date.now()}`,
      threadId: thread.id,
      senderId: 'me',
      body: input.trim(),
      messageType: 'text',
      createdAt: new Date().toISOString(),
    };
    setLocalMessages(prev => [...prev, newMsg]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  let lastDate = '';
  for (const msg of localMessages) {
    const date = new Date(msg.createdAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    if (date !== lastDate) {
      grouped.push({ date, msgs: [msg] });
      lastDate = date;
    } else {
      grouped[grouped.length - 1].msgs.push(msg);
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        {isMobile && (
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary mr-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground truncate">
            {thread.isSupport ? 'NFsTay Support' : thread.contactName}
          </div>
          {!thread.isSupport && (
            <div className="text-[11px] text-muted-foreground">{thread.propertyTitle} · {thread.propertyCity}</div>
          )}
        </div>
        {!thread.isSupport && !isMobile && (
          <button onClick={onToggleDetails} className="p-1.5 rounded-lg hover:bg-secondary" title={showDetailsOpen ? 'Hide details' : 'Show details'}>
            {showDetailsOpen ? <ChevronRight className="w-5 h-5 text-muted-foreground" /> : <ChevronLeft className="w-5 h-5 text-muted-foreground" />}
          </button>
        )}
      </div>

      {/* Messages — fills remaining space */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {grouped.map(group => (
          <div key={group.date}>
            <div className="text-center py-3">
              <span className="text-[11px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{group.date}</span>
            </div>
            {group.msgs.map(msg => <MessageBubble key={msg.id} message={msg} />)}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input bar — pinned to bottom, zero gap */}
      <div className="relative border-t border-gray-200 bg-white px-4 py-3 flex items-end gap-2 shrink-0">
        <QuickRepliesModal open={showQuickReplies} onClose={() => setShowQuickReplies(false)} onSelect={text => setInput(text)} />

        <button className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0">
          <Plus className="w-5 h-5 text-muted-foreground" />
        </button>
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0" onClick={() => setShowQuickReplies(!showQuickReplies)}>
          <LayoutGrid className="w-5 h-5 text-muted-foreground" />
        </button>

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none py-2 max-h-[120px]"
          style={{ minHeight: 36 }}
        />

        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className={`p-2 rounded-lg transition-colors shrink-0 ${input.trim() ? 'bg-foreground text-background hover:opacity-90' : 'bg-foreground text-background opacity-40 cursor-not-allowed'}`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
