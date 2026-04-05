/**
 * Pexels API — fetches property stock photos by city + type.
 * Called only when a property has no uploaded photos.
 */
const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY || '';

export async function fetchPexelsPhotos(city: string, type: string, count = 5): Promise<string[]> {
  const keyword = type.toLowerCase().includes('house') ? 'house' : 'apartment';
  const query = encodeURIComponent(`${city || 'london'} ${keyword} interior`);
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos || []).map((p: { src: { large: string } }) => p.src.large);
  } catch {
    return [];
  }
}
