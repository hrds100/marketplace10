import { Card, CardContent } from '@/components/ui/card';
import type { NfsProperty } from '@/lib/nfstay/types';
import { Users, BedDouble, Bath } from 'lucide-react';

interface NfsPropertyCardProps {
  property: NfsProperty;
  onClick?: () => void;
}

export default function NfsPropertyCard({ property, onClick }: NfsPropertyCardProps) {
  const coverImage = property.images?.[0]?.url ?? null;
  const title = property.public_title || 'Untitled';
  const location = [property.city, property.country].filter(Boolean).join(', ');

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      {/* Cover photo */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-sm">
            No photo
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Title */}
        <h3 className="truncate text-sm font-semibold">{title}</h3>

        {/* Location */}
        {location && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{location}</p>
        )}

        {/* Price */}
        <p className="mt-2 text-sm font-medium">
          {property.base_rate_amount != null ? (
            <>
              {property.base_rate_currency}
              {property.base_rate_amount}
              <span className="font-normal text-muted-foreground">/night</span>
            </>
          ) : (
            <span className="text-muted-foreground">Price not set</span>
          )}
        </p>

        {/* Stats row */}
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          {property.max_guests != null && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {property.max_guests}
            </span>
          )}
          {property.room_counts != null && getBedroomCount(property.room_counts) > 0 && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5" />
              {getBedroomCount(property.room_counts)}
            </span>
          )}
          {property.room_counts != null && getBathroomCount(property.room_counts) > 0 && (
            <span className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" />
              {getBathroomCount(property.room_counts)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
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

function getBedroomCount(roomCounts: unknown[]): number {
  return getRoomCount(roomCounts, 'bedroom');
}

function getBathroomCount(roomCounts: unknown[]): number {
  return getRoomCount(roomCounts, 'bathroom');
}
