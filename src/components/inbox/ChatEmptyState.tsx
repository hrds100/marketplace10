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
  displayProfit?: number | null;
}

export default function ChatEmptyState({ thread, onOpenDetails, inputValue, onInputChange, onSend, onKeyDown, onOpenQuickReplies, inputRef, displayProfit }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fallbackImage = `https://picsum.photos/seed/${thread.id.slice(0, 8)}/160/160`;

  // Typewriter effect
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const phrase = PLACEHOLDERS[phraseIdx];
    if (charIdx < phrase.length) {
      const t = setTimeout(() => setCharIdx(c => c + 1), 40);
      return () => clearTimeout(t);
    }
    // Phrase complete — pause then advance
    const t = setTimeout(() => {
      setPhraseIdx(p => (p + 1) % PLACEHOLDERS.length);
      setCharIdx(0);
    }, 1200);
    return () => clearTimeout(t);
  }, [charIdx, phraseIdx]);

  // Blinking cursor
  useEffect(() => {
    const id = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(id);
  }, []);

  const typedText = PLACEHOLDERS[phraseIdx].slice(0, charIdx);
  const cursor = cursorVisible ? '▌' : ' ';

  const propertyLine = [
    thread.propertyBedrooms ? `${thread.propertyBedrooms}-bedroom` : null,
    thread.dealType || null,
    thread.propertyCity,
    thread.propertyPostcode ? `· ${thread.propertyPostcode}` : null,
  ].filter(Boolean).join(', ').replace(', ·', ' ·') || thread.propertyTitle;

  return (
    <div data-feature="CRM_INBOX" className="h-full flex flex-col items-center justify-center px-8 py-6 gap-4">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) toast.info(`Selected: ${f.name} — image upload coming soon`); e.target.value = ''; }} />

      {/* Property image with live dot */}
      <div className="relative">
        <div data-feature="CRM_INBOX__EMPTY_IMAGE" className="w-20 h-20 rounded-2xl bg-gray-100 shadow-sm" style={{ overflow: 'hidden', borderRadius: '1rem' }}>
          <div style={thread.propertyImageBlurred ? { filter: 'blur(8px)', transform: 'scale(1.1)', width: '100%', height: '100%' } : { width: '100%', height: '100%' }}>
            <img src={thread.propertyImage || fallbackImage} alt=""
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).src = fallbackImage; }} />
          </div>
          {thread.propertyImageBlurred && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <span className="text-white text-[8px] font-medium">On request</span>
            </div>
          )}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${thread.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
      </div>

      {/* Property row */}
      <button data-feature="CRM_INBOX__EMPTY_CTA" onClick={onOpenDetails}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors max-w-md">
        <span className="truncate">{propertyLine}</span>
        <ChevronRight className="w-3 h-3 shrink-0 text-gray-400" />
      </button>

      {/* Headline — earnings copy with real amount (live from estimator when right panel is open) */}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 text-center max-w-2xl leading-[1.05] tracking-tight">
        You could earn{' '}
        <span className="text-emerald-600">£{(displayProfit != null ? displayProfit : thread.propertyProfit || 0).toLocaleString()}</span>
        <br />
        hosting this property on Airbnb
      </h2>

      {/* Supporting copy */}
      <p className="text-base text-muted-foreground text-center max-w-sm">
        Message the landlord or agent and ask what matters first.
      </p>

      {/* Composer box */}
      <div className="w-full max-w-[900px] mt-3">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="px-4 pt-3 pb-2 relative">
            <textarea ref={inputRef} value={inputValue} onChange={e => onInputChange(e.target.value)} onKeyDown={onKeyDown}
              placeholder="" rows={2}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all leading-relaxed"
              style={{ minHeight: 76 }} />
            {/* Typewriter overlay — only when input is empty */}
            {!inputValue && (
              <div className="absolute inset-0 px-4 pt-3 pointer-events-none">
                <span className="text-sm text-muted-foreground leading-relaxed">{typedText}<span className="text-gray-300">{cursor}</span></span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Attach files" onClick={() => fileInputRef.current?.click()}>
                <Plus className="w-5 h-5 text-muted-foreground" />
              </button>
              <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors" onClick={onOpenQuickReplies} title="Quick replies & templates">
                <span className={`absolute inset-0 rounded-lg ring-2 ring-emerald-300 ${!inputValue ? 'animate-pulse' : ''}`} />
                <LayoutGrid className={`w-5 h-5 relative ${!inputValue ? 'text-emerald-500' : 'text-muted-foreground'}`} />
              </button>
            </div>
            <button onClick={onSend}
              className={`p-2 rounded-lg transition-colors ${inputValue.trim() ? 'bg-foreground text-background hover:opacity-90' : 'bg-foreground text-background opacity-40 cursor-not-allowed'}`}>
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
