// Airbnb-style property card
// - Square image with hover scale
// - Dot indicators for multiple photos
// - Heart favourite button (UI only)
// - Title, location, price/night, star rating
import { useState } from 'react';
import type { NfsProperty } from '@/lib/nfstay/types';
import { Heart, Star } from 'lucide-react';

interface NfsPropertyCardProps {
  property: NfsProperty;
  onClick?: () => void;
}

export default function NfsPropertyCard({ property, onClick }: NfsPropertyCardProps) {
  const images = property.images ?? [];
  const [imgIndex, setImgIndex] = useState(0);
  const [hearted, setHearted] = useState(false);

  const coverImage = images.length > 0 ? images[imgIndex]?.url : null;
  const title = property.public_title || 'Untitled';
  const location = [property.city, property.country].filter(Boolean).join(', ');
  const roomCounts = Array.isArray(property.room_counts)
    ? (property.room_counts as { type: string; count: number }[])
    : [];
  const bedrooms = roomCounts.find(r => r.type === 'bedroom')?.count ?? 0;

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex(i => (i - 1 + images.length) % images.length);
  };
  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex(i => (i + 1) % images.length);
  };

  return (
    <div
      className="group cursor-pointer"
      onClick={onClick}
    >
      {/* Image container */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-3">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
            No photo
          </div>
        )}

        {/* Heart button */}
        <button
          className="absolute top-3 right-3 z-10"
          onClick={(e) => { e.stopPropagation(); setHearted(h => !h); }}
          aria-label="Save"
        >
          <Heart
            className={`w-5 h-5 drop-shadow transition-colors ${hearted ? 'fill-[#E61E4D] stroke-[#E61E4D]' : 'fill-black/20 stroke-white'}`}
          />
        </button>

        {/* Prev / Next arrows (show on hover, multiple images only) */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImg}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-700 hover:scale-105 text-lg"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              onClick={nextImg}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-700 hover:scale-105 text-lg"
              aria-label="Next photo"
            >
              ›
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1">
              {images.slice(0, 5).map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? 'bg-white scale-125' : 'bg-white/60'}`}
                />
              ))}
              {images.length > 5 && (
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              )}
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="space-y-0.5 px-0.5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{title}</p>
          {/* Placeholder rating — swap with real data when available */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Star className="w-3.5 h-3.5 fill-gray-900 stroke-none" />
            <span className="text-xs font-medium text-gray-900">New</span>
          </div>
        </div>

        {/* Location */}
        {location && (
          <p className="text-sm text-gray-500 truncate">{location}</p>
        )}

        {/* Bedrooms */}
        {bedrooms > 0 && (
          <p className="text-sm text-gray-500">{bedrooms} bedroom{bedrooms !== 1 ? 's' : ''}</p>
        )}

        {/* Price */}
        <p className="text-sm text-gray-900 mt-1">
          {property.base_rate_amount != null ? (
            <>
              <span className="font-semibold">
                {property.base_rate_currency} {property.base_rate_amount.toFixed(0)}
              </span>
              <span className="font-normal text-gray-600"> / night</span>
            </>
          ) : (
            <span className="text-gray-400">Price on request</span>
          )}
        </p>
      </div>
    </div>
  );
}
