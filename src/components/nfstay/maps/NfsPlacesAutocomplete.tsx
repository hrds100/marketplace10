import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Input } from '@/components/ui/input';

interface PlaceResult {
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  lat: number;
  lng: number;
}

interface NfsPlacesAutocompleteProps {
  onPlaceSelect: (place: PlaceResult) => void;
  defaultValue?: string;
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function extractAddressComponent(
  components: google.maps.GeocoderAddressComponent[],
  type: string,
): string {
  const match = components.find((c) => c.types.includes(type));
  return match?.long_name ?? '';
}

export default function NfsPlacesAutocomplete({
  onPlaceSelect,
  defaultValue = '',
}: NfsPlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;

  useEffect(() => {
    if (!API_KEY) return;

    const loader = new Loader({
      apiKey: API_KEY,
      version: 'weekly',
      libraries: ['places'],
    });

    let cancelled = false;

    loader
      .importLibrary('places')
      .then(() => {
        if (cancelled) return;
        setLoaded(true);
      })
      .catch(() => {
        // Graceful degradation: stays as plain input
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePlaceChanged = useCallback(() => {
    const autocomplete = autocompleteRef.current;
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
    if (!place.geometry?.location || !place.address_components) return;

    const components = place.address_components;

    const result: PlaceResult = {
      address: place.formatted_address ?? '',
      city:
        extractAddressComponent(components, 'locality') ||
        extractAddressComponent(components, 'postal_town'),
      state: extractAddressComponent(components, 'administrative_area_level_1'),
      country: extractAddressComponent(components, 'country'),
      postal_code: extractAddressComponent(components, 'postal_code'),
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    setValue(result.address);
    onPlaceSelectRef.current(result);
  }, []);

  useEffect(() => {
    if (!loaded || !inputRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      fields: ['address_components', 'formatted_address', 'geometry'],
    });

    autocomplete.addListener('place_changed', handlePlaceChanged);
    autocompleteRef.current = autocomplete;

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
      autocompleteRef.current = null;
    };
  }, [loaded, handlePlaceChanged]);

  return (
    <Input
      data-feature="BOOKING_NFSTAY__PLACES_INPUT"
      ref={inputRef}
      type="text"
      placeholder="Start typing an address..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
