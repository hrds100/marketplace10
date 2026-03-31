import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
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
  // Investment data (only present on JV/prime cards)
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

export default function InquiryPanel({ open, listing, onClose }: Props) {
  const { user } = useAuth();
  const { tier, refetch: refreshTier } = useUserTier();
  const [referredBy, setReferredBy] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    (supabase.from('profiles') as any).select('referred_by').eq('id', user.id).single()
      .then(({ data }: { data: { referred_by: string | null } | null }) => { if (data?.referred_by) setReferredBy(data.referred_by); });
  }, [user?.id]);
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
        `Hi, interested in ${listing.name} ref #${listing.id.slice(0, 5).toUpperCase()}. Could you share more details about availability and terms? Thanks!`
      );
    }
  }, [open, listing?.id]);

  const handleClose = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setVisible(false);
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  // Post-payment success handler — polls DB directly for tier change
  const handlePaymentSuccess = useCallback(() => {
    if (paymentComplete) return; // prevent double-fire
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
          // Fire affiliate commission now that we know the tier
          if (referredBy) {
            const tierAmounts: Record<string, number> = { monthly: 67, yearly: 397, lifetime: 997 };
            fetch('https://n8n.srv886554.hstgr.cloud/webhook/aff-commission-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                referral_code: referredBy,
                user_id: user!.id,
                amount: tierAmounts[data.tier] || 67,
                payment_id: `ghl-${user!.id}-${Date.now()}`,
              }),
            }).catch(() => {});
          }
          setTimeout(() => {
            handleClose();
            window.location.href = '/dashboard/deals';
          }, 1500);
          return;
        }
      } catch (e) {
        console.error('Tier poll error:', e);
      }

      if (attempts >= 45) {
        if (pollRef.current) clearInterval(pollRef.current);
        handleClose();
        window.location.href = '/dashboard/deals';
      }
    }, 1000);
  }, [handleClose, user, paymentComplete, referredBy]);

  // Listen for postMessage from GHL iframe (payment success signal)
  useEffect(() => {
    if (!open || paid) return;
    const handleMessage = (e: MessageEvent) => {
      // Allow messages from pay.nfstay.com and GHL domains
      if (!e.origin.includes('pay.nfstay.com') && !e.origin.includes('leadconnectorhq.com') && !e.origin.includes('gohighlevel.com')) return;
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

  const handleSendWhatsApp = async () => {
    const encodedMsg = encodeURIComponent(message);

    // Create inquiry row directly via Supabase client (bypasses edge function JWT issues)
    if (user && listing) {
      console.log('[InquiryPanel] insert attempt:', { userId: user?.id, propertyId: listing?.id, tier });
      try {
        // 1. Get property details for lister info
        const { data: prop } = await (supabase.from('properties') as any)
          .select('contact_phone, contact_email, contact_name, lister_type, landlord_whatsapp, name, nda_required')
          .eq('id', listing.id)
          .single();

        const token = crypto.randomUUID();
        const tenantName = user.user_metadata?.name || user.user_metadata?.full_name || null;
        const tenantEmail = user.email || null;
        const tenantPhone = user.user_metadata?.whatsapp || null;

        // Resolve lister_id: find landlord's user ID by their WhatsApp number
        const listerPhone = prop?.landlord_whatsapp || prop?.contact_phone || null;
        let listerId: string | null = null;
        if (listerPhone) {
          const { data: listerProfile } = await (supabase.from('profiles') as any)
            .select('id').eq('whatsapp', listerPhone).maybeSingle();
          if (listerProfile?.id) listerId = listerProfile.id;
        }
        // Fallback: try matching by email if WhatsApp lookup missed
        if (!listerId && prop?.contact_email) {
          const { data: emailProfile } = await (supabase.from('profiles') as any)
            .select('id').eq('email', prop.contact_email).maybeSingle();
          if (emailProfile?.id) listerId = emailProfile.id;
        }
        if (!listerId) {
          console.warn('[InquiryPanel] lister_id is null — landlord profile not found for phone:', listerPhone, 'email:', prop?.contact_email);
        }

        // 2. Insert inquiry directly
        const { data: insertedRow, error: insertErr } = await (supabase.from('inquiries') as any).insert({
          tenant_id: user.id,
          property_id: listing.id,
          lister_type: prop?.lister_type || 'landlord',
          lister_phone: listerPhone,
          lister_email: prop?.contact_email || null,
          lister_name: prop?.contact_name || null,
          lister_id: listerId,
          channel: 'whatsapp',
          message,
          tenant_name: tenantName,
          tenant_email: tenantEmail,
          tenant_phone: tenantPhone,
          token,
          status: 'new',
          nda_required: prop?.nda_required || false,
          authorized: false,
        }).select().single();

        if (insertErr) {
          console.error('[InquiryPanel] insert FAILED:', insertErr.message, insertErr.code, insertErr.details);
          toast.error('Could not save your inquiry. Please try again.');
        } else {
          console.log('[InquiryPanel] inquiry saved:', insertedRow);
          // Removed: landlord auto-notify now handled via AdminOutreach page

          // 3. Fire tenant confirmation webhook (non-blocking)
          if (tenantPhone) {
            fetch('https://n8n.srv886554.hstgr.cloud/webhook/inquiry-tenant-reply', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: tenantPhone,
                tenant_name: tenantName || 'there',
                property_name: prop?.name || listing.name,
                lister_type: prop?.lister_type || 'landlord',
              }),
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error('[InquiryPanel] inquiry failed:', err);
        toast.error('Could not save your inquiry. Please try again.');
      }
    }

    // Open WhatsApp and close panel after insert attempt completes
    window.open(`https://wa.me/447476368123?text=${encodedMsg}`, '_blank');
    handleClose();
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
    ref: referredBy || undefined,
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
        data-feature="DEALS__INQUIRY_PANEL"
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
          {paymentComplete ? (
            /* ── SUCCESS SCREEN ── */
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Welcome to nfstay!</h3>
              <p className="text-sm text-muted-foreground">Payment confirmed. Taking you to your inbox...</p>
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mt-2" />
            </div>
          ) : paid ? (
            /* ── PAID USER → WhatsApp ── */
            <div data-feature="DEALS__INQUIRY_PANEL_INFO" className="p-6">
              <label className="text-xs font-semibold text-foreground block mb-2">Your message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <button
                data-feature="DEALS__INQUIRY_PANEL_CONTACT"
                onClick={handleSendWhatsApp}
                className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold mt-4 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" /> Send on WhatsApp
              </button>
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
              {/* Persistent back button - always visible outside iframe so user is never stuck */}
              <div className="flex-shrink-0 border-t border-border p-3 bg-card">
                <button
                  onClick={() => { handleClose(); window.location.href = '/dashboard/deals'; }}
                  className="w-full h-10 rounded-lg bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors"
                >
                  Back to Deals
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
