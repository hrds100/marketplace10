/**
 * Single source of truth for property image resolution.
 * Sync version for immediate render, async version for Pexels fetch + DB cache.
 */
import { fetchPexelsPhotos } from './pexels';
import { supabase } from '@/integrations/supabase/client';

/** Placeholder — deterministic, never broken */
function placeholder(city: string, index = 0): string {
  return `https://placehold.co/800x520/1a1a2e/ffffff?text=${encodeURIComponent(city || 'Property')}${index > 0 ? `-${index}` : ''}`;
}

/** Synchronous — returns photo or placeholder. Use for initial render. */
export function getPropertyImageSync(photos: string[] | null | undefined, city: string, index = 0): string {
  if (photos && photos[index]) return photos[index];
  if (photos && photos.length > 0) return photos[0];
  return placeholder(city, index);
}

/** Async — fetches from Pexels if needed, caches to Supabase. */
export async function resolvePropertyImage(
  propertyId: string,
  photos: string[] | null | undefined,
  city: string,
  type: string,
  index = 0
): Promise<string> {
  if (photos && photos[index]) return photos[index];
  if (photos && photos.length > 0) return photos[0];

  const fetched = await fetchPexelsPhotos(city, type, 5);
  if (fetched.length > 0) {
    // Cache to DB so Pexels is never called again for this property
    if (propertyId && !propertyId.startsWith('crm-')) {
      (supabase.from('properties') as any)
        .update({ photos: fetched })
        .eq('id', propertyId)
        .then(() => {});
    }
    return fetched[index] || fetched[0];
  }

  return placeholder(city, index);
}
