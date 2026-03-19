// White-label property detail — enhanced with gallery, sections, map, related
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNfsProperty } from '@/hooks/nfstay/use-nfs-property';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import { supabase } from '@/integrations/supabase/client';
import NfsBookingWidget from '@/components/nfstay/reservations/NfsBookingWidget';
import NfsWlImageGallery from '@/components/nfstay/white-label/NfsWlImageGallery';
import NfsWlLocationMap from '@/components/nfstay/white-label/NfsWlLocationMap';
import NfsWlPropertyCard from '@/components/nfstay/white-label/NfsWlPropertyCard';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ChevronLeft,
  Users,
  BedDouble,
  Bath,
  MapPin,
  Clock,
  LogIn,
  LogOut,
  ShieldCheck,
  PawPrint,
  Home,
  Star,
  Wifi,
  Car,
  Wind,
  Waves,
  UtensilsCrossed,
  Tv,
  Shirt,
  Flame,
} from 'lucide-react';
import type { NfsProperty } from '@/lib/nfstay/types';

// Amenity icon mapping
const AMENITY_ICONS: Record<string, React.ElementType> = {
  wifi: Wifi,
  parking: Car,
  air_conditioning: Wind,
  pool: Waves,
  kitchen: UtensilsCrossed,
  tv: Tv,
  washer: Shirt,
  dryer: Shirt,
  heating: Flame,
};

function getRoomCount(roomCounts: unknown[], type: string): number {
  if (!Array.isArray(roomCounts)) return 0;
  const entry = roomCounts.find(
    (rc): rc is { type: string; count: number } =>
      typeof rc === 'object' &&
      rc !== null &&
      'type' in rc &&
      (rc as Record<string, unknown>).type === type,
  );
  return typeof entry?.count === 'number' ? entry.count : 0;
}

// Section wrapper with anchor ID
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function NfsWlProperty() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { operator } = useNfsWhiteLabel();
  const { property, loading, error } = useNfsProperty(id || '');
  const [relatedProperties, setRelatedProperties] = useState<NfsProperty[]>([]);

  // Fetch related properties (same operator, different property)
  const fetchRelated = useCallback(async () => {
    if (!property?.operator_id || !property?.id) return;
    try {
      const { data } = await (supabase.from('nfs_properties') as any)
        .select('*')
        .eq('operator_id', property.operator_id)
        .eq('listing_status', 'listed')
        .neq('id', property.id)
        .limit(3)
        .order('updated_at', { ascending: false });
      setRelatedProperties((data as NfsProperty[]) ?? []);
    } catch {
      // silently fail — related is non-critical
    }
  }, [property?.operator_id, property?.id]);

  useEffect(() => {
    fetchRelated();
  }, [fetchRelated]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error / not found
  if (error || !property || property.listing_status !== 'listed') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <Home className="h-10 w-10 text-muted-foreground/40" />
        <h1 className="text-xl font-bold">Property not found</h1>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          This property may have been removed or is no longer available.
        </p>
        <Button variant="outline" onClick={() => navigate('/search')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to properties
        </Button>
      </div>
    );
  }

  // Operator boundary check
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
  const fullAddress = [property.street, property.city, property.state, property.postal_code, property.country]
    .filter(Boolean)
    .join(', ');
  const roomCounts = Array.isArray(property.room_counts) ? property.room_counts : [];
  const bedrooms = getRoomCount(roomCounts, 'bedroom');
  const bathrooms = getRoomCount(roomCounts, 'bathroom');
  const enabledAmenities = Object.entries(property.amenities || {})
    .filter(([, v]) => v)
    .map(([k]) => k);
  const operatorDomain =
    typeof window !== 'undefined' ? window.location.hostname : '';
  const hasLocation = property.lat != null && property.lng != null;

  // Room sections (defensive parsing)
  const roomSections = Array.isArray(property.room_sections)
    ? (property.room_sections as { name?: string; beds?: { type?: string; count?: number }[] }[])
    : [];

  // Build section nav items
  const sections: { id: string; label: string; show: boolean }[] = [
    { id: 'overview', label: 'Overview', show: !!property.description },
    { id: 'space', label: 'Space', show: roomSections.length > 0 || bedrooms > 0 },
    { id: 'amenities', label: 'Amenities', show: enabledAmenities.length > 0 },
    { id: 'location', label: 'Location', show: hasLocation },
    { id: 'rules', label: 'Rules', show: !!property.rules || !!property.check_in_time },
    { id: 'cancellation', label: 'Cancellation', show: !!property.cancellation_policy },
  ];
  const visibleSections = sections.filter((s) => s.show);

  return (
    <div className="min-h-[60vh]">
      {/* Back button */}
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/search')}
          className="mb-2"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to properties
        </Button>
      </div>

      {/* Image Gallery */}
      <div className="mx-auto max-w-6xl px-4">
        <NfsWlImageGallery images={property.images || []} title={title} />
      </div>

      {/* Title + Quick stats */}
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {location && (
          <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4" /> {location}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {property.max_guests != null && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" /> {property.max_guests} guests
            </span>
          )}
          {bedrooms > 0 && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <BedDouble className="h-4 w-4" /> {bedrooms}{' '}
              {bedrooms === 1 ? 'bedroom' : 'bedrooms'}
            </span>
          )}
          {bathrooms > 0 && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Bath className="h-4 w-4" /> {bathrooms}{' '}
              {bathrooms === 1 ? 'bathroom' : 'bathrooms'}
            </span>
          )}
          {property.property_type && (
            <span className="flex items-center gap-1.5 text-muted-foreground capitalize">
              <Home className="h-4 w-4" /> {property.property_type}
            </span>
          )}
        </div>
      </div>

      {/* Section navigation */}
      {visibleSections.length > 1 && (
        <div className="sticky top-[80px] z-30 mt-4 border-b border-border/40 bg-white/95 backdrop-blur-sm dark:bg-card/95">
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
            {visibleSections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      )}

      <Separator className="mx-auto max-w-6xl mt-4" />

      {/* Main content grid */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left — Detail sections */}
          <div className="space-y-8">
            {/* Overview / Description */}
            {property.description && (
              <Section id="overview" title="About this property">
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {property.description}
                </p>
              </Section>
            )}

            {/* Space / Rooms */}
            {(roomSections.length > 0 || bedrooms > 0) && (
              <Section id="space" title="Space">
                {roomSections.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {roomSections.map((section, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border/40 p-4"
                      >
                        <h3 className="text-sm font-medium">
                          {typeof section.name === 'string'
                            ? section.name
                            : `Room ${i + 1}`}
                        </h3>
                        {Array.isArray(section.beds) &&
                          section.beds.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {section.beds.map((bed, j) => (
                                <p
                                  key={j}
                                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                                >
                                  <BedDouble className="h-3.5 w-3.5" />
                                  {typeof bed.count === 'number'
                                    ? bed.count
                                    : 1}{' '}
                                  {typeof bed.type === 'string'
                                    ? bed.type.replace(/_/g, ' ')
                                    : 'bed'}
                                </p>
                              ))}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {bedrooms > 0 && (
                      <span className="flex items-center gap-1.5">
                        <BedDouble className="h-4 w-4" /> {bedrooms}{' '}
                        {bedrooms === 1 ? 'bedroom' : 'bedrooms'}
                      </span>
                    )}
                    {bathrooms > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Bath className="h-4 w-4" /> {bathrooms}{' '}
                        {bathrooms === 1 ? 'bathroom' : 'bathrooms'}
                      </span>
                    )}
                  </div>
                )}
              </Section>
            )}

            {/* Amenities */}
            {enabledAmenities.length > 0 && (
              <Section id="amenities" title="Amenities">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {enabledAmenities.map((amenity) => {
                    const Icon = AMENITY_ICONS[amenity] || ShieldCheck;
                    return (
                      <div
                        key={amenity}
                        className="flex items-center gap-2.5 rounded-lg border border-border/40 px-3 py-2.5"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm capitalize">
                          {amenity.replace(/_/g, ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Location */}
            {hasLocation && (
              <Section id="location" title="Location">
                <NfsWlLocationMap
                  lat={property.lat!}
                  lng={property.lng!}
                  address={fullAddress || undefined}
                  className="h-[300px]"
                />
              </Section>
            )}

            {/* House Rules + Check-in/out */}
            {(property.rules || property.check_in_time) && (
              <Section id="rules" title="House Rules">
                <div className="space-y-4">
                  {/* Check-in / Check-out times */}
                  {(property.check_in_time || property.check_out_time) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {property.check_in_time && (
                        <div className="flex items-center gap-3 rounded-lg border border-border/40 p-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <LogIn className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Check-in</p>
                            <p className="text-sm text-muted-foreground">
                              From {property.check_in_time}
                            </p>
                          </div>
                        </div>
                      )}
                      {property.check_out_time && (
                        <div className="flex items-center gap-3 rounded-lg border border-border/40 p-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <LogOut className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Check-out</p>
                            <p className="text-sm text-muted-foreground">
                              Before {property.check_out_time}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Minimum stay */}
                  {property.minimum_stay > 1 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Minimum stay: {property.minimum_stay} nights
                    </div>
                  )}

                  {/* Pets */}
                  {property.max_pets != null && property.max_pets > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <PawPrint className="h-4 w-4" />
                      Pets allowed (max {property.max_pets})
                    </div>
                  )}

                  {/* Rules text */}
                  {property.rules && (
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                      {property.rules}
                    </p>
                  )}
                </div>
              </Section>
            )}

            {/* Cancellation */}
            {property.cancellation_policy && (
              <Section id="cancellation" title="Cancellation Policy">
                <p className="text-sm text-muted-foreground capitalize">
                  {property.cancellation_policy}
                </p>
              </Section>
            )}

            {/* Reviews placeholder */}
            <section id="reviews" className="scroll-mt-24">
              <h2 className="mb-3 text-lg font-semibold">Reviews</h2>
              <div className="flex flex-col items-center rounded-xl border border-dashed border-border/60 py-10">
                <Star className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No reviews yet</p>
                <p className="mt-0.5 text-xs text-muted-foreground/60">
                  Be the first to book and leave a review
                </p>
              </div>
            </section>
          </div>

          {/* Right — Booking widget */}
          <div className="lg:sticky lg:top-[140px] self-start">
            <NfsBookingWidget
              property={property}
              bookingSource="white_label"
              operatorDomain={operatorDomain}
            />
          </div>
        </div>
      </div>

      {/* Related properties */}
      {relatedProperties.length > 0 && (
        <div className="border-t border-border/40 bg-muted/10">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <h2 className="mb-4 text-lg font-semibold">More properties</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProperties.map((p) => (
                <NfsWlPropertyCard
                  key={p.id}
                  property={p}
                  onClick={() => navigate(`/property/${p.id}`)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
