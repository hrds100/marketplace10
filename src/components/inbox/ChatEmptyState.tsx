import { ChevronRight } from 'lucide-react';
import type { Thread } from './types';

interface Props {
  thread: Thread;
  onOpenDetails: () => void;
}

export default function ChatEmptyState({ thread, onOpenDetails }: Props) {
  const fallbackImage = `https://picsum.photos/seed/${thread.id.slice(0, 8)}/120/120`;
  const propertyLine = [
    thread.propertyBedrooms ? `${thread.propertyBedrooms}-bedroom` : null,
    thread.dealType || null,
    thread.propertyCity,
    thread.propertyPostcode ? `· ${thread.propertyPostcode}` : null,
  ].filter(Boolean).join(', ').replace(', ·', ' ·') || thread.propertyTitle;

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-10 gap-5">
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

      {/* Property row — clickable, opens right panel */}
      <button
        onClick={onOpenDetails}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors max-w-sm"
      >
        <span className="truncate">{propertyLine}</span>
        <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-400" />
      </button>

      {/* Headline */}
      <h2 className="text-2xl font-semibold text-gray-900 text-center max-w-sm leading-snug">
        Inquire about this property below
      </h2>

      {/* Supporting copy */}
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        Message the landlord or agent and ask what matters first.
      </p>
    </div>
  );
}
