import { useState } from 'react';
import { X, MessageCircle, CreditCard, Crown, Zap } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  propertyName: string;
  city: string;
}

const SAMCART_URLS = {
  monthly: 'https://checkout.nfstay.com/monthly', // £47/mo
  lifetime: 'https://checkout.nfstay.com/lifetime', // £997 OTO
  yearly: 'https://checkout.nfstay.com/yearly', // £597/yr downsell
};

export default function InquiryPopup({ open, onClose, propertyName, city }: Props) {
  const [step, setStep] = useState<'whatsapp' | 'payment'>('whatsapp');
  const [message, setMessage] = useState(
    `Hey, I'm interested in the property "${propertyName}" in ${city}. Could you please share more details about availability and terms? Thanks!`
  );

  if (!open) return null;

  const handleSendWhatsApp = () => {
    setStep('payment');
  };

  const handleClose = () => {
    setStep('whatsapp');
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
              <button
                onClick={handleSendWhatsApp}
                className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold mt-4 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" /> Send message on WhatsApp
              </button>
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
              {/* Monthly — primary */}
              <div className="rounded-xl border-2 border-primary p-5 relative">
                <span className="absolute -top-3 left-4 bg-primary text-primary-foreground text-[11px] font-bold px-2.5 py-0.5 rounded-full">MOST POPULAR</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">£47</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Full access to all deals, CRM, University & more</p>
                <button
                  onClick={() => handleCheckout('monthly')}
                  className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm mt-4 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" /> Start Monthly — £47/mo
                </button>
              </div>

              {/* Lifetime — OTO */}
              <div className="rounded-xl border border-border p-5 bg-secondary/50">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-bold text-foreground">ONE-TIME OFFER</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-foreground">£997</span>
                  <span className="text-sm text-muted-foreground">lifetime access</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pay once, access forever. Best value.</p>
                <button
                  onClick={() => handleCheckout('lifetime')}
                  className="w-full h-10 rounded-lg border border-border font-semibold text-sm mt-3 hover:bg-secondary transition-colors text-foreground"
                >
                  Get Lifetime Access — £997
                </button>
              </div>

              {/* Yearly — downsell */}
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-foreground">£597</span>
                  <span className="text-sm text-muted-foreground">/ year</span>
                  <span className="ml-2 text-[11px] font-semibold text-primary bg-accent-light px-2 py-0.5 rounded-full">Save 5 months</span>
                </div>
                <button
                  onClick={() => handleCheckout('yearly')}
                  className="w-full h-10 rounded-lg border border-border font-medium text-sm mt-3 hover:bg-secondary transition-colors text-foreground"
                >
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
