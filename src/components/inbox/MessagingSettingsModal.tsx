import { X, Zap, Sparkles, Archive, LifeBuoy } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ITEMS = [
  { label: 'Manage quick replies', icon: Zap },
  { label: 'Suggested replies', icon: Sparkles },
  { label: 'Archived messages', icon: Archive },
  { label: 'Contact nfstay Support', icon: LifeBuoy },
];

export default function MessagingSettingsModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div data-feature="CRM_INBOX" className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Messaging Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div>
          {ITEMS.map((item, i) => (
            <button
              key={item.label}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-sm text-foreground ${i < ITEMS.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
