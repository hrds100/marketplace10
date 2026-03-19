// NFStay Checkout Page — sits between booking widget and Stripe
// Reads booking intent from sessionStorage, collects contact info, confirms price, then redirects to Stripe
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, MapPin, Calendar, Users, AlertCircle, Loader2, Shield } from 'lucide-react';
import { differenceInCalendarDays, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNfsProperty } from '@/hooks/nfstay/use-nfs-property';
import { useNfsPricing } from '@/hooks/nfstay/use-nfs-pricing';
import { useNfsReservationMutation } from '@/hooks/nfstay/use-nfs-reservation-mutation';
import { useNfsStripeCheckout } from '@/hooks/nfstay/use-nfs-stripe';
import NfsPromoCodeInput from '@/components/nfstay/reservations/NfsPromoCodeInput';

// ── Booking intent ────────────────────────────────────────────────────────────

const INTENT_KEY = 'nfs_booking_intent';

export interface BookingIntent {
  propertyId: string;
  checkIn: string;  // YYYY-MM-DD
  checkOut: string;
  adults: number;
  children: number;
  bookingSource: 'main_platform' | 'white_label' | 'operator_direct';
  operatorDomain?: string;
  expiresAt: number; // ms timestamp
}

export function storeBookingIntent(intent: BookingIntent) {
  sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent));
}

function readBookingIntent(): BookingIntent | null {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const intent: BookingIntent = JSON.parse(raw);
    if (intent.expiresAt < Date.now()) {
      sessionStorage.removeItem(INTENT_KEY);
      return null;
    }
    return intent;
  } catch {
    return null;
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NfsCheckoutPage() {
  const navigate = useNavigate();
  const [intent] = useState<BookingIntent | null>(() => readBookingIntent());
  const { property, loading: propertyLoading } = useNfsProperty(intent?.propertyId || '');
  const { pricing, setPromoDiscount } = useNfsPricing(
    property,
    intent?.checkIn || '',
    intent?.checkOut || '',
    intent?.adults ?? 1,
    intent?.children ?? 0,
  );
  const { createReservation, creating } = useNfsReservationMutation();
  const { createCheckoutSession, creating: checkoutCreating, error: checkoutError } = useNfsStripeCheckout();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isSubmitting = creating || checkoutCreating;

  // ── No intent ──────────────────────────────────────────────────────────────

  if (!intent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="w-10 h-10 text-amber-500" />
        <h1 className="text-xl font-bold">No active booking</h1>
        <p className="text-sm text-muted-foreground text-center">
          Start from a property page to make a booking.
        </p>
        <Button asChild variant="outline">
          <Link to="/search">Browse Properties</Link>
        </Button>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const nights = differenceInCalendarDays(new Date(intent.checkOut), new Date(intent.checkIn));
  const totalGuests = (intent.adults || 0) + (intent.children || 0);
  const title = property?.public_title || 'Property';
  const location = [property?.city, property?.country].filter(Boolean).join(', ');
  const coverImage = property?.images?.find((i: any) => i.is_cover)?.url || property?.images?.[0]?.url;

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setFormError(null);

    if (!firstName.trim()) { setFormError('Please enter your first name.'); return; }
    if (!email.trim() || !email.includes('@')) { setFormError('Please enter a valid email address.'); return; }
    if (!agreedToTerms) { setFormError('Please agree to the terms and conditions.'); return; }
    if (!property || !pricing) { setFormError('Property not loaded yet. Please wait.'); return; }

    try {
      const reservation = await createReservation({
        property_id: property.id,
        operator_id: property.operator_id,
        check_in: intent.checkIn,
        check_out: intent.checkOut,
        check_in_time: property.check_in_time || '15:00',
        check_out_time: property.check_out_time || '11:00',
        adults: intent.adults,
        children: intent.children,
        total_amount: pricing.total,
        payment_currency: pricing.currency,
        guest_email: email.trim(),
        guest_first_name: firstName.trim(),
        guest_last_name: lastName.trim() || undefined,
        guest_phone: phone.trim() || undefined,
        guest_message: specialRequests.trim() || undefined,
        booking_source: intent.bookingSource,
        operator_domain: intent.operatorDomain || undefined,
        status: 'pending',
        payment_status: 'pending',
      } as any);

      if (!reservation?.id) {
        setFormError('Failed to create reservation. Please try again.');
        return;
      }

      // Persist summary so success page can display it without auth
      sessionStorage.setItem('nfs_last_reservation', JSON.stringify({
        id: reservation.id,
        propertyTitle: property.public_title,
        propertyCity: property.city,
        propertyCountry: property.country,
        coverImage,
        checkIn: intent.checkIn,
        checkOut: intent.checkOut,
        adults: intent.adults,
        children: intent.children,
        total: pricing.total,
        currency: pricing.currency,
        guestName: [firstName.trim(), lastName.trim()].filter(Boolean).join(' '),
        guestEmail: email.trim(),
      }));
      sessionStorage.removeItem(INTENT_KEY);

      const url = await createCheckoutSession(reservation.id);
      if (url) window.location.href = url;
    } catch {
      setFormError('Something went wrong. Please try again.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to property
        </Button>

        <h1 className="text-2xl font-bold mb-8">Confirm and Pay</h1>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* ── Left: contact form ─────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Personal details */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Your details</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">First name <span className="text-red-500">*</span></label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Last name</label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
                </div>
              </div>
              <div className="space-y-1 mt-3">
                <label className="text-sm font-medium">Email address <span className="text-red-500">*</span></label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                <p className="text-xs text-muted-foreground">Your booking confirmation will be sent here.</p>
              </div>
              <div className="space-y-1 mt-3">
                <label className="text-sm font-medium">Phone number</label>
                <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 900000" />
              </div>
            </div>

            {/* Special requests */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Special requests</h2>
              <Textarea
                value={specialRequests}
                onChange={e => setSpecialRequests(e.target.value)}
                placeholder="Any special requests or notes for the host..."
                className="resize-none h-24"
              />
            </div>

            {/* Terms */}
            <div className="border-t border-border/40 pt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">
                  I agree to the{' '}
                  <a href="/terms" target="_blank" className="underline text-foreground">Terms & Conditions</a>
                  {' '}and confirm I have read the house rules.
                </span>
              </label>
            </div>

            {/* Errors */}
            {(formError || checkoutError) && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {formError || checkoutError}
              </div>
            )}

            {/* Submit */}
            <Button
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-teal-500 hover:opacity-90 border-0"
              onClick={handleSubmit}
              disabled={isSubmitting || !pricing || propertyLoading}
            >
              {isSubmitting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                : `Confirm and Pay${pricing ? ` — ${pricing.currency} ${pricing.total.toFixed(2)}` : ''}`
              }
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              Secure payment powered by Stripe — your card details are never stored here
            </div>
          </div>

          {/* ── Right: booking summary ─────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 rounded-xl border border-border/40 bg-white dark:bg-card overflow-hidden shadow-sm">
              {/* Property */}
              {propertyLoading ? (
                <div className="h-40 bg-muted animate-pulse" />
              ) : (
                <>
                  {coverImage && (
                    <div className="h-40 overflow-hidden">
                      <img src={coverImage} alt={title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4 border-b border-border/40">
                    <h3 className="font-semibold text-sm leading-snug">{title}</h3>
                    {location && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {location}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Trip summary */}
              <div className="p-4 space-y-3 border-b border-border/40">
                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(intent.checkIn), 'MMM d')} – {format(new Date(intent.checkOut), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{totalGuests} guest{totalGuests !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Price breakdown */}
              {pricing ? (
                <div className="p-4 space-y-2">
                  {pricing.lineItems.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className={item.type === 'discount' ? 'text-green-600' : 'text-muted-foreground'}>
                        {item.label}
                      </span>
                      <span className={item.type === 'discount' ? 'text-green-600 font-medium' : ''}>
                        {item.amount < 0 ? '−' : ''}{pricing.currency} {Math.abs(item.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-1">
                    <NfsPromoCodeInput onValidated={(d) => setPromoDiscount(d || undefined)} />
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-border/40 pt-3 mt-1">
                    <span>Total</span>
                    <span>{pricing.currency} {pricing.total.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
