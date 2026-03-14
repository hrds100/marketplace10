import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle } from 'lucide-react';
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

/**
 * Page-level inquiry panel. Renders via portal to document.body.
 * Slides in from right, covers 50vw on desktop, 100vw on mobile.
 * Only ONE instance should exist per page.
 */
export default function InquiryPanel({ open, listing, onClose }: Props) {
  const { user } = useAuth();
  const { tier } = useUserTier();
  const paid = isPaidTier(tier);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  // Sync open state with visibility (allows close animation)
  useEffect(() => {
    if (open && listing) {
      setVisible(true);
      setMessage(
        `Hi, interested in ${listing.name} ref #${listing.id}. Could you share more details about availability and terms? Thanks!`
      );
    }
  }, [open, listing?.id]);

  const handleClose = useCallback(() => {
    setVisible(false);
    // Wait for slide-out animation before clearing
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, handleClose]);

  // Don't render anything if not open and not animating out
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

  const funnelUrl = getFunnelUrl({
    email: user?.email,
    name: user?.user_metadata?.name,
    phone: user?.user_metadata?.whatsapp,
  });

  const panel = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[300] bg-black/50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
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
              {paid ? 'Contact Landlord' : 'Get Deal Access'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{listing.name} · {listing.city}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {paid ? (
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
          ) : (
            /* ── FREE USER → GHL funnel iframe ── */
            funnelUrl ? (
              <iframe
                src={funnelUrl}
                className="w-full h-full border-0"
                title="Checkout"
                allow="payment"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground text-center">
                  Checkout is being configured. Please try again shortly.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
