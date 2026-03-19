import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { useNfsGoogleMaps } from '@/hooks/nfstay/use-nfs-google-maps';

interface NfsWlLocationMapProps {
  lat: number;
  lng: number;
  address?: string;
  className?: string;
}

export default function NfsWlLocationMap({
  lat,
  lng,
  address,
  className = '',
}: NfsWlLocationMapProps) {
  const { isLoaded, loadError } = useNfsGoogleMaps();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    // Only create once
    if (mapInstanceRef.current) return;

    const position = { lat, lng };

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: position,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });

    markerRef.current = new google.maps.Marker({
      position,
      map: mapInstanceRef.current,
      title: address || 'Property location',
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      mapInstanceRef.current = null;
    };
  }, [isLoaded, lat, lng, address]);

  if (loadError) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl bg-muted/30 ${className}`}
      >
        <MapPin className="mb-2 h-6 w-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Map unavailable</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-muted/30 ${className}`}
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={mapRef} className={`rounded-xl overflow-hidden ${className}`} />
      {address && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          {address}
        </p>
      )}
    </div>
  );
}
