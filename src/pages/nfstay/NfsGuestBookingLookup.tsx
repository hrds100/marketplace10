// Guest Booking Lookup — nfstay.app/booking
// Guests enter email + reservation ID to view their booking details
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, CheckCircle, MapPin, Calendar, Users, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ReservationSummary {
  id: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  total_amount: number;
  payment_currency: string;
  status: string;
  payment_status: string;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_email: string;
  property?: {
    public_title?: string;
    city?: string;
    country?: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

export default function NfsGuestBookingLookup() {
  const [searchParams] = useSearchParams();
  const [reservationId, setReservationId] = useState(searchParams.get('id') || '');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<ReservationSummary | null>(null);

  // Auto-lookup if id is in URL (from success page link)
  const autoId = searchParams.get('id');
  const autoEmail = searchParams.get('email');
  useEffect(() => {
    if (autoId && autoEmail) {
      setReservationId(autoId);
      setEmail(autoEmail);
    }
  }, [autoId, autoEmail]);

  const handleLookup = async () => {
    if (!reservationId.trim() || !email.trim()) {
      setError('Please enter both your email and reservation ID.');
      return;
    }
    setLoading(true);
    setError(null);
    setReservation(null);

    try {
      const { data, error: dbError } = await (supabase.from('nfs_reservations') as any)
        .select(`
          id, check_in, check_out, adults, children,
          total_amount, payment_currency, status, payment_status,
          guest_first_name, guest_last_name, guest_email,
          nfs_properties!property_id(public_title, city, country)
        `)
        .eq('id', reservationId.trim())
        .eq('guest_email', email.trim().toLowerCase())
        .maybeSingle();

      if (dbError || !data) {
        setError('No booking found with those details. Check your email and reservation ID.');
        return;
      }

      setReservation({
        ...data,
        property: (data as any).nfs_properties,
      });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nights = reservation
    ? Math.ceil((new Date(reservation.check_in).getTime() - new Date(reservation.check_out).getTime()) / -86400000)
    : 0;
  const totalGuests = (reservation?.adults || 0) + (reservation?.children || 0);
  const location = reservation?.property
    ? [reservation.property.city, reservation.property.country].filter(Boolean).join(', ')
    : '';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold">Find Your Booking</h1>
          <p className="text-muted-foreground mt-2">
            Enter the email address you used to book and your reservation ID.
          </p>
        </div>

        {/* Lookup form */}
        <div className="bg-white dark:bg-card border border-border/40 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email address</label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Reservation ID</label>
            <Input
              placeholder="e.g. res_abc12345..."
              value={reservationId}
              onChange={e => setReservationId(e.target.value)}
              className="font-mono text-sm"
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
            />
            <p className="text-xs text-muted-foreground">
              You can find this in your booking confirmation email.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button
            className="w-full bg-gradient-to-r from-purple-600 to-teal-500 hover:opacity-90 border-0"
            onClick={handleLookup}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Looking up...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4" /> Find My Booking
              </span>
            )}
          </Button>
        </div>

        {/* Result */}
        {reservation && (
          <div className="mt-8 bg-white dark:bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-teal-500 p-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Booking Found</span>
              </div>
              <p className="text-sm opacity-90 font-mono">{reservation.id}</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[reservation.status] || 'bg-gray-100 text-gray-700'}`}>
                  {reservation.status}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[reservation.payment_status] || 'bg-gray-100 text-gray-700'}`}>
                  Payment: {reservation.payment_status}
                </span>
              </div>

              {/* Property */}
              {reservation.property && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{reservation.property.public_title}</p>
                    {location && <p className="text-muted-foreground">{location}</p>}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="flex items-start gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {format(new Date(reservation.check_in), 'EEE, MMM d')} – {format(new Date(reservation.check_out), 'EEE, MMM d, yyyy')}
                  </p>
                  <p className="text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Guests */}
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span>{totalGuests} guest{totalGuests !== 1 ? 's' : ''} ({reservation.adults} adult{reservation.adults !== 1 ? 's' : ''}
                  {reservation.children > 0 ? `, ${reservation.children} child${reservation.children !== 1 ? 'ren' : ''}` : ''})</span>
              </div>

              {/* Total */}
              <div className="border-t border-border/40 pt-3 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total paid</span>
                <span className="text-lg font-bold">
                  {reservation.payment_currency} {reservation.total_amount?.toFixed(2)}
                </span>
              </div>

              <Button asChild variant="outline" className="w-full">
                <Link to="/search">
                  Browse More Properties <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
