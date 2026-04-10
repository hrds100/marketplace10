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
  middlesbrough: [54.5742, -1.235],
  kent: [51.2787, 0.5217],
  'south wales': [51.6214, -3.9436],
  newcastle: [54.9783, -1.6178],
  sunderland: [54.9069, -1.3838],
  hull: [53.7676, -0.3274],
  stoke: [53.0027, -2.1794],
  'stoke-on-trent': [53.0027, -2.1794],
  wolverhampton: [52.587, -2.1288],
  derby: [52.9225, -1.4746],
  southampton: [50.9097, -1.4044],
  portsmouth: [50.8198, -1.088],
  plymouth: [50.3755, -4.1427],
  swansea: [51.6214, -3.9436],
  aberdeen: [57.1497, -2.0943],
  dundee: [56.462, -2.9707],
  york: [53.9591, -1.0815],
  bath: [51.3811, -2.359],
  oxford: [51.752, -1.2577],
  cambridge: [52.2053, 0.1218],
  exeter: [50.7184, -3.5339],
  norwich: [52.6309, 1.2974],
  brighton: [50.8225, -0.1372],
  reading: [51.4543, -0.9781],
  luton: [51.8787, -0.42],
  northampton: [52.2405, -0.9027],
  peterborough: [52.5695, -0.2405],
  ipswich: [52.0567, 1.1482],
  blackpool: [53.8175, -3.0357],
  preston: [53.7632, -2.7031],
  bolton: [53.5785, -2.4299],
  wigan: [53.545, -2.6325],
  huddersfield: [53.6458, -1.785],
  halifax: [53.7248, -1.8658],
  wakefield: [53.6833, -1.4977],
  doncaster: [53.5228, -1.1285],
  barnsley: [53.5529, -1.4793],
  rotherham: [53.4326, -1.3635],
  grimsby: [53.5675, -0.0803],
  scunthorpe: [53.5809, -0.6502],
  lincoln: [53.2307, -0.5406],
  worcester: [52.1936, -2.2216],
  gloucester: [51.8642, -2.2382],
  cheltenham: [51.8994, -2.0783],
  hereford: [52.0565, -2.716],
  warwick: [52.2819, -1.5849],
  newport: [51.5842, -2.9977],
  wrexham: [53.0462, -2.9927],
  inverness: [57.4778, -4.2247],
  stirling: [56.1166, -3.9369],
  stockport: [53.4106, -2.1575],
  oldham: [53.5409, -2.1114],
  rochdale: [53.6097, -2.1561],
  burnley: [53.7893, -2.2481],
  blackburn: [53.75, -2.4847],
  chester: [53.193, -2.8931],
  crewe: [53.0989, -2.4403],
  carlisle: [54.8951, -2.9382],
  darlington: [54.5234, -1.5527],
  hartlepool: [54.6863, -1.213],
  durham: [54.7761, -1.5733],
  gateshead: [54.9527, -1.6038],
  'north wales': [53.0685, -3.7322],
  'west midlands': [52.4862, -1.8904],
  'east midlands': [52.83, -1.332],
  'south yorkshire': [53.5, -1.35],
  'west yorkshire': [53.75, -1.75],
  'north yorkshire': [54.15, -1.35],
  essex: [51.7343, 0.4691],
  surrey: [51.2412, -0.5703],
  sussex: [50.92, -0.25],
  suffolk: [52.1872, 0.9708],
  norfolk: [52.614, 0.8864],
  cornwall: [50.266, -5.0527],
  devon: [50.7156, -3.5309],
  dorset: [50.7488, -2.3445],
  somerset: [51.1054, -2.9264],
  wiltshire: [51.3492, -1.9927],
  hampshire: [51.0577, -1.3081],
};

async function geocodePostcode(postcode: string, city: string): Promise<[number, number] | null> {
  const clean = postcode.replace(/\s+/g, '').toUpperCase();
  if (geocodeCache.has(clean)) return geocodeCache.get(clean)!;

  // Attempt 1: full postcode lookup
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

  // Attempt 2: outcode (district) lookup — handles SA10, ME2, TS4 etc.
  const outcode = clean.length > 3 ? clean.slice(0, -3).trim() || clean : clean;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(outcode)}`, { signal: controller.signal });
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

  // Attempt 3: city fallback
  const cityKey = city.toLowerCase().trim();
  if (cityFallbacks[cityKey]) return cityFallbacks[cityKey];
  const firstPart = cityKey.split(',')[0].trim();
  return cityFallbacks[firstPart] ?? null;
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
            `<span style="color:#888">Cash Flow</span><span style="font-weight:700;color:#059669">£${listing.profit.toLocaleString()}</span></div>` +
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
