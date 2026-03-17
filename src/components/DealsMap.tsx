import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from '@googlemaps/js-api-loader';
import type { ListingShape } from '@/components/InquiryPanel';

interface Props {
  listings: ListingShape[];
  hoveredId: string | null;
}

interface ResolvedCoord {
  id: string;
  lat: number;
  lng: number;
  listing: ListingShape;
}

const geocodeCache = new Map<string, [number, number]>();

const cityFallbacks: Record<string, [number, number]> = {
  london: [51.5074, -0.1278],
  manchester: [53.4808, -2.2426],
  birmingham: [52.4862, -1.8904],
  leeds: [53.8008, -1.5491],
  liverpool: [53.4084, -2.9916],
  sheffield: [53.3811, -1.4701],
  bristol: [51.4545, -2.5879],
  edinburgh: [55.9533, -3.1883],
  glasgow: [55.8642, -4.2518],
  nottingham: [52.9548, -1.1581],
  cardiff: [51.4816, -3.1791],
  leicester: [52.6369, -1.1398],
  coventry: [52.4081, -1.5106],
  bradford: [53.795, -1.7594],
  belfast: [54.5973, -5.9301],
};

async function geocodePostcode(postcode: string, city: string): Promise<[number, number] | null> {
  const clean = postcode.replace(/\s+/g, '').toUpperCase();
  if (geocodeCache.has(clean)) return geocodeCache.get(clean)!;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    if (data.status === 200 && data.result) {
      const coords: [number, number] = [data.result.latitude, data.result.longitude];
      geocodeCache.set(clean, coords);
      return coords;
    }
  } catch {
    // fall through to city fallback
  }
  const cityKey = city.toLowerCase().trim();
  return cityFallbacks[cityKey] ?? null;
}

let loaderPromise: Promise<typeof google> | null = null;

function getGoogleMaps(): Promise<typeof google> {
  if (loaderPromise) return loaderPromise;
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY not set'));
  }
  const loader = new Loader({ apiKey, version: 'weekly' });
  loaderPromise = loader.load();
  return loaderPromise;
}

export default function DealsMap({ listings, hoveredId }: Props) {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [coords, setCoords] = useState<ResolvedCoord[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMarkerIcon = useCallback((isHovered: boolean): google.maps.Symbol | undefined => {
    if (typeof google === 'undefined') return undefined;
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: isHovered ? 10 : 7,
      fillColor: isHovered ? '#059669' : '#00D084',
      fillOpacity: 1,
      strokeColor: 'white',
      strokeWeight: 2.5,
    };
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    let cancelled = false;
    getGoogleMaps()
      .then((g) => {
        if (cancelled || !mapRef.current) return;
        const map = new g.maps.Map(mapRef.current, {
          center: { lat: 52.5, lng: -1.5 },
          zoom: 6,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
        });
        googleMapRef.current = map;
        infoWindowRef.current = new g.maps.InfoWindow();
        setMapReady(true);
      })
      .catch(() => {
        if (!cancelled) setError('Map could not load');
      });
    return () => { cancelled = true; };
  }, []);

  // Geocode listings
  useEffect(() => {
    if (!listings.length) { setCoords([]); return; }
    let cancelled = false;
    const resolve = async () => {
      const results: ResolvedCoord[] = [];
      for (const l of listings) {
        const c = await geocodePostcode(l.postcode ?? '', l.city ?? '');
        if (c && !cancelled) {
          results.push({ id: l.id, lat: c[0], lng: c[1], listing: l });
        }
      }
      if (!cancelled) setCoords(results);
    };
    resolve();
    return () => { cancelled = true; };
  }, [listings]);

  // Navigate handler for info window button
  const handleNavigate = useCallback((id: string) => {
    navigate(`/deals/${id}`);
  }, [navigate]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__nfstayNav = (id: string) => handleNavigate(id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => { delete (window as any).__nfstayNav; };
  }, [handleNavigate]);

  // Create/update markers
  useEffect(() => {
    if (!mapReady || !googleMapRef.current) return;
    const map = googleMapRef.current;
    const existingMarkers = markersRef.current;

    // Remove markers for listings no longer present
    const currentIds = new Set(coords.map(c => c.id));
    existingMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        existingMarkers.delete(id);
      }
    });

    // Add/update markers
    coords.forEach(({ id, lat, lng, listing }) => {
      const isHovered = hoveredId === id;
      let marker = existingMarkers.get(id);

      if (!marker) {
        marker = new google.maps.Marker({
          map,
          position: { lat, lng },
          icon: createMarkerIcon(isHovered),
          zIndex: isHovered ? 999 : 1,
        });

        marker.addListener('click', () => {
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(`
              <div style="font-family:system-ui,sans-serif;min-width:180px;padding:4px;">
                <p style="font-weight:600;font-size:13px;margin:0 0 4px;">${listing.name}</p>
                <p style="color:#888;font-size:12px;margin:0 0 8px;">${listing.city} · ${listing.postcode}</p>
                <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-top:1px solid #eee;">
                  <span style="color:#888;">Rent</span>
                  <span style="font-weight:500;">£${listing.rent.toLocaleString()}/mo</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;">
                  <span style="color:#888;">Profit</span>
                  <span style="font-weight:700;color:#059669;">£${listing.profit.toLocaleString()}</span>
                </div>
                <button onclick="window.__nfstayNav('${id}')" style="margin-top:8px;width:100%;padding:6px;background:#059669;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
                  View Deal
                </button>
              </div>
            `);
            infoWindowRef.current.open(map, marker);
          }
        });

        existingMarkers.set(id, marker);
      } else {
        marker.setPosition({ lat, lng });
        marker.setIcon(createMarkerIcon(isHovered));
        marker.setZIndex(isHovered ? 999 : 1);
      }
    });

    // Fit bounds
    if (coords.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      coords.forEach(c => bounds.extend({ lat: c.lat, lng: c.lng }));
      if (coords.length === 1) {
        map.setCenter({ lat: coords[0].lat, lng: coords[0].lng });
        map.setZoom(13);
      } else {
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      }
    }
  }, [coords, hoveredId, mapReady]);

  // Update marker icons on hover change only
  useEffect(() => {
    if (!mapReady) return;
    markersRef.current.forEach((marker, id) => {
      const isHovered = hoveredId === id;
      marker.setIcon(createMarkerIcon(isHovered));
      marker.setZIndex(isHovered ? 999 : 1);
    });
  }, [hoveredId, mapReady]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />;
}
