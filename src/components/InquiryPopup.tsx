import { useState } from 'react';
import { X, MessageCircle, Zap } from 'lucide-react';
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

  // ── FREE USER → GHL funnel (cart page) ──
  const handleGoToFunnel = () => {
    const url = getFunnelUrl({
      email: user?.email,
      name: user?.user_metadata?.name,
      phone: user?.user_metadata?.whatsapp,
    });
    if (url) {
      window.open(url, '_blank');
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-[480px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Unlock Deal Access</h3>
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            To contact landlords and access all deals, you need a membership. Start with our monthly plan:
          </p>

          <div className="rounded-xl border-2 border-primary p-5 relative">
            <span className="absolute -top-3 left-4 bg-primary text-primary-foreground text-[11px] font-bold px-2.5 py-0.5 rounded-full">START HERE</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-foreground">£67</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Full access to all deals, CRM, University & more</p>
            <button
              onClick={handleGoToFunnel}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm mt-4 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" /> Get Access — £67/mo
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center">Secure payment · Cancel any time</p>
        </div>
      </div>
    </div>
  );
}
