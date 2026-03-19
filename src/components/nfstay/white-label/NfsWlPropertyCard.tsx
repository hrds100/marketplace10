import { Home, Users, BedDouble, Bath, ImageIcon } from 'lucide-react';
import type { NfsProperty } from '@/lib/nfstay/types';

interface NfsWlPropertyCardProps {
  property: NfsProperty;
  onClick: () => void;
  isHighlighted?: boolean;
}

function getCurrencySymbol(code: string): string {
  const symbols: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', AUD: 'A$', CAD: 'C$' };
  return symbols[code] || code + ' ';
}

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

function isNewProperty(createdAt: string): boolean {
  const created = new Date(createdAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return created > thirtyDaysAgo;
}

export default function NfsWlPropertyCard({
  property,
  onClick,
  isHighlighted = false,
}: NfsWlPropertyCardProps) {
  const coverImage = property.images?.[0]?.url ?? null;
  const imageCount = property.images?.length ?? 0;
  const title = property.public_title || 'Untitled';
  const location = [property.city, property.country].filter(Boolean).join(', ');
  const bedrooms = getRoomCount(property.room_counts, 'bedroom');
  const bathrooms = getRoomCount(property.room_counts, 'bathroom');
  const isNew = isNewProperty(property.created_at);

  return (
    <div
      className={`cursor-pointer rounded-xl transition-shadow duration-200 hover:shadow-md ${
        isHighlighted ? 'ring-2 ring-primary shadow-md' : ''
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Home className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}

        {/* Image count badge */}
        {imageCount > 1 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            <ImageIcon className="h-3 w-3" />
            {imageCount}
          </span>
        )}

        {/* New badge */}
        {isNew && (
          <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-xs font-medium shadow-sm">
            New
          </span>
        )}
      </div>

      {/* Content */}
      <div className="space-y-1 pt-3">
        <h3 className="truncate text-sm font-semibold">{title}</h3>

        {location && (
          <p className="truncate text-xs text-muted-foreground">{location}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {property.max_guests != null && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {property.max_guests}
            </span>
          )}
          {bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5" />
              {bedrooms}
            </span>
          )}
          {bathrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" />
              {bathrooms}
            </span>
          )}
        </div>

        {/* Price */}
        <p className="mt-1 text-sm font-semibold">
          {property.base_rate_amount != null ? (
            <>
              {getCurrencySymbol(property.base_rate_currency)}
              {property.base_rate_amount}
              <span className="font-normal text-muted-foreground"> / night</span>
            </>
          ) : (
            <span className="text-muted-foreground">Price on request</span>
          )}
        </p>
      </div>
    </div>
  );
}
