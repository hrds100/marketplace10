import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function MessagingSettingsModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[400px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Messaging Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          {['Manage quick replies', 'Suggested replies', 'Archived messages', 'Give feedback'].map(item => (
            <button key={item} className="w-full text-left px-4 py-3 rounded-xl hover:bg-secondary transition-colors text-sm text-foreground">
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
