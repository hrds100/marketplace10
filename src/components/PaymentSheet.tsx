import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2 } from 'lucide-react';
import { getFunnelUrl } from '@/lib/ghl';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUnlocked: () => void;
}

/**
 * Payment-only sheet. GHL iframe + tier polling.
 * Opens as a slide-in panel. On successful payment (tier flips to non-free),
 * calls onUnlocked() and closes itself.
 */
export default function PaymentSheet({ open, onOpenChange, onUnlocked }: Props) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setPaymentComplete(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setVisible(false);
    setTimeout(() => onOpenChange(false), 300);
  }, [onOpenChange]);

  const handlePaymentSuccess = useCallback(() => {
    if (paymentComplete) return;
    setPaymentComplete(true);

    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('tier')
          .eq('id', user!.id)
          .single();

        if (data?.tier && data.tier !== 'free') {
          if (pollRef.current) clearInterval(pollRef.current);
          setTimeout(() => {
            handleClose();
            onUnlocked();
          }, 1500);
          return;
        }
      } catch (e) {
        console.error('Tier poll error:', e);
      }

      if (attempts >= 20) {
        if (pollRef.current) clearInterval(pollRef.current);
        handleClose();
        onUnlocked(); // Assume success after 20s — tier webhook may be slow
      }
    }, 1000);
  }, [handleClose, user, paymentComplete, onUnlocked]);

  // postMessage listener for GHL iframe
  useEffect(() => {
    if (!open) return;
    const handleMessage = (e: MessageEvent) => {
      if (!e.origin.includes('pay.nfstay.com') && !e.origin.includes('leadconnectorhq.com')) return;
      const data = e.data;
      const isSuccess =
        data?.event === 'order_success' ||
        data?.type === 'order_success' ||
        data?.event === 'purchase' ||
        data?.page === 'thank-you' ||
        (typeof data === 'string' && data.includes('thank'));
      if (isSuccess) handlePaymentSuccess();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open, handlePaymentSuccess]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, handleClose]);

  // Cleanup
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (!open && !visible) return null;

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const url = (e.target as HTMLIFrameElement).contentWindow?.location?.href || '';
      if (url.includes('thank') || url.includes('Thank')) handlePaymentSuccess();
    } catch { /* cross-origin */ }
  };

  const funnelUrl = getFunnelUrl({
    email: user?.email,
    name: user?.user_metadata?.name,
    phone: user?.user_metadata?.whatsapp,
  });

  const sheet = (
    <>
      <div
        className={`fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden
      />
      <div
        className={`fixed inset-y-0 right-0 z-[301] w-full md:w-[40vw] max-w-[640px] bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {paymentComplete ? 'Payment Confirmed' : 'Unlock Messaging'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {paymentComplete ? 'Unlocking your inbox...' : 'Get full access to contact landlords directly'}
            </p>
          </div>
          {!paymentComplete && (
            <button onClick={handleClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {paymentComplete ? (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-foreground">You're in!</h3>
              <p className="text-sm text-muted-foreground">Messaging unlocked. You can now contact landlords directly.</p>
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mt-2" />
            </div>
          ) : !funnelUrl ? (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
              <p className="text-sm text-muted-foreground">Payment is being set up. Please try again shortly.</p>
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-hidden">
                <iframe
                  src={funnelUrl}
                  className="w-full h-full border-0"
                  style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%', height: '125%' }}
                  allow="payment *; camera; microphone; geolocation; clipboard-write"
                  title="Payment"
                  onLoad={handleIframeLoad}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(sheet, document.body);
}
