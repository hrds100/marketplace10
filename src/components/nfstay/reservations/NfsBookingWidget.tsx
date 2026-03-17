import { useState } from 'react';
import type { NfsProperty } from '@/lib/nfstay/types';
import { useNfsAvailability } from '@/hooks/nfstay/use-nfs-availability';
import { useNfsPricing } from '@/hooks/nfstay/use-nfs-pricing';
import { useNfsStripeCheckout } from '@/hooks/nfstay/use-nfs-stripe';
import { useNfsReservationMutation } from '@/hooks/nfstay/use-nfs-reservation-mutation';
import NfsPromoCodeInput from './NfsPromoCodeInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface Props {
  property: NfsProperty;
}

export default function NfsBookingWidget({ property }: Props) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestFirstName, setGuestFirstName] = useState('');
  const { available, checking, error: availError, checkAvailability } = useNfsAvailability();
  const { pricing, setPromoDiscount } = useNfsPricing(property, checkIn, checkOut, adults, children);
  const { creating: checkoutLoading, error: checkoutError, createCheckoutSession } = useNfsStripeCheckout();
  const { createReservation, creating: reservationCreating } = useNfsReservationMutation();

  const minDate = new Date().toISOString().split('T')[0];
  const isBooking = checkoutLoading || reservationCreating;

  const handleCheckAvailability = async () => {
    if (!checkIn || !checkOut) return;
    await checkAvailability(property.id, checkIn, checkOut);
  };

  const handlePromoValidated = (discount: { type: 'fixed' | 'percentage'; value: number } | null) => {
    setPromoDiscount(discount || undefined);
  };

  const handleBookNow = async () => {
    if (!pricing || !checkIn || !checkOut || !guestEmail) return;

    try {
      // Create reservation first
      const reservation = await createReservation({
        property_id: property.id,
        operator_id: property.operator_id,
        check_in: checkIn,
        check_out: checkOut,
        check_in_time: property.check_in_time || '15:00',
        check_out_time: property.check_out_time || '11:00',
        adults,
        children,
        total_amount: pricing.total,
        payment_currency: pricing.currency,
        guest_email: guestEmail,
        guest_first_name: guestFirstName || undefined,
        booking_source: 'main_platform',
        status: 'pending',
        payment_status: 'pending',
      } as any);

      if (!reservation?.id) return;

      // Create checkout session and redirect
      const url = await createCheckoutSession(reservation.id);
      if (url) {
        window.location.href = url;
      }
    } catch {
      // Errors are handled in hooks
    }
  };

  return (
    <div className="sticky top-6 rounded-xl border border-border/40 bg-white dark:bg-card p-5 space-y-4">
      {/* Price header */}
      <p className="text-2xl font-bold">
        {property.base_rate_currency} {property.base_rate_amount}
        <span className="text-sm font-normal text-muted-foreground"> / night</span>
      </p>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Check-in</label>
          <Input
            type="date"
            min={minDate}
            value={checkIn}
            onChange={e => { setCheckIn(e.target.value); }}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Check-out</label>
          <Input
            type="date"
            min={checkIn || minDate}
            value={checkOut}
            onChange={e => { setCheckOut(e.target.value); }}
          />
        </div>
      </div>

      {/* Guests */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Adults</label>
          <Input
            type="number"
            min={1}
            max={property.max_guests || 20}
            value={adults}
            onChange={e => setAdults(parseInt(e.target.value) || 1)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Children</label>
          <Input
            type="number"
            min={0}
            value={children}
            onChange={e => setChildren(parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Check availability */}
      <Button
        className="w-full"
        onClick={handleCheckAvailability}
        disabled={!checkIn || !checkOut || checking}
      >
        {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        {checking ? 'Checking...' : 'Check Availability'}
      </Button>

      {/* Availability result */}
      {availError && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" /> {availError}
        </div>
      )}
      {available === true && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="w-4 h-4" /> Available for these dates!
        </div>
      )}
      {available === false && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" /> Not available — dates conflict with an existing booking.
        </div>
      )}

      {/* Pricing breakdown + booking form */}
      {pricing && available === true && (
        <div className="border-t border-border/40 pt-4 space-y-3">
          {pricing.lineItems.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className={item.type === 'discount' ? 'text-green-600' : 'text-muted-foreground'}>
                {item.label}
              </span>
              <span className={item.type === 'discount' ? 'text-green-600' : ''}>
                {item.amount < 0 ? '−' : ''}{pricing.currency} {Math.abs(item.amount).toFixed(2)}
              </span>
            </div>
          ))}

          {/* Promo code */}
          <NfsPromoCodeInput onValidated={handlePromoValidated} />

          <div className="flex justify-between font-bold text-base border-t border-border/40 pt-2 mt-2">
            <span>Total</span>
            <span>{pricing.currency} {pricing.total.toFixed(2)}</span>
          </div>

          {/* Guest info for booking */}
          <div className="space-y-2 pt-2">
            <div>
              <label className="text-xs text-muted-foreground">Your name</label>
              <Input
                placeholder="First name"
                value={guestFirstName}
                onChange={e => setGuestFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Your email *</label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={guestEmail}
                onChange={e => setGuestEmail(e.target.value)}
              />
            </div>
          </div>

          {checkoutError && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" /> {checkoutError}
            </div>
          )}

          <Button
            className="w-full mt-2"
            onClick={handleBookNow}
            disabled={isBooking || !guestEmail}
          >
            {isBooking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isBooking ? 'Processing...' : `Book Now — ${pricing.currency} ${pricing.total.toFixed(2)}`}
          </Button>
        </div>
      )}
    </div>
  );
}
