import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    if (data.status === 200 && data.result) {
      const coords: [number, number] = [data.result.latitude, data.result.longitude];
      geocodeCache.set(clean, coords);
      return coords;
    }
  } catch {
    // fall through
  }
  const cityKey = city.toLowerCase().trim();
  return cityFallbacks[cityKey] ?? null;
}

// Load Google Maps script once
let scriptLoaded = false;
let scriptPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (scriptLoaded && window.google?.maps) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return Promise.reject(new Error('No API key'));

  scriptPromise = new Promise<void>((resolve, reject) => {
    // Check if already loaded by another script
    if (window.google?.maps) {
      scriptLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => { scriptLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function DealsMap({ listings, hoveredId }: Props) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [coords, setCoords] = useState<ResolvedCoord[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const initialBoundsSetRef = useRef(false);

  // Load script + init map
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.maps) return;
        const map = new window.google.maps.Map(containerRef.current, {
          center: { lat: 52.5, lng: -1.5 },
          zoom: 6,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
        });
        mapInstanceRef.current = map;
        infoRef.current = new window.google.maps.InfoWindow();
        setReady(true);
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  // Geocode
  useEffect(() => {
    if (!listings.length) { setCoords([]); return; }
    let cancelled = false;
    (async () => {
      const results: ResolvedCoord[] = [];
      for (const l of listings) {
        const c = await geocodePostcode(l.postcode ?? '', l.city ?? '');
        if (c && !cancelled) results.push({ id: l.id, lat: c[0], lng: c[1], listing: l });
      }
      if (!cancelled) setCoords(results);
    })();
    return () => { cancelled = true; };
  }, [listings]);

  // Click handler
  const onNav = useCallback((id: string) => navigate(`/deals/${id}`), [navigate]);

  // Sync markers — only when coords change (NOT on hover)
  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const existing = markersRef.current;
    const g = window.google.maps;

    // Remove stale
    const ids = new Set(coords.map(c => c.id));
    existing.forEach((m, id) => { if (!ids.has(id)) { m.setMap(null); existing.delete(id); } });

    // Upsert
    coords.forEach(({ id, lat, lng, listing }) => {
      let marker = existing.get(id);
      if (!marker) {
        const icon: google.maps.Symbol = {
          path: g.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#00D084',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2.5,
        };
        marker = new g.Marker({ map, position: { lat, lng }, icon, zIndex: 1 });
        marker.addListener('click', () => {
          if (!infoRef.current) return;
          infoRef.current.setContent(
            `<div style="font-family:system-ui;min-width:180px;padding:4px">` +
            `<p style="font-weight:600;font-size:13px;margin:0 0 4px">${listing.name}</p>` +
            `<p style="color:#888;font-size:12px;margin:0 0 8px">${listing.city} · ${listing.postcode}</p>` +
            `<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-top:1px solid #eee">` +
            `<span style="color:#888">Rent</span><span style="font-weight:500">£${listing.rent.toLocaleString()}/mo</span></div>` +
            `<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0">` +
            `<span style="color:#888">Profit</span><span style="font-weight:700;color:#059669">£${listing.profit.toLocaleString()}</span></div>` +
            `</div>`
          );
          infoRef.current.open(map, marker);
        });
        marker.addListener('dblclick', () => onNav(id));
        existing.set(id, marker);
      } else {
        marker.setPosition({ lat, lng });
      }
    });

    // Fit bounds only on first load
    if (coords.length > 0 && !initialBoundsSetRef.current) {
      const bounds = new g.LatLngBounds();
      coords.forEach(c => bounds.extend({ lat: c.lat, lng: c.lng }));
      if (coords.length === 1) {
        map.setCenter(coords[0]);
        map.setZoom(13);
      } else {
        map.fitBounds(bounds, 40);
      }
      initialBoundsSetRef.current = true;
    }
  }, [coords, ready, onNav]);

  // Hover — smooth pan/zoom to property, stay when mouse leaves
  const zoomIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !window.google?.maps) return;
    const map = mapInstanceRef.current;
    const g = window.google.maps;

    // Clear any running zoom animation
    if (zoomIntervalRef.current) {
      clearInterval(zoomIntervalRef.current);
      zoomIntervalRef.current = null;
    }

    // Update all marker icons
    markersRef.current.forEach((marker, id) => {
      const hovered = hoveredId === id;
      marker.setIcon({
        path: g.SymbolPath.CIRCLE,
        scale: hovered ? 11 : 7,
        fillColor: hovered ? '#059669' : '#00D084',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: hovered ? 3 : 2.5,
      });
      marker.setZIndex(hovered ? 999 : 1);

      // Pan + zoom to hovered marker
      if (hovered) {
        const pos = marker.getPosition();
        if (pos) {
          // Always pan to the property
          map.panTo(pos);
          // Zoom in if not already close enough
          const current = map.getZoom() ?? 6;
          const target = 14;
          if (current < target - 1) {
            // Zoom in smoothly
            let step = current;
            zoomIntervalRef.current = setInterval(() => {
              step += 0.5;
              map.setZoom(step);
              if (step >= target) {
                if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current);
                zoomIntervalRef.current = null;
              }
            }, 80);
          } else if (current < target) {
            // Almost there — just set it
            map.setZoom(target);
          }
          // If already at target zoom, panTo is enough
        }
      }
    });

    // When hoveredId is null (mouse left card) — do nothing.
    // Map stays exactly where it is, showing the last property.
  }, [hoveredId, ready]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <p className="text-sm text-muted-foreground">Map could not load</p>
      </div>
    );
  }

  return <div data-feature="DEALS__DEALS_MAP" ref={containerRef} style={{ height: '100%', width: '100%', borderRadius: '16px', overflow: 'hidden' }} />;
}
