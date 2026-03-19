import { useParams, useNavigate } from 'react-router-dom';
import { useNfsProperty } from '@/hooks/nfstay/use-nfs-property';
import NfsPhotoGallery from '@/components/nfstay/properties/NfsPhotoGallery';
import NfsPropertyMap from '@/components/nfstay/maps/NfsPropertyMap';
import NfsBookingWidget from '@/components/nfstay/reservations/NfsBookingWidget';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Users, BedDouble, Bath, Maximize, MapPin } from 'lucide-react';

export default function NfsPropertyView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { property, loading, error } = useNfsProperty(id || '');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !property || property.listing_status !== 'listed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-xl font-bold">Property not found</h1>
        <p className="text-sm text-muted-foreground">This property may have been removed or is no longer available.</p>
        <Button variant="outline" onClick={() => navigate('/search')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to search
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Back nav */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/search')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to search
        </Button>

        {/* Photo gallery */}
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

        {/* Quick stats */}
        <div className="flex flex-wrap gap-4 text-sm">
          {property.max_guests && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/30 rounded-lg">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{property.max_guests} guests</span>
            </div>
          )}
          {bedrooms > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/30 rounded-lg">
              <BedDouble className="w-4 h-4 text-muted-foreground" />
              <span>{bedrooms} {bedrooms === 1 ? 'bedroom' : 'bedrooms'}</span>
            </div>
          )}
          {bathrooms > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/30 rounded-lg">
              <Bath className="w-4 h-4 text-muted-foreground" />
              <span>{bathrooms} {bathrooms === 1 ? 'bathroom' : 'bathrooms'}</span>
            </div>
          )}
          {property.size_value && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/30 rounded-lg">
              <Maximize className="w-4 h-4 text-muted-foreground" />
              <span>{property.size_value} {property.size_unit || 'sqm'}</span>
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {property.description && (
              <div>
                <h2 className="text-lg font-semibold mb-3">About this place</h2>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{property.description}</p>
              </div>
            )}

            {/* Amenities */}
            {enabledAmenities.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {enabledAmenities.map(a => (
                    <div key={a} className="flex items-center gap-2 text-sm py-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {a.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* House rules */}
            {(property.check_in_time || property.check_out_time || property.rules) && (
              <div>
                <h2 className="text-lg font-semibold mb-3">House Rules</h2>
                <div className="space-y-2 text-sm">
                  {property.check_in_time && <p>Check-in: {property.check_in_time}</p>}
                  {property.check_out_time && <p>Check-out: {property.check_out_time}</p>}
                  {property.max_pets !== null && property.max_pets !== undefined && (
                    <p>Pets: {property.max_pets > 0 ? `Up to ${property.max_pets}` : 'Not allowed'}</p>
                  )}
                  {property.cancellation_policy && <p>Cancellation: {property.cancellation_policy}</p>}
                  {property.rules && <p className="whitespace-pre-wrap mt-2">{property.rules}</p>}
                </div>
              </div>
            )}

            {/* Location map */}
            {property.lat && property.lng && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Location</h2>
                <div className="h-64 rounded-xl overflow-hidden border border-border/40">
                  <NfsPropertyMap lat={property.lat} lng={property.lng} title={title} />
                </div>
              </div>
            )}
          </div>

          {/* Booking widget */}
          <div className="lg:col-span-1">
            <NfsBookingWidget property={property} />
          </div>
        </div>
      </div>
    </div>
  );
}
