import { X } from 'lucide-react';
import { DUMMY_QUICK_REPLIES } from './dummyData';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (text: string) => void;
}

export default function QuickRepliesModal({ open, onClose, onSelect }: Props) {
  if (!open) return null;

  return (
    <div className="absolute bottom-16 left-4 right-4 z-30 bg-card border border-border rounded-2xl shadow-xl max-h-[300px] overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">Quick Replies</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4 text-muted-foreground" /></button>
      </div>
      <div className="p-2 space-y-1">
        {DUMMY_QUICK_REPLIES.map(qr => (
          <button
            key={qr.id}
            onClick={() => { onSelect(qr.body); onClose(); }}
            className="w-full text-left p-3 rounded-xl hover:bg-secondary transition-colors"
          >
            <div className="text-xs font-semibold text-foreground">{qr.title}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{qr.body}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
