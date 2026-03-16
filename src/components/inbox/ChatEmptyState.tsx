import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Send, Plus, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    <div className="h-full flex flex-col items-center justify-start px-8 pt-[18%] pb-6 gap-4">
      {/* Hidden file input for Plus button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) toast.info(`Selected: ${file.name} — image upload coming soon`);
          e.target.value = '';
        }}
      />

      {/* Property image with live dot */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden shadow-sm">
          <img
            src={thread.propertyImage || fallbackImage}
            alt=""
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).src = fallbackImage; }}
          />
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
      </div>

      {/* Property row — subtle metadata */}
      <button
        onClick={onOpenDetails}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors max-w-md"
      >
        <span className="truncate">{propertyLine}</span>
        <ChevronRight className="w-3 h-3 shrink-0 text-gray-400" />
      </button>

      {/* Headline — large and dominant */}
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 text-center max-w-2xl leading-[1.05] tracking-tight">
        Inquire about this property below
      </h2>

      {/* Supporting copy */}
      <p className="text-base text-muted-foreground text-center max-w-sm">
        Message the landlord or agent and ask what matters first.
      </p>

      {/* Composer box — wide, compact height (~130px total) */}
      <div className="w-full max-w-[900px] mt-3">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={PLACEHOLDERS[placeholderIdx]}
              rows={2}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all leading-relaxed"
              style={{ minHeight: 76 }}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Attach files" onClick={() => fileInputRef.current?.click()}>
                <Plus className="w-5 h-5 text-muted-foreground" />
              </button>
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors" onClick={onOpenQuickReplies} title="Quick replies & templates">
                <LayoutGrid className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <button
              onClick={onSend}
              className={`p-2 rounded-lg transition-colors ${inputValue.trim() ? 'bg-foreground text-background hover:opacity-90' : 'bg-foreground text-background opacity-40 cursor-not-allowed'}`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
