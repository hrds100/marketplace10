import { useState, useEffect } from 'react';
import { ChevronRight, Send, Plus, LayoutGrid } from 'lucide-react';
import type { Thread } from './types';

const PLACEHOLDERS = [
  'Ask the landlord about viewings…',
  'Ask the landlord about monthly rent…',
  'Ask the landlord about move-in dates…',
  'Ask the landlord about serviced accommodation terms…',
];

interface Props {
  thread: Thread;
  onOpenDetails: () => void;
  inputValue: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onOpenQuickReplies: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

export default function ChatEmptyState({ thread, onOpenDetails, inputValue, onInputChange, onSend, onKeyDown, onOpenQuickReplies, inputRef }: Props) {
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const fallbackImage = `https://picsum.photos/seed/${thread.id.slice(0, 8)}/160/160`;

  useEffect(() => {
    const id = setInterval(() => setPlaceholderIdx(p => (p + 1) % PLACEHOLDERS.length), 3500);
    return () => clearInterval(id);
  }, []);

  const propertyLine = [
    thread.propertyBedrooms ? `${thread.propertyBedrooms}-bedroom` : null,
    thread.dealType || null,
    thread.propertyCity,
    thread.propertyPostcode ? `· ${thread.propertyPostcode}` : null,
  ].filter(Boolean).join(', ').replace(', ·', ' ·') || thread.propertyTitle;

  return (
    <div className="h-full flex flex-col items-center justify-start px-6 pt-12 pb-6 gap-5">
      {/* Property image with live dot */}
      <div className="relative">
        <div className="w-24 h-24 rounded-2xl bg-gray-100 overflow-hidden shadow-sm">
          <img
            src={thread.propertyImage || fallbackImage}
            alt=""
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).src = fallbackImage; }}
          />
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
      </div>

      {/* Property row — clickable, opens right panel */}
      <button
        onClick={onOpenDetails}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-base text-foreground font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors max-w-lg shadow-sm"
      >
        <span className="truncate">{propertyLine}</span>
        <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" />
      </button>

      {/* Headline */}
      <h2 className="text-3xl font-bold text-gray-900 text-center max-w-md leading-tight tracking-tight">
        Inquire about this property below
      </h2>

      {/* Supporting copy */}
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Message the landlord or agent and ask what matters first.
      </p>

      {/* Large centered composer box */}
      <div className="w-full max-w-lg mt-2">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={PLACEHOLDERS[placeholderIdx]}
              rows={3}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all"
              style={{ minHeight: 72 }}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors"><Plus className="w-4 h-4 text-muted-foreground" /></button>
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors" onClick={onOpenQuickReplies}><LayoutGrid className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <button
              onClick={onSend}
              className={`p-2 rounded-lg transition-colors ${inputValue.trim() ? 'bg-foreground text-background hover:opacity-90' : 'bg-foreground text-background opacity-40 cursor-not-allowed'}`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
