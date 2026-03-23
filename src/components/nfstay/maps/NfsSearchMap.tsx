// nfstay Search Map — Google Maps with price-label markers
// Falls back to classic Marker if AdvancedMarkerElement isn't available
import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import type { NfsProperty } from '@/lib/nfstay/types';

interface NfsSearchMapProps {
  properties: NfsProperty[];
  onPropertyClick?: (id: string) => void;
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export default function NfsSearchMap({ properties, onPropertyClick }: NfsSearchMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<(google.maps.marker.AdvancedMarkerElement | google.maps.Marker)[]>([]);
  const [error, setError] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Initialise map once
  useEffect(() => {
    if (!API_KEY) { setError(true); return; }
    let cancelled = false;

    const loader = new Loader({ apiKey: API_KEY, version: 'weekly', libraries: ['marker'] });

    loader.importLibrary('maps').then((mapsLib) => {
      if (cancelled || !mapRef.current) return;
      const map = new mapsLib.Map(mapRef.current, {
        center: { lat: 25, lng: 15 },
        zoom: 2,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
      });
      mapInstanceRef.current = map;
      setMapReady(true);
    }).catch(() => { if (!cancelled) setError(true); });

    return () => { cancelled = true; };
  }, []);

  // Add / update markers whenever properties change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || error) return;

    // Clear existing markers
    markersRef.current.forEach((m) => {
      if ('map' in m) m.map = null;
      else (m as google.maps.Marker).setMap(null);
    });
    markersRef.current = [];

    const geo = properties.filter((p): p is NfsProperty & { lat: number; lng: number } =>
      p.lat != null && p.lng != null
    );
    if (geo.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    const addMarkers = async () => {
      let useAdvanced = false;
      try {
        const loader = new Loader({ apiKey: API_KEY!, version: 'weekly', libraries: ['marker'] });
        const markerLib = await loader.importLibrary('marker') as any;
        if (markerLib?.AdvancedMarkerElement) useAdvanced = true;

        for (const property of geo) {
          const pos = { lat: property.lat, lng: property.lng };
          bounds.extend(pos);

          const label = `${property.base_rate_currency ?? ''}${property.base_rate_amount ?? '?'}`;

          if (useAdvanced) {
            const el = document.createElement('div');
            el.className = 'bg-white text-gray-900 text-xs font-bold px-2.5 py-1.5 rounded-full shadow-md border border-gray-200 cursor-pointer hover:bg-gray-900 hover:text-white transition-colors whitespace-nowrap';
            el.textContent = label;

            const marker = new markerLib.AdvancedMarkerElement({ position: pos, map, content: el, title: property.public_title ?? '' });
            marker.addListener('click', () => onPropertyClick?.(property.id));
            markersRef.current.push(marker);
          } else {
            const marker = new google.maps.Marker({
              position: pos, map,
              label: { text: label, color: '#111', fontSize: '11px', fontWeight: 'bold' },
              title: property.public_title ?? '',
            });
            marker.addListener('click', () => onPropertyClick?.(property.id));
            markersRef.current.push(marker);
          }
        }
      } catch {
        // Fallback: plain markers
        for (const property of geo) {
          const pos = { lat: property.lat, lng: property.lng };
          bounds.extend(pos);
          const marker = new google.maps.Marker({ position: pos, map, title: property.public_title ?? '' });
          marker.addListener('click', () => onPropertyClick?.(property.id));
          markersRef.current.push(marker);
        }
      }

      map.fitBounds(bounds);
      if (geo.length === 1) map.setZoom(14);
    };

    addMarkers();
  }, [properties, mapReady, error, onPropertyClick]);

  if (!API_KEY || error) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
        Map unavailable
      </div>
    );
  }

  return <div ref={mapRef} className="h-full w-full rounded-2xl" />;
}
