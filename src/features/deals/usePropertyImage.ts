import { useState, useEffect } from 'react';
import { resolvePropertyImage, getPropertyImageSync } from '@/lib/propertyImage';

/**
 * Hook: returns best available image URL for a property.
 * Renders placeholder immediately, resolves Pexels in background if needed.
 */
export function usePropertyImage(
  propertyId: string,
  photos: string[] | null | undefined,
  city: string,
  type: string,
  index = 0,
  skipPexelsFallback = false,
): string {
  const [src, setSrc] = useState(() => getPropertyImageSync(photos, city, index));

  useEffect(() => {
    // If a real photo exists, use it immediately (no Pexels fetch)
    if (photos && photos[index]) { setSrc(photos[index]); return; }
    if (photos && photos.length > 0) { setSrc(photos[0]); return; }
    // Skip Pexels for prime/investment cards — their images load from inv_properties via React Query
    if (skipPexelsFallback) return;
    resolvePropertyImage(propertyId, photos, city, type, index).then(setSrc);
  }, [propertyId, photos, city, type, index, skipPexelsFallback]);

  return src;
}
