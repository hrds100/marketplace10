import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface ReservationSummary {
  id: string;
  propertyTitle?: string;
  propertyCity?: string;
  propertyCountry?: string;
  coverImage?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  total: number;
  currency: string;
  guestName?: string;
  guestEmail?: string;
}

export default function NfsPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservation_id');
  const [summary, setSummary] = useState<ReservationSummary | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('nfs_last_reservation');
      if (raw) {
        const parsed = JSON.parse(raw);
        setSummary(parsed);
        sessionStorage.removeItem('nfs_last_reservation');
      }
    } catch {
      // ignore
    }
  }, []);

  const nights = summary
    ? Math.ceil((new Date(summary.checkOut).getTime() - new Date(summary.checkIn).getTime()) / 86400000)
    : 0;
  const totalGuests = summary ? (summary.adults || 0) + (summary.children || 0) : 0;
  const location = summary
    ? [summary.propertyCity, summary.propertyCountry].filter(Boolean).join(', ')
    : '';

  return (
    <div data-feature="BOOKING_NFSTAY__CHECKOUT" className="min-h-screen bg-background flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Success header */}
        <div data-feature="BOOKING_NFSTAY__SUCCESS_MESSAGE" className="text-center space-y-3">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold">Booking Confirmed!</h1>
          <p className="text-muted-foreground text-sm">
            {summary?.guestName ? `Hi ${summary.guestName.split(' ')[0]}, your` : 'Your'} reservation is confirmed.
            {summary?.guestEmail ? ` A confirmation email has been sent to ${summary.guestEmail}.` : ' You will receive a confirmation email shortly.'}
          </p>
        </div>

        {/* Booking details card */}
        {summary ? (
          <div data-feature="BOOKING_NFSTAY__SUCCESS_SUMMARY" className="bg-white dark:bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
            {summary.coverImage && (
              <div className="h-40 overflow-hidden">
                <img src={summary.coverImage} alt={summary.propertyTitle} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5 space-y-4">
              {/* Property */}
              <div>
                <h2 className="font-semibold text-base leading-snug">{summary.propertyTitle || 'Your Property'}</h2>
                {location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {location}
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="flex items-start gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {format(new Date(summary.checkIn), 'EEE, MMM d')} – {format(new Date(summary.checkOut), 'EEE, MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Guests */}
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span>
                  {totalGuests} guest{totalGuests !== 1 ? 's' : ''} ({summary.adults} adult{summary.adults !== 1 ? 's' : ''}
                  {summary.children > 0 ? `, ${summary.children} child${summary.children !== 1 ? 'ren' : ''}` : ''})
                </span>
              </div>

              {/* Total */}
              <div className="border-t border-border/40 pt-3 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total paid</span>
                <span className="text-lg font-bold">{summary.currency} {summary.total.toFixed(2)}</span>
              </div>

              {/* Reservation ID */}
              {(reservationId || summary.id) && (
                <p className="text-xs text-muted-foreground font-mono text-center">
                  Reservation ID: {reservationId || summary.id}
                </p>
              )}
            </div>
          </div>
        ) : (
          reservationId && (
            <div className="bg-white dark:bg-card border border-border/40 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground font-mono">Reservation: {reservationId}</p>
            </div>
          )
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {summary && (
            <Button asChild variant="outline" className="w-full">
              <Link to={`/booking?id=${summary.id}&email=${encodeURIComponent(summary.guestEmail || '')}`}>
                View Booking Details
              </Link>
            </Button>
          )}
          <Button data-feature="BOOKING_NFSTAY__SUCCESS_BROWSE" asChild className="w-full bg-gradient-to-r from-purple-600 to-teal-500 hover:opacity-90 border-0">
            <Link to="/search">
              Browse More Properties <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
