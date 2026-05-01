import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { useDialerProModal } from './DialerProModalContext';
import { DialerProContent } from '@/features/dialer-pro/DialerProPage';

export default function DialerProModal() {
  const { isOpen, contactId, pipelineColumnId, closeDialerPro } = useDialerProModal();

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={closeDialerPro} />
      <div
        className="relative bg-[#F3F3EE] rounded-2xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.25)]"
        style={{ width: '85vw', height: '85vh' }}
      >
        <button
          onClick={closeDialerPro}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/80 hover:bg-white text-[#6B7280] hover:text-[#1A1A1A] shadow-sm transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <DialerProContent
          autoCallContactId={contactId}
          pipelineColumnId={pipelineColumnId}
          onAutoCallConsumed={() => {}}
        />
      </div>
    </div>,
    document.body,
  );
}
