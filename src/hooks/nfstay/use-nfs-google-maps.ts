import { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface UseNfsGoogleMapsReturn {
  isLoaded: boolean;
  loadError: string | null;
}

export function useNfsGoogleMaps(): UseNfsGoogleMapsReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loaderRef = useRef(false);

  useEffect(() => {
    if (loaderRef.current) return;
    loaderRef.current = true;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setLoadError('Google Maps API key is not configured. Set VITE_GOOGLE_MAPS_API_KEY in your environment.');
      return;
    }

    const loader = new Loader({
      apiKey,
      libraries: ['places', 'marker'],
    });

    loader
      .load()
      .then(() => {
        setIsLoaded(true);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load Google Maps');
      });
  }, []);

  return { isLoaded, loadError };
}
