import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import type { ListingShape } from '@/components/InquiryPanel';
import 'leaflet/dist/leaflet.css';

interface Props {
  listings: ListingShape[];
  hoveredId: string | null;
}

interface Coords {
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
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`);
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

export default function DealsMap({ listings, hoveredId }: Props) {
  const navigate = useNavigate();
  const [coords, setCoords] = useState<Coords[]>([]);

  useEffect(() => {
    if (!listings.length) return;
    let cancelled = false;
    const resolve = async () => {
      const results: Coords[] = [];
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

  const centre: [number, number] = coords.length > 0
    ? [
        coords.reduce((s, c) => s + c.lat, 0) / coords.length,
        coords.reduce((s, c) => s + c.lng, 0) / coords.length,
      ]
    : [52.5, -1.5];

  return (
    <MapContainer
      center={centre}
      zoom={coords.length > 1 ? 6 : 12}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
      />
      {coords.map(({ id, lat, lng, listing }) => {
        const isHovered = hoveredId === id;
        return (
          <CircleMarker
            key={id}
            center={[lat, lng]}
            radius={isHovered ? 12 : 8}
            pathOptions={{
              fillColor: isHovered ? '#059669' : '#00D084',
              color: 'white',
              weight: 2,
              fillOpacity: 1,
            }}
            eventHandlers={{
              click: () => navigate(`/deals/${id}`),
            }}
          >
            <Popup>
              <div className="text-xs min-w-[180px]">
                <p className="font-semibold text-sm mb-1">{listing.name}</p>
                <p className="text-muted-foreground mb-2">{listing.city} · {listing.postcode}</p>
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">Rent</span>
                  <span className="font-medium">£{listing.rent.toLocaleString()}/mo</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">Profit</span>
                  <span className="font-bold text-emerald-600">£{listing.profit.toLocaleString()}</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
