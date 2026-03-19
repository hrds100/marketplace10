// White-label property detail — operator-branded property view with booking
import { useParams, useNavigate } from 'react-router-dom';
import { useNfsProperty } from '@/hooks/nfstay/use-nfs-property';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import NfsPhotoGallery from '@/components/nfstay/properties/NfsPhotoGallery';
import NfsBookingWidget from '@/components/nfstay/reservations/NfsBookingWidget';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Users, BedDouble, Bath, MapPin } from 'lucide-react';

export default function NfsWlProperty() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operator } = useNfsWhiteLabel();
  const { property, loading, error } = useNfsProperty(id || '');

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !property || property.listing_status !== 'listed') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-xl font-bold">Property not found</h1>
        <p className="text-sm text-muted-foreground">This property may have been removed or is no longer available.</p>
        <Button variant="outline" onClick={() => navigate('/search')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to properties
        </Button>
      </div>
    );
  }

  // Verify this property belongs to the white-label operator
  if (operator && property.operator_id !== operator.id) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-xl font-bold">Property not found</h1>
        <Button variant="outline" onClick={() => navigate('/search')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to properties
        </Button>
      </div>
    );
  }

  const title = property.public_title || 'Vacation Rental';
  const location = [property.city, property.country].filter(Boolean).join(', ');
  const roomCounts = Array.isArray(property.room_counts) ? property.room_counts as { type: string; count: number }[] : [];
  const bedrooms = roomCounts.find(r => r.type === 'bedroom')?.count || 0;
  const bathrooms = roomCounts.find(r => r.type === 'bathroom')?.count || 0;
  const enabledAmenities = Object.entries(property.amenities || {}).filter(([, v]) => v).map(([k]) => k);

  // Build the operator domain for booking source tracking
  const operatorDomain = typeof window !== 'undefined' ? window.location.hostname : '';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <Button variant="ghost" size="sm" onClick={() => navigate('/search')}>
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to properties
      </Button>

      {/* Photos */}
      {property.images && property.images.length > 0 && (
        <NfsPhotoGallery images={property.images} readOnly />
      )}

      {/* Title + Location */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {location && (
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
            <MapPin className="w-4 h-4" /> {location}
          </p>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left — Details */}
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 text-sm">
            {property.max_guests && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-4 h-4" /> {property.max_guests} guests
              </span>
            )}
            {bedrooms > 0 && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <BedDouble className="w-4 h-4" /> {bedrooms} {bedrooms === 1 ? 'bedroom' : 'bedrooms'}
              </span>
            )}
            {bathrooms > 0 && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Bath className="w-4 h-4" /> {bathrooms} {bathrooms === 1 ? 'bathroom' : 'bathrooms'}
              </span>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div>
              <h2 className="text-lg font-semibold mb-2">About this property</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{property.description}</p>
            </div>
          )}

          {/* Amenities */}
          {enabledAmenities.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {enabledAmenities.map(a => (
                  <span key={a} className="px-3 py-1.5 text-xs bg-muted/40 rounded-full">
                    {a.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* House rules */}
          {property.rules && (
            <div>
              <h2 className="text-lg font-semibold mb-2">House Rules</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{property.rules}</p>
            </div>
          )}

          {/* Cancellation */}
          {property.cancellation_policy && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Cancellation Policy</h2>
              <p className="text-sm text-muted-foreground capitalize">{property.cancellation_policy}</p>
            </div>
          )}
        </div>

        {/* Right — Booking widget */}
        <div className="lg:sticky lg:top-4 self-start">
          <NfsBookingWidget
            property={property}
            bookingSource="white_label"
            operatorDomain={operatorDomain}
          />
        </div>
      </div>
    </div>
  );
}
