// nfstay Property Map — Google Maps with graceful marker fallback
// Uses AdvancedMarkerElement when available, falls back to classic Marker
import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface NfsPropertyMapProps {
  lat: number;
  lng: number;
  title?: string;
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export default function NfsPropertyMap({ lat, lng, title }: NfsPropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
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

    const init = async () => {
      try {
        const mapsLib = await loader.importLibrary('maps');
        if (cancelled || !mapRef.current) return;

        const position = { lat, lng };

        const map = new mapsLib.Map(mapRef.current, {
          center: position,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
        });

        // Try AdvancedMarkerElement (requires mapId + vector rendering)
        // Fall back to classic Marker if it fails
        try {
          const markerLib = await loader.importLibrary('marker');
          if (!cancelled) {
            new (markerLib as any).AdvancedMarkerElement({
              position,
              map,
              title: title ?? undefined,
            });
          }
        } catch {
          // Classic marker — always works
          if (!cancelled) {
            new google.maps.Marker({ position, map, title: title ?? undefined });
          }
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [lat, lng, title]);

  if (!API_KEY || error) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
        Map unavailable
      </div>
    );
  }

  return <div data-feature="BOOKING_NFSTAY__MAPS" ref={mapRef} className="h-full w-full rounded-lg" />;
}
