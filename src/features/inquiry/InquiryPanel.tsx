import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle2 } from 'lucide-react';
import { useUserTier } from '@/hooks/useUserTier';
import { getFunnelUrl, isPaidTier } from '@/lib/ghl';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
  prime: boolean;
  daysAgo: number;
  image: string;
  landlordApproved: boolean;
  landlordWhatsapp?: string | null;
  slug?: string | null;
  investTarget?: number;
  investFundedPct?: number;
  investMinContribution?: number;
  investMonthlyProfit?: number;
  investReturns?: number;
  listing_type?: 'rental' | 'sale';
  bedrooms?: number | null;
  purchasePrice?: number | null;
  lister_type?: 'landlord' | 'agent' | 'deal_sourcer' | null;
}

interface Props {
  open: boolean;
  listing: ListingShape | null;
  onClose: () => void;
}

/**
 * GHL payment funnel state machine.
 *
 * cart          → iframe showing, user can close (X / Escape / backdrop)
 * locked        → user paid on cart, now on upsell/downsell — no X, user must complete funnel
 * complete      → thank-you postMessage received — success screen, then redirect
 * already-paid  → user opened panel after already having a paid tier
 */
type FunnelStage = 'cart' | 'locked' | 'complete' | 'already-paid';

export default function InquiryPanel({ open, listing, onClose }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { tier } = useUserTier();
  const [referredBy, setReferredBy] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    (supabase.from('profiles') as any).select('referred_by').eq('id', user.id).single()
      .then(({ data }: { data: { referred_by: string | null } | null }) => { if (data?.referred_by) setReferredBy(data.referred_by); });
  }, [user?.id]);

  const [visible, setVisible] = useState(false);
  const [funnelStage, setFunnelStage] = useState<FunnelStage>('cart');
  const iframeLoadCount = useRef(0);
  const funnelUrlRef = useRef<string>('');

  // ── Open: decide initial stage ONCE ──
  // tier is read here but NOT in deps — we only check at open time.
  // If the webhook flips tier mid-funnel, we ignore it (the state machine is in control).
  useEffect(() => {
    if (open && listing) {
      iframeLoadCount.current = 0;
      funnelUrlRef.current = getFunnelUrl({
        email: user?.email,
        name: user?.user_metadata?.name,
        phone: user?.user_metadata?.whatsapp,
        ref: referredBy || undefined,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setFunnelStage(isPaidTier(tier) ? 'already-paid' : 'cart');
      setVisible(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, listing?.id]);

  const canClose = funnelStage !== 'locked';

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  // ── Funnel complete: postMessage is the ONLY trigger ──
  const handleFunnelComplete = useCallback(() => {
    if (funnelStage === 'complete') return;
    setFunnelStage('complete');
    setTimeout(() => { window.location.href = '/dashboard/deals'; }, 5000);
  }, [funnelStage]);

  // ── postMessage listener — stays active as long as panel is open + funnel is running ──
  useEffect(() => {
    if (!open) return;
    if (funnelStage !== 'cart' && funnelStage !== 'locked') return;
    const handleMessage = (e: MessageEvent) => {
      if (!e.origin.includes('pay.nfstay.com') && !e.origin.includes('leadconnectorhq.com') && !e.origin.includes('gohighlevel.com')) return;
      const d = e.data;
      const isFunnelDone =
        d?.page === 'thank-you' ||
        (typeof d === 'string' && d.includes('thank'));
      if (isFunnelDone) handleFunnelComplete();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open, funnelStage, handleFunnelComplete]);

  // ── Escape key — only when closeable ──
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canClose) handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, handleClose, canClose]);

  if (!open && !visible) return null;
  if (!listing) return null;

  // ── Iframe onLoad: lock after 2nd load (1st = cart, 2nd = upsell) ──
  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const url = (e.target as HTMLIFrameElement).contentWindow?.location?.href || '';
      if (url.includes('thank') || url.includes('Thank')) handleFunnelComplete();
    } catch {
      // Cross-origin — can't read URL. Lock after iframe navigates past cart.
      if (iframeLoadCount.current >= 1 && funnelStage === 'cart') {
        setFunnelStage('locked');
      }
    }
    iframeLoadCount.current += 1;
  };

  const funnelUrl = funnelUrlRef.current;

  // ── Header text ──
  const headerTitle =
    funnelStage === 'complete' ? t('inquiry.paymentConfirmed') :
    funnelStage === 'already-paid' ? t('inquiry.fullAccess') :
    t('inquiry.getUnlimitedAccess');

  const headerSub =
    funnelStage === 'complete' ? t('inquiry.redirectingToDeals') :
    funnelStage === 'already-paid' ? `${listing.name} · ${listing.city}` :
    t('inquiry.buildingPortfolio');

  const panel = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={canClose ? handleClose : undefined}
        aria-hidden
      />

      {/* Panel — 52vw wide on desktop (30% wider than before) */}
      <div
        data-feature="DEALS__INQUIRY_PANEL"
        className={`fixed inset-y-0 right-0 z-[301] w-full md:w-[52vw] max-w-[832px] bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-foreground">{headerTitle}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{headerSub}</p>
          </div>
          {canClose && (
            <button
              data-feature="DEALS__INQUIRY_PANEL_CLOSE"
              onClick={handleClose}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {funnelStage === 'complete' ? (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-foreground">{t('inquiry.welcomeToNfstay')}</h3>
              <p className="text-sm text-muted-foreground">{t('inquiry.paymentConfirmedMessage')}</p>
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mt-2" />
            </div>

          ) : funnelStage === 'already-paid' ? (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center gap-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <h3 className="text-lg font-bold text-foreground">{t('inquiry.youreAllSet')}</h3>
              <p className="text-sm text-muted-foreground">{t('inquiry.canContactLandlords')}</p>
            </div>

          ) : !funnelUrl ? (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
              <p className="text-sm text-muted-foreground">Upgrade to access all deals and contact landlords directly.</p>
              <a href="/dashboard/settings" className="mt-4 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center hover:opacity-90 transition-opacity">
                View Plans
              </a>
            </div>

          ) : (
            /* GHL iframe — visible during cart + locked stages */
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
          )}
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
