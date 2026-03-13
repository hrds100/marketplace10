import { useState } from 'react';
import { X, MessageCircle, CreditCard, Crown, Zap } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  propertyName: string;
  city: string;
  propertyId?: string;
  landlordWhatsapp?: string;
}

const SAMCART_URLS = {
  monthly: 'https://checkout.nfstay.com/monthly',
  lifetime: 'https://checkout.nfstay.com/lifetime',
  yearly: 'https://checkout.nfstay.com/yearly',
};

export default function InquiryPopup({ open, onClose, propertyName, city, propertyId, landlordWhatsapp }: Props) {
  const [step, setStep] = useState<'whatsapp' | 'payment'>('whatsapp');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [message, setMessage] = useState(
    `Hi, interested in ${propertyName} ref #${propertyId || 'N/A'}. Could you share more details about availability and terms? Thanks!`
  );

  if (!open) return null;

  const handleSendWhatsApp = () => {
    if (!agreedTerms) return;
    if (landlordWhatsapp) {
      const cleanNumber = landlordWhatsapp.replace(/[^0-9]/g, '');
      const encodedMsg = encodeURIComponent(message);
      window.open(`https://wa.me/${cleanNumber}?text=${encodedMsg}`, '_blank');
      handleClose();
    } else {
      setStep('payment');
    }
  };

  const handleClose = () => {
    setStep('whatsapp');
    setAgreedTerms(false);
    onClose();
  };

  const handleCheckout = (tier: keyof typeof SAMCART_URLS) => {
    window.open(SAMCART_URLS[tier], '_blank');
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-[480px] overflow-hidden" onClick={e => e.stopPropagation()}>
        {step === 'whatsapp' ? (
          <>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Contact via WhatsApp</h3>
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

              {/* Agent terms */}
              <label className="flex items-start gap-2.5 mt-4 cursor-pointer rounded-lg border border-border p-3 hover:bg-secondary/50 transition-colors">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={e => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary flex-shrink-0"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  I agree to the <strong className="text-foreground">Agent Terms</strong>: a £250 referral fee is payable to NFsTay if this deal closes within 12 months of the introduction.
                </span>
              </label>

              <button
                onClick={handleSendWhatsApp}
                disabled={!agreedTerms}
                className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold mt-4 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <MessageCircle className="w-4 h-4" /> Send message on WhatsApp
              </button>
              {!agreedTerms && <p className="text-[11px] text-muted-foreground text-center mt-2">Please accept the Agent Terms to continue</p>}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Unlock full access</h3>
              </div>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl border-2 border-primary p-5 relative">
                <span className="absolute -top-3 left-4 bg-primary text-primary-foreground text-[11px] font-bold px-2.5 py-0.5 rounded-full">MOST POPULAR</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">£47</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Full access to all deals, CRM, University & more</p>
                <button onClick={() => handleCheckout('monthly')} className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm mt-4 hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" /> Start Monthly — £47/mo
                </button>
              </div>

              <div className="rounded-xl border border-border p-5 bg-secondary/50">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-bold text-foreground">ONE-TIME OFFER</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-foreground">£997</span>
                  <span className="text-sm text-muted-foreground">lifetime access</span>
                </div>
                <button onClick={() => handleCheckout('lifetime')} className="w-full h-10 rounded-lg border border-border font-semibold text-sm mt-3 hover:bg-secondary transition-colors text-foreground">
                  Get Lifetime Access — £997
                </button>
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-foreground">£597</span>
                  <span className="text-sm text-muted-foreground">/ year</span>
                  <span className="ml-2 text-[11px] font-semibold text-primary bg-accent-light px-2 py-0.5 rounded-full">Save 5 months</span>
                </div>
                <button onClick={() => handleCheckout('yearly')} className="w-full h-10 rounded-lg border border-border font-medium text-sm mt-3 hover:bg-secondary transition-colors text-foreground">
                  Go Yearly — £597/yr
                </button>
              </div>

              <p className="text-xs text-muted-foreground text-center">Secure payment via SamCart · Cancel any time</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
