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

  // Sync markers
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
      const hovered = hoveredId === id;
      const icon: google.maps.Symbol = {
        path: g.SymbolPath.CIRCLE,
        scale: hovered ? 10 : 7,
        fillColor: hovered ? '#059669' : '#00D084',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2.5,
      };

      let marker = existing.get(id);
      if (!marker) {
        marker = new g.Marker({ map, position: { lat, lng }, icon, zIndex: hovered ? 999 : 1 });
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
        // Navigate on double-click instead of window hack
        marker.addListener('dblclick', () => onNav(id));
        existing.set(id, marker);
      } else {
        marker.setPosition({ lat, lng });
        marker.setIcon(icon);
        marker.setZIndex(hovered ? 999 : 1);
      }
    });

    // Fit bounds
    if (coords.length > 0) {
      const bounds = new g.LatLngBounds();
      coords.forEach(c => bounds.extend({ lat: c.lat, lng: c.lng }));
      if (coords.length === 1) {
        map.setCenter(coords[0]);
        map.setZoom(13);
      } else {
        map.fitBounds(bounds, 40);
      }
    }
  }, [coords, hoveredId, ready, onNav]);

  // Hover — highlight marker + pan/zoom to it
  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !window.google?.maps) return;
    const map = mapInstanceRef.current;
    const g = window.google.maps;

    markersRef.current.forEach((marker, id) => {
      const hovered = hoveredId === id;
      marker.setIcon({
        path: g.SymbolPath.CIRCLE,
        scale: hovered ? 10 : 7,
        fillColor: hovered ? '#059669' : '#00D084',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2.5,
      });
      marker.setZIndex(hovered ? 999 : 1);

      if (hovered) {
        const pos = marker.getPosition();
        if (pos) {
          map.panTo(pos);
          // Smooth animated zoom — step by step
          const target = 13;
          const current = map.getZoom() ?? 6;
          if (current < target) {
            let step = current;
            const interval = setInterval(() => {
              step += 1;
              map.setZoom(step);
              if (step >= target) clearInterval(interval);
            }, 120);
          }
        }
      }
    });

    // Smooth zoom back out when hover ends
    if (!hoveredId && coords.length > 1) {
      const current = map.getZoom() ?? 13;
      const bounds = new g.LatLngBounds();
      coords.forEach(c => bounds.extend({ lat: c.lat, lng: c.lng }));
      if (current > 8) {
        let step = current;
        const interval = setInterval(() => {
          step -= 1;
          map.setZoom(step);
          if (step <= 8) {
            clearInterval(interval);
            map.fitBounds(bounds, 40);
          }
        }, 80);
      } else {
        map.fitBounds(bounds, 40);
      }
    }
  }, [hoveredId, ready, coords]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <p className="text-sm text-muted-foreground">Map could not load</p>
      </div>
    );
  }

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
}
