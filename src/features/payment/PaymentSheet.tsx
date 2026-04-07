import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getFunnelUrl } from '@/lib/ghl';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUnlocked: () => void;
}

export default function PaymentSheet({ open, onOpenChange, onUnlocked }: Props) {
  const { user } = useAuth();
  const [referredBy, setReferredBy] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    (supabase.from('profiles') as any).select('referred_by').eq('id', user.id).single()
      .then(({ data }: { data: { referred_by: string | null } | null }) => { if (data?.referred_by) setReferredBy(data.referred_by); });
  }, [user?.id]);
  const [visible, setVisible] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [funnelLocked, setFunnelLocked] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeTimedOut, setIframeTimedOut] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iframeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeLoadCount = useRef(0);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setPaymentComplete(false);
      setFunnelLocked(false);
      setIframeLoaded(false);
      setIframeTimedOut(false);
      setPollTimedOut(false);
      iframeLoadCount.current = 0;
      // 8s iframe load timeout
      iframeTimerRef.current = setTimeout(() => {
        setIframeTimedOut(true);
      }, 8000);
    }
    return () => { if (iframeTimerRef.current) clearTimeout(iframeTimerRef.current); };
  }, [open]);

  const handleClose = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setVisible(false);
    setTimeout(() => onOpenChange(false), 300);
  }, [onOpenChange]);

  const handlePaymentSuccess = useCallback(() => {
    if (paymentComplete) return;
    setPaymentComplete(true);
    setPollTimedOut(false);

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
          // Redirect straight to deals — do NOT re-trigger inquiry/WhatsApp
          setTimeout(() => {
            window.location.href = '/dashboard/deals';
          }, 1500);
          return;
        }
      } catch (e) {
        console.error('Tier poll error:', e);
      }

      // After 20 attempts (20s): show error, do NOT auto-unlock
      if (attempts >= 20) {
        if (pollRef.current) clearInterval(pollRef.current);
        setPollTimedOut(true);
      }
    }, 1000);
  }, [handleClose, user, paymentComplete, onUnlocked]);

  // Fallback poll: DISABLED during funnel flow to avoid interrupting upsell/downsell.
  // Only triggers when iframe navigates to thank-you page (detected via onLoad or postMessage).
  // The "I've already paid" button below is the manual fallback if detection fails.

  // postMessage listener
  useEffect(() => {
    if (!open) return;
    const handleMessage = (e: MessageEvent) => {
      if (!e.origin.includes('pay.nfstay.com') && !e.origin.includes('leadconnectorhq.com') && !e.origin.includes('gohighlevel.com')) return;
      const data = e.data;
      // Only treat thank-you page as funnel complete.
      // order_success / purchase fire on the FIRST cart payment — before upsell/downsell.
      const isFunnelComplete =
        data?.page === 'thank-you' ||
        (typeof data === 'string' && data.includes('thank'));
      if (isFunnelComplete) handlePaymentSuccess();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open, handlePaymentSuccess]);

  // Escape key — allowed before payment, blocked during upsell/downsell funnel
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !funnelLocked) handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, handleClose, funnelLocked]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (!open && !visible) return null;

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    setIframeLoaded(true);
    setIframeTimedOut(false);
    if (iframeTimerRef.current) clearTimeout(iframeTimerRef.current);
    try {
      const url = (e.target as HTMLIFrameElement).contentWindow?.location?.href || '';
      if (url.includes('thank') || url.includes('Thank')) handlePaymentSuccess();
    } catch {
      // Cross-origin — can't read iframe URL.
      // Do NOT poll tier here. Tier changes after first payment but funnel isn't done.
      // Lock the modal after the iframe navigates past the cart page (2nd load = paid).
      if (iframeLoadCount.current >= 1) {
        setFunnelLocked(true);
      }
    }
    iframeLoadCount.current += 1;
  };

  const funnelUrl = getFunnelUrl({
    email: user?.email,
    name: user?.user_metadata?.name,
    phone: user?.user_metadata?.whatsapp,
    ref: referredBy || undefined,
  });

  const sheet = (
    <>
      {/* Backdrop — clickable before payment, locked during upsell/downsell funnel */}
      <div
        className={`fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={funnelLocked ? undefined : handleClose}
        aria-hidden
      />
      <div
        data-feature="PAYMENTS"
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
          {/* X button: visible before payment, hidden during upsell/downsell funnel */}
          {!funnelLocked && (
            <button onClick={handleClose} data-feature="PAYMENTS__CLOSE" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {paymentComplete ? (
            <div data-feature="PAYMENTS__SUCCESS" className="flex flex-col items-center justify-center flex-1 p-8 text-center gap-4">
              {pollTimedOut ? (
                <>
                  <h3 className="text-lg font-bold text-foreground">Almost there</h3>
                  <p className="text-sm text-muted-foreground">Your payment is being processed.</p>
                  <p className="mt-4 text-xs text-red-600">We couldn't confirm your payment yet. Please refresh or contact support.</p>
                  <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
                    Refresh Page
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">You're in!</h3>
                  <p className="text-sm text-muted-foreground">Messaging unlocked. You can now contact landlords directly.</p>
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mt-2" />
                </>
              )}
            </div>
          ) : !funnelUrl ? (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center gap-3">
              <p className="text-sm text-muted-foreground">Checkout is not configured.</p>
              <p className="text-xs text-muted-foreground">Please set VITE_GHL_FUNNEL_URL in Vercel.</p>
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden relative">
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    <p className="text-sm text-muted-foreground">Preparing secure checkout…</p>
                    {iframeTimedOut && (
                      <button
                        onClick={() => window.open(funnelUrl, '_blank')}
                        className="mt-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
                      >
                        Open checkout in new tab
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-hidden">
                <iframe
                  src={funnelUrl}
                  data-feature="PAYMENTS__GHL_IFRAME"
                  className="w-full h-full border-0"
                  style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%', height: '125%' }}
                  allow="payment *; camera; microphone; geolocation; clipboard-write"
                  title="Payment"
                  onLoad={handleIframeLoad}
                />
              </div>
              {/* No manual escape — user must complete the funnel */}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(sheet, document.body);
}
