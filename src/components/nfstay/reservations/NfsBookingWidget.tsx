// nfstay Booking Widget — sticky sidebar on property detail
// Checks availability, shows pricing, then navigates to /checkout for contact info + payment
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NfsProperty } from '@/lib/nfstay/types';
import { useNfsAvailability } from '@/hooks/nfstay/use-nfs-availability';
import { useNfsPricing } from '@/hooks/nfstay/use-nfs-pricing';
import NfsPromoCodeInput from './NfsPromoCodeInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { storeBookingIntent } from '@/pages/nfstay/NfsCheckoutPage';

interface Props {
  property: NfsProperty;
  bookingSource?: 'main_platform' | 'white_label' | 'operator_direct';
  operatorDomain?: string;
}

export default function NfsBookingWidget({ property, bookingSource = 'main_platform', operatorDomain }: Props) {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const { available, checking, error: availError, checkAvailability } = useNfsAvailability();
  const { pricing, setPromoDiscount } = useNfsPricing(property, checkIn, checkOut, adults, children);

  const minDate = new Date().toISOString().split('T')[0];

  const handleCheckAvailability = async () => {
    if (!checkIn || !checkOut) return;
    await checkAvailability(property.id, checkIn, checkOut);
  };

  const handlePromoValidated = (discount: { type: 'fixed' | 'percentage'; value: number } | null) => {
    setPromoDiscount(discount || undefined);
  };

  const handleReserve = () => {
    storeBookingIntent({
      propertyId: property.id,
      checkIn,
      checkOut,
      adults,
      children,
      bookingSource,
      operatorDomain,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });
    navigate('/checkout');
  };

  return (
    <div className="sticky top-6 rounded-xl border border-border/40 bg-white dark:bg-card p-5 space-y-4 shadow-sm">
      {/* Price header */}
      <p className="text-2xl font-bold">
        {property.base_rate_currency} {property.base_rate_amount?.toFixed(2)}
        <span className="text-sm font-normal text-muted-foreground"> / night</span>
      </p>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Check-in</label>
          <Input
            type="date"
            min={minDate}
            value={checkIn}
            onChange={e => { setCheckIn(e.target.value); }}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Check-out</label>
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
          <label className="text-xs text-muted-foreground block mb-1">Adults</label>
          <Input
            type="number"
            min={1}
            max={property.max_guests || 20}
            value={adults}
            onChange={e => setAdults(parseInt(e.target.value) || 1)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Children</label>
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
        variant="outline"
        onClick={handleCheckAvailability}
        disabled={!checkIn || !checkOut || checking}
      >
        {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        {checking ? 'Checking...' : 'Check Availability'}
      </Button>

      {/* Availability result */}
      {availError && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {availError}
        </div>
      )}
      {available === true && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="w-4 h-4" /> Available for these dates!
        </div>
      )}
      {available === false && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> Not available — those dates are already booked.
        </div>
      )}

      {/* Pricing breakdown + Reserve button */}
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

          <NfsPromoCodeInput onValidated={handlePromoValidated} />

          <div className="flex justify-between font-bold text-base border-t border-border/40 pt-2 mt-2">
            <span>Total</span>
            <span>{pricing.currency} {pricing.total.toFixed(2)}</span>
          </div>

          <Button
            className="w-full mt-2 bg-gradient-to-r from-purple-600 to-teal-500 hover:opacity-90 border-0"
            onClick={handleReserve}
          >
            Reserve Now <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            You won't be charged yet — next step: confirm your details
          </p>
        </div>
      )}
    </div>
  );
}
