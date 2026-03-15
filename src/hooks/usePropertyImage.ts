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
  index = 0
): string {
  const [src, setSrc] = useState(() => getPropertyImageSync(photos, city, index));

  useEffect(() => {
    if (photos && photos[index]) return;
    if (photos && photos.length > 0) { setSrc(photos[0]); return; }
    resolvePropertyImage(propertyId, photos, city, type, index).then(setSrc);
  }, [propertyId, city, type, index]);

  return src;
}
