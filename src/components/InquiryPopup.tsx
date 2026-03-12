import { useState } from 'react';
import { X, MessageCircle, CreditCard } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  propertyName: string;
  city: string;
}

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

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-[440px] overflow-hidden" onClick={e => e.stopPropagation()}>
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
            <div className="p-5 text-center">
              <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h4 className="text-xl font-bold text-foreground">Start your 3-day trial</h4>
              <p className="text-sm text-muted-foreground mt-2">Contact landlords directly, access all deals, CRM, University and more.</p>
              <div className="flex items-baseline justify-center gap-1 mt-4">
                <span className="text-3xl font-extrabold text-foreground">£4</span>
                <span className="text-sm text-muted-foreground">/ 3 days</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Then £97/month. Cancel any time.</p>
              <button
                onClick={() => { handleClose(); window.location.href = '/signup'; }}
                className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold mt-6 hover:opacity-90 transition-opacity"
              >
                Start 3-Day Trial — £4
              </button>
              <p className="text-xs text-muted-foreground mt-3">Secure payment · Cancel any time</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
