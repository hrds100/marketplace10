// White-label booking page — shows reservation details by ID
// Accessed via email confirmation links: /booking/:id
import { useParams, useNavigate } from 'react-router-dom';
import { useNfsReservation } from '@/hooks/nfstay/use-nfs-reservation';
import { useNfsProperty } from '@/hooks/nfstay/use-nfs-property';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Users,
  MapPin,
  Mail,
  ChevronLeft,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  confirmed: { icon: CheckCircle, color: 'text-green-600', label: 'Confirmed' },
  pending: { icon: Clock, color: 'text-yellow-600', label: 'Pending Payment' },
  cancelled: { icon: XCircle, color: 'text-red-600', label: 'Cancelled' },
  completed: { icon: CheckCircle, color: 'text-blue-600', label: 'Completed' },
  no_show: { icon: XCircle, color: 'text-gray-500', label: 'No Show' },
  expired: { icon: Clock, color: 'text-gray-500', label: 'Expired' },
};

export default function NfsWlBooking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operator, isPlatform } = useNfsWhiteLabel();
  const { reservation, loading, error } = useNfsReservation(id || '');
  const { property } = useNfsProperty(reservation?.property_id || '');

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <XCircle className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Booking Not Found</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          This booking could not be found. It may have expired or the link is incorrect.
        </p>
        <Button variant="outline" onClick={() => navigate('/search')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Browse Properties
        </Button>
      </div>
    );
  }

  // Verify reservation belongs to this operator — skip in platform mode
  if (!isPlatform && operator && reservation.operator_id !== operator.id) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <XCircle className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Booking Not Found</h1>
        <Button variant="outline" onClick={() => navigate('/')}>
          Go Home
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(reservation.check_out).getTime() - new Date(reservation.check_in).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
  const totalGuests = reservation.adults + (reservation.children || 0);
  const propertyTitle = property?.public_title || 'Vacation Rental';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Status header */}
      <div className="text-center space-y-2">
        <StatusIcon className={`w-14 h-14 mx-auto ${statusCfg.color}`} />
        <h1 className="text-2xl font-bold">Booking {statusCfg.label}</h1>
        <p className="text-sm text-muted-foreground">
          Reservation #{reservation.id.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {/* Property info */}
      <div className="rounded-xl border border-border/40 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-lg">{propertyTitle}</h2>

        {property?.city && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {[property.city, property.country].filter(Boolean).join(', ')}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Check-in</p>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {new Date(reservation.check_in).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Check-out</p>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {new Date(reservation.check_out).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-6 text-sm text-muted-foreground pt-1">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" /> {totalGuests} {totalGuests === 1 ? 'guest' : 'guests'}
          </span>
          <span>{nights} {nights === 1 ? 'night' : 'nights'}</span>
        </div>

        {/* Payment summary */}
        <div className="border-t border-border/40 pt-3 mt-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment status</span>
            <span className="font-medium capitalize">{reservation.payment_status}</span>
          </div>
          <div className="flex justify-between text-base font-bold mt-1">
            <span>Total</span>
            <span>
              {reservation.payment_currency} {reservation.total_amount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Guest info */}
      {(reservation.guest_first_name || reservation.guest_email) && (
        <div className="rounded-xl border border-border/40 bg-white p-5 space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Guest Details
          </h3>
          {reservation.guest_first_name && (
            <p className="text-sm">
              {reservation.guest_first_name} {reservation.guest_last_name || ''}
            </p>
          )}
          {reservation.guest_email && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-4 h-4" /> {reservation.guest_email}
            </p>
          )}
        </div>
      )}

      {/* Contact operator */}
      {operator?.contact_email && (
        <div className="text-center text-sm text-muted-foreground">
          Questions? Contact us at{' '}
          <a href={`mailto:${operator.contact_email}`} className="underline">
            {operator.contact_email}
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={() => navigate('/search')}>
          Browse Properties
        </Button>
        {property && (
          <Button onClick={() => navigate(`/property/${property.id}`)}>
            View Property
          </Button>
        )}
      </div>
    </div>
  );
}
