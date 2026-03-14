import { useState } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { useUserTier } from '@/hooks/useUserTier';
import { getFunnelUrl, isPaidTier } from '@/lib/ghl';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  open: boolean;
  onClose: () => void;
  propertyName: string;
  city: string;
  propertyId?: string;
  landlordWhatsapp?: string;
}

export default function InquiryPopup({ open, onClose, propertyName, city, propertyId, landlordWhatsapp }: Props) {
  const { user } = useAuth();
  const { tier } = useUserTier();
  const paid = isPaidTier(tier);

  const [message, setMessage] = useState(
    `Hi, interested in ${propertyName} ref #${propertyId || 'N/A'}. Could you share more details about availability and terms? Thanks!`
  );

  if (!open) return null;

  const handleClose = () => onClose();

  // ── PAID USER → straight to WhatsApp ──
  if (paid) {
    const handleSendWhatsApp = () => {
      if (landlordWhatsapp) {
        const cleanNumber = landlordWhatsapp.replace(/[^0-9]/g, '');
        const encodedMsg = encodeURIComponent(message);
        window.open(`https://wa.me/${cleanNumber}?text=${encodedMsg}`, '_blank');
        handleClose();
      }
    };

    return (
      <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4" onClick={handleClose}>
        <div className="bg-card rounded-2xl border border-border w-full max-w-[480px] overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Contact Landlord</h3>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-5">
            <label className="text-xs font-semibold text-foreground block mb-2">Your message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />

            {landlordWhatsapp ? (
              <button
                onClick={handleSendWhatsApp}
                className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold mt-4 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" /> Send on WhatsApp
              </button>
            ) : (
              <div className="mt-4 p-4 rounded-lg bg-secondary/50 text-center">
                <p className="text-sm text-muted-foreground">Landlord WhatsApp not yet available for this property. We'll notify you when it's ready.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── FREE USER → GHL cart in slide-in drawer ──
  const funnelUrl = getFunnelUrl({
    email: user?.email,
    name: user?.user_metadata?.name,
    phone: user?.user_metadata?.whatsapp,
  });

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200] bg-black/60 transition-opacity" onClick={handleClose} />

      {/* Modal covering right half of page */}
      <div className="fixed inset-y-0 right-0 z-[201] w-full md:w-1/2 bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-lg font-bold text-foreground">Get Deal Access</h3>
          <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GHL checkout iframe */}
        {funnelUrl ? (
          <iframe
            src={funnelUrl}
            className="flex-1 w-full border-0"
            title="Checkout"
            allow="payment"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground text-center">Checkout is being configured. Please try again shortly.</p>
          </div>
        )}
      </div>
    </>
  );
}
