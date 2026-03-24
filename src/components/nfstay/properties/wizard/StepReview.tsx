import { Button } from '@/components/ui/button';
import type { NfsProperty } from '@/lib/nfstay/types';
import { NFS_AMENITY_CATEGORIES } from '@/lib/nfstay/constants';

interface Props {
  property: NfsProperty;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

interface RoomCount {
  type: string;
  count: number;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? <span className="text-muted-foreground italic">Not set</span>}</span>
    </div>
  );
}

function formatRentalType(t: string | null): string {
  if (!t) return '';
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getActiveAmenities(amenities: Record<string, boolean>): string[] {
  const allAmenities = Object.values(NFS_AMENITY_CATEGORIES).flat();
  return allAmenities.filter((a) => amenities[a]);
}

function formatAmenityLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StepReview({ property, onSave, saving }: Props) {
  const roomCounts = Array.isArray(property.room_counts)
    ? (property.room_counts as RoomCount[])
    : [];
  const activeAmenities = getActiveAmenities(property.amenities ?? {});

  const handleSaveDraft = () => {
    onSave({ status: 'completed', listing_status: 'draft' });
  };

  const handlePublish = () => {
    onSave({ status: 'completed', listing_status: 'listed' });
  };

  return (
    <div data-feature="BOOKING_NFSTAY__PROPERTY_WIZARD" className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Review &amp; publish</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Check everything looks good before publishing your listing.
        </p>
      </div>

      <div className="divide-y rounded-md border">
        <div className="p-4">
          <Section title="Basics">
            <Field label="Property type" value={property.property_type} />
            <Field label="Rental type" value={formatRentalType(property.rental_type)} />
            <Field label="Accommodation type" value={property.accommodation_type} />
            <Field
              label="Size"
              value={
                property.size_value
                  ? `${property.size_value} ${property.size_unit ?? ''}`
                  : null
              }
            />
          </Section>
        </div>

        <div className="p-4">
          <Section title="Location">
            <Field label="Address" value={property.address} />
            <Field
              label="City / State"
              value={[property.city, property.state].filter(Boolean).join(', ') || null}
            />
            <Field label="Country" value={property.country} />
            <Field label="Postal code" value={property.postal_code} />
          </Section>
        </div>

        <div className="p-4">
          <Section title="Guests & Rooms">
            <Field label="Max guests" value={property.max_guests} />
            <Field label="Children allowed" value={property.allow_children ? 'Yes' : 'No'} />
            {roomCounts.map((rc) => (
              <Field
                key={rc.type}
                label={rc.type.charAt(0).toUpperCase() + rc.type.slice(1) + 's'}
                value={rc.count}
              />
            ))}
          </Section>
        </div>

        <div className="p-4">
          <Section title="Photos">
            <Field label="Photos uploaded" value={property.images?.length ?? 0} />
          </Section>
        </div>

        <div className="p-4">
          <Section title="Amenities">
            {activeAmenities.length > 0 ? (
              <p>{activeAmenities.map(formatAmenityLabel).join(', ')}</p>
            ) : (
              <p className="text-muted-foreground italic">None selected</p>
            )}
          </Section>
        </div>

        <div className="p-4">
          <Section title="Description">
            <Field label="Title" value={property.public_title} />
            <Field label="Internal name" value={property.internal_title} />
            {property.description && (
              <p className="mt-1 text-sm line-clamp-3">{property.description}</p>
            )}
          </Section>
        </div>

        <div className="p-4">
          <Section title="House Rules">
            <Field label="Check-in" value={property.check_in_time} />
            <Field label="Check-out" value={property.check_out_time} />
            <Field
              label="Pets"
              value={
                property.max_pets === 0 || property.max_pets === null
                  ? 'Not allowed'
                  : `Up to ${property.max_pets}`
              }
            />
            <Field label="Cancellation" value={property.cancellation_policy} />
          </Section>
        </div>

        <div className="p-4">
          <Section title="Availability">
            <Field
              label="Window"
              value={property.availability_window?.replace(/_/g, ' ')}
            />
            <Field label="Advance notice" value={`${property.advance_notice} days`} />
            <Field label="Minimum stay" value={`${property.minimum_stay} nights`} />
          </Section>
        </div>

        <div className="p-4">
          <Section title="Pricing">
            <Field
              label="Nightly rate"
              value={`${property.base_rate_currency} ${property.base_rate_amount}`}
            />
            {property.cleaning_fee?.enabled && (
              <Field label="Cleaning fee" value={property.cleaning_fee.amount} />
            )}
            {property.extra_guest_fee?.enabled && (
              <Field
                label="Extra guest fee"
                value={`${property.extra_guest_fee.amount} after ${property.extra_guest_fee.after_guests} guests`}
              />
            )}
            {property.weekly_discount?.enabled && (
              <Field label="Weekly discount" value={`${property.weekly_discount.percentage}%`} />
            )}
            {property.monthly_discount?.enabled && (
              <Field label="Monthly discount" value={`${property.monthly_discount.percentage}%`} />
            )}
          </Section>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={handleSaveDraft}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save as draft'}
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={handlePublish}
          disabled={saving}
        >
          {saving ? 'Publishing...' : 'Publish'}
        </Button>
      </div>
    </div>
  );
}
