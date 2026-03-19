import { useEffect, useRef, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { useNfsGoogleMaps } from '@/hooks/nfstay/use-nfs-google-maps';
import type { NfsProperty } from '@/lib/nfstay/types';

interface NfsWlSearchMapProps {
  properties: NfsProperty[];
  onMarkerClick: (propertyId: string) => void;
  onMarkerHover: (propertyId: string | null) => void;
  highlightedPropertyId: string | null;
  className?: string;
}

function getCurrencySymbol(code: string): string {
  const symbols: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', AUD: 'A$', CAD: 'C$' };
  return symbols[code] || code + ' ';
}

// Default center: London
const DEFAULT_CENTER = { lat: 51.5074, lng: -0.1278 };
const DEFAULT_ZOOM = 12;

export default function NfsWlSearchMap({
  properties,
  onMarkerClick,
  onMarkerHover,
  highlightedPropertyId,
  className = '',
}: NfsWlSearchMapProps) {
  const { isLoaded, loadError } = useNfsGoogleMaps();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const overlaysRef = useRef<google.maps.OverlayView[]>([]);

  // Properties with coordinates
  const geoProperties = properties.filter((p) => p.lat != null && p.lng != null);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const center =
      geoProperties.length > 0
        ? { lat: geoProperties[0].lat!, lng: geoProperties[0].lng! }
        : DEFAULT_CENTER;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center,
      zoom: DEFAULT_ZOOM,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });
  }, [isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Create price label overlay class
  const createPriceMarker = useCallback(
    (
      map: google.maps.Map,
      position: google.maps.LatLngLiteral,
      property: NfsProperty,
    ): google.maps.Marker => {
      const price =
        property.base_rate_amount != null
          ? `${getCurrencySymbol(property.base_rate_currency)}${property.base_rate_amount}`
          : '—';

      const marker = new google.maps.Marker({
        position,
        map,
        label: {
          text: price,
          color: '#1a1a1a',
          fontSize: '11px',
          fontWeight: '600',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 0,
        },
      });

      // Use a custom overlay for the styled price badge
      const overlay = new PriceBadgeOverlay(map, position, price, property.id);
      overlay.setMap(map);

      marker.addListener('click', () => onMarkerClick(property.id));
      marker.addListener('mouseover', () => onMarkerHover(property.id));
      marker.addListener('mouseout', () => onMarkerHover(null));

      return marker;
    },
    [onMarkerClick, onMarkerHover],
  );

  // Update markers when properties change
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    if (geoProperties.length === 0) return;

    // Add new markers
    const bounds = new google.maps.LatLngBounds();

    geoProperties.forEach((p) => {
      const position = { lat: p.lat!, lng: p.lng! };
      const marker = createPriceMarker(map, position, p);
      markersRef.current.push(marker);
      bounds.extend(position);
    });

    // Fit bounds with padding
    if (geoProperties.length > 1) {
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } else {
      map.setCenter({ lat: geoProperties[0].lat!, lng: geoProperties[0].lng! });
      map.setZoom(14);
    }
  }, [isLoaded, geoProperties.length, createPriceMarker]); // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight marker on hover
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    // Update overlay styles for highlighted property
    const overlayElements = mapRef.current?.querySelectorAll('[data-property-id]');
    overlayElements?.forEach((el) => {
      const id = el.getAttribute('data-property-id');
      if (id === highlightedPropertyId) {
        (el as HTMLElement).style.transform = 'scale(1.15)';
        (el as HTMLElement).style.zIndex = '10';
        (el as HTMLElement).style.background = '#1a1a1a';
        (el as HTMLElement).style.color = '#ffffff';
      } else {
        (el as HTMLElement).style.transform = 'scale(1)';
        (el as HTMLElement).style.zIndex = '1';
        (el as HTMLElement).style.background = '#ffffff';
        (el as HTMLElement).style.color = '#1a1a1a';
      }
    });
  }, [highlightedPropertyId, isLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      overlaysRef.current.forEach((o) => o.setMap(null));
      mapInstanceRef.current = null;
    };
  }, []);

  // Fallback states
  if (loadError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-muted/30 ${className}`}
      >
        <MapPin className="mb-2 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Map unavailable</p>
        {loadError.includes('API key') && (
          <p className="mt-1 text-xs text-muted-foreground/60">
            Configure VITE_GOOGLE_MAPS_API_KEY
          </p>
        )}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/30 ${className}`}
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <div ref={mapRef} className={`w-full ${className}`} />;
}

// Custom overlay for styled price badges on the map
class PriceBadgeOverlay extends google.maps.OverlayView {
  private position: google.maps.LatLngLiteral;
  private price: string;
  private propertyId: string;
  private div: HTMLDivElement | null = null;

  constructor(
    map: google.maps.Map,
    position: google.maps.LatLngLiteral,
    price: string,
    propertyId: string,
  ) {
    super();
    this.position = position;
    this.price = price;
    this.propertyId = propertyId;
    this.setMap(map);
  }

  override onAdd() {
    this.div = document.createElement('div');
    this.div.setAttribute('data-property-id', this.propertyId);
    this.div.style.cssText = `
      position: absolute;
      background: #ffffff;
      color: #1a1a1a;
      padding: 4px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 1px 4px rgba(0,0,0,0.15);
      cursor: pointer;
      transition: transform 0.15s, background 0.15s, color 0.15s;
      z-index: 1;
      transform: translate(-50%, -50%);
    `;
    this.div.textContent = this.price;

    const panes = this.getPanes();
    panes?.overlayMouseTarget.appendChild(this.div);
  }

  override draw() {
    if (!this.div) return;
    const projection = this.getProjection();
    if (!projection) return;

    const pos = projection.fromLatLngToDivPixel(
      new google.maps.LatLng(this.position.lat, this.position.lng),
    );

    if (pos) {
      this.div.style.left = `${pos.x}px`;
      this.div.style.top = `${pos.y}px`;
    }
  }

  override onRemove() {
    if (this.div?.parentNode) {
      this.div.parentNode.removeChild(this.div);
      this.div = null;
    }
  }
}
