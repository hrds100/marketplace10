import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, CheckCircle2 } from 'lucide-react';
import { useUserTier } from '@/hooks/useUserTier';
import { getFunnelUrl, isPaidTier } from '@/lib/ghl';
import { useAuth } from '@/hooks/useAuth';

export interface ListingShape {
  id: string;
  name: string;
  city: string;
  postcode: string;
  rent: number;
  profit: number;
  type: string;
  status: 'live' | 'on-offer' | 'inactive';
  featured: boolean;
  daysAgo: number;
  image: string;
  landlordApproved: boolean;
  landlordWhatsapp?: string | null;
}

interface Props {
  open: boolean;
  listing: ListingShape | null;
  onClose: () => void;
}

export default function InquiryPanel({ open, listing, onClose }: Props) {
  const { user } = useAuth();
  const { tier, refetch: refreshTier } = useUserTier();
  const paid = isPaidTier(tier);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentComplete, setPaymentComplete] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open && listing) {
      setVisible(true);
      setPaymentComplete(false);
      setMessage(
        `Hi, interested in ${listing.name} ref #${listing.id}. Could you share more details about availability and terms? Thanks!`
      );
    }
  }, [open, listing?.id]);

  const handleClose = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setVisible(false);
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  // Post-payment success handler
  const handlePaymentSuccess = useCallback(() => {
    if (paymentComplete) return; // prevent double-fire
    setPaymentComplete(true);

    // Poll for tier update (GHL webhook → n8n → Supabase may take a few seconds)
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      await refreshTier();
      if (attempts >= 10) {
        if (pollRef.current) clearInterval(pollRef.current);
        handleClose();
        window.location.href = '/dashboard/inbox';
      }
    }, 1000);

    // Hard redirect after 10s regardless
    setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      handleClose();
      window.location.href = '/dashboard/inbox';
    }, 10000);
  }, [handleClose, refreshTier, paymentComplete]);

  // Listen for postMessage from GHL iframe (payment success signal)
  useEffect(() => {
    if (!open || paid) return;
    const handleMessage = (e: MessageEvent) => {
      // Allow messages from pay.nfstay.com and GHL domains
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
  }, [open, paid, handlePaymentSuccess]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, handleClose]);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (!open && !visible) return null;
  if (!listing) return null;

  const handleSendWhatsApp = () => {
    if (listing.landlordWhatsapp) {
      const cleanNumber = listing.landlordWhatsapp.replace(/[^0-9]/g, '');
      const encodedMsg = encodeURIComponent(message);
      window.open(`https://wa.me/${cleanNumber}?text=${encodedMsg}`, '_blank');
      handleClose();
    }
  };

  // Iframe onLoad fallback — detect thank-you page URL
  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const iframeUrl = (e.target as HTMLIFrameElement).contentWindow?.location?.href || '';
      if (iframeUrl.includes('thank') || iframeUrl.includes('Thank')) {
        handlePaymentSuccess();
      }
    } catch {
      // Cross-origin — can't read URL, postMessage will handle it
    }
  };

  const funnelUrl = getFunnelUrl({
    email: user?.email,
    name: user?.user_metadata?.name,
    phone: user?.user_metadata?.whatsapp,
  });

  const panel = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-[301] w-full md:w-[40vw] max-w-[640px] bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {paymentComplete ? 'Payment Confirmed' : paid ? 'Contact Landlord' : 'Get Unlimited Access to All Deals'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {paymentComplete ? 'Redirecting to your inbox...' : paid ? `${listing.name} · ${listing.city}` : "Building your Airbnb portfolio couldn't be easier"}
            </p>
          </div>
          {!paymentComplete && (
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {paymentComplete ? (
            /* ── SUCCESS SCREEN ── */
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Welcome to NFsTay!</h3>
              <p className="text-sm text-muted-foreground">Payment confirmed. Taking you to your inbox...</p>
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mt-2" />
            </div>
          ) : paid ? (
            /* ── PAID USER → WhatsApp ── */
            <div className="p-6">
              <label className="text-xs font-semibold text-foreground block mb-2">Your message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              {listing.landlordWhatsapp ? (
                <button
                  onClick={handleSendWhatsApp}
                  className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold mt-4 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" /> Send on WhatsApp
                </button>
              ) : (
                <div className="mt-4 p-4 rounded-lg bg-secondary/50 text-center">
                  <p className="text-sm text-muted-foreground">
                    Landlord WhatsApp not yet available for this property. We'll notify you when it's ready.
                  </p>
                </div>
              )}
            </div>
          ) : !funnelUrl ? (
            /* ── FREE USER, NO FUNNEL URL → fallback ── */
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
              <p className="text-sm text-muted-foreground">Upgrade to access all deals and contact landlords directly.</p>
              <a href="/dashboard/settings" className="mt-4 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center hover:opacity-90 transition-opacity">
                View Plans
              </a>
            </div>
          ) : (
            /* ── FREE USER → GHL funnel iframe ── */
            /* GHL payment forms require full DOM access for Stripe fingerprinting.
               Do NOT add sandbox attribute — it breaks GHL's payment JS.
               Domain: pay.nfstay.com (GHL custom domain, whitelisted for payments) */
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-hidden">
                <iframe
                  src={funnelUrl}
                  className="w-full h-full border-0"
                  style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%', height: '125%' }}
                  allow="payment *; camera; microphone; geolocation; clipboard-write"
                  title="Checkout"
                  onLoad={handleIframeLoad}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
