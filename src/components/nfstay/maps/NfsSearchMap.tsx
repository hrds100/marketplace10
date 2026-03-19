import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { NfsProperty } from '@/lib/nfstay/types';

interface NfsSearchMapProps {
  properties: NfsProperty[];
  onPropertyClick?: (id: string) => void;
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export default function NfsSearchMap({ properties, onPropertyClick }: NfsSearchMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!API_KEY) {
      setError(true);
      return;
    }

    const loader = new Loader({
      apiKey: API_KEY,
      version: 'weekly',
      libraries: ['marker'],
    });

    let cancelled = false;

    loader
      .importLibrary('maps')
      .then((mapsLib) => {
        if (cancelled || !mapRef.current) return;

        const map = new mapsLib.Map(mapRef.current, {
          center: { lat: 51.5074, lng: -0.1278 },
          zoom: 6,
          mapId: 'nfs-search-map',
        });

        mapInstanceRef.current = map;
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || error) return;

    // Clear previous markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }

    const geoProperties = properties.filter(
      (p): p is NfsProperty & { lat: number; lng: number } =>
        p.lat != null && p.lng != null,
    );

    if (geoProperties.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

    for (const property of geoProperties) {
      const position = { lat: property.lat, lng: property.lng };
      bounds.extend(position);

      const priceLabel = document.createElement('div');
      priceLabel.className =
        'bg-white text-black text-xs font-semibold px-2 py-1 rounded shadow border';
      priceLabel.textContent = property.base_rate_amount
        ? `${property.base_rate_currency ?? ''}${property.base_rate_amount}`
        : 'N/A';

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position,
        map,
        content: priceLabel,
        title: property.public_title ?? property.internal_title ?? undefined,
      });

      marker.addListener('click', () => {
        onPropertyClick?.(property.id);
      });

      newMarkers.push(marker);
    }

    markersRef.current = newMarkers;
    clustererRef.current = new MarkerClusterer({ map, markers: newMarkers });

    map.fitBounds(bounds);
    if (geoProperties.length === 1) {
      map.setZoom(14);
    }
  }, [properties, error, onPropertyClick]);

  if (!API_KEY || error) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-lg border bg-muted text-muted-foreground">
        Map unavailable — configure VITE_GOOGLE_MAPS_API_KEY
      </div>
    );
  }

  return <div ref={mapRef} className="h-[400px] w-full rounded-lg" />;
}
