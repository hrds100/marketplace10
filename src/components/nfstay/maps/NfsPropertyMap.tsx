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

    loader
      .importLibrary('maps')
      .then((mapsLib) => {
        if (cancelled || !mapRef.current) return;

        const position = { lat, lng };

        const map = new mapsLib.Map(mapRef.current, {
          center: position,
          zoom: 15,
          mapId: 'nfs-property-map',
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
        });

        new google.maps.marker.AdvancedMarkerElement({
          position,
          map,
          title: title ?? undefined,
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, title]);

  if (!API_KEY || error) {
    return (
      <div className="flex h-[250px] w-full items-center justify-center rounded-lg border bg-muted text-muted-foreground">
        Map unavailable — configure VITE_GOOGLE_MAPS_API_KEY
      </div>
    );
  }

  return <div ref={mapRef} className="h-[250px] w-full rounded-lg" />;
}
