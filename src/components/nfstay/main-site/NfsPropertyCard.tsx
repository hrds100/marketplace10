import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, ChevronLeft, ChevronRight, MapPin, Users, BedDouble, Bath } from "lucide-react";
import type { MockProperty } from "@/data/nfstay/mock-properties";
import { CURRENCIES } from "@/lib/nfstay/constants";

interface NfsPropertyCardProps {
  property: MockProperty;
}

export function NfsPropertyCard({ property }: NfsPropertyCardProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [isFavourite, setIsFavourite] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const sortedImages = [...property.images].sort((a, b) => {
    if (a.is_cover && !b.is_cover) return -1;
    if (!a.is_cover && b.is_cover) return 1;
    return a.order - b.order;
  });

  const isNew = Date.now() - new Date(property.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
  const currency = CURRENCIES.find(c => c.code === property.base_rate_currency);

  useEffect(() => {
    const favs: string[] = JSON.parse(localStorage.getItem('nfs_favourites') || '[]');
    setIsFavourite(favs.includes(property.id));
  }, [property.id]);

  const toggleFavourite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const favs: string[] = JSON.parse(localStorage.getItem('nfs_favourites') || '[]');
    const next = isFavourite ? favs.filter(id => id !== property.id) : [...favs, property.id];
    localStorage.setItem('nfs_favourites', JSON.stringify(next));
    setIsFavourite(!isFavourite);
  };

  return (
    <Link
      data-feature="BOOKING_NFSTAY__MAIN_SITE"
      to={`/property/${property.id}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-2.5">
        <img
          data-feature="BOOKING_NFSTAY__CARD_IMAGE"
          src={sortedImages[currentImage]?.url}
          alt={sortedImages[currentImage]?.caption || property.public_title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Favourite */}
        <button
          data-feature="BOOKING_NFSTAY__CARD_FAVOURITE"
          onClick={toggleFavourite}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition"
        >
          <Heart className={`w-4 h-4 ${isFavourite ? 'fill-destructive text-destructive' : 'text-foreground'}`} />
        </button>

        {/* New badge */}
        {isNew && (
          <span className="absolute top-3 left-3 z-10 bg-primary text-primary-foreground text-xs font-medium px-2.5 py-1 rounded-md">
            New
          </span>
        )}

        {/* Image arrows */}
        {sortedImages.length > 1 && isHovered && (
          <>
            {currentImage > 0 && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImage(currentImage - 1); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {currentImage < sortedImages.length - 1 && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImage(currentImage + 1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </>
        )}

        {/* Dots */}
        {sortedImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {sortedImages.slice(0, 5).map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full transition ${i === currentImage ? 'bg-card' : 'bg-card/50'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-1">
        <h3 data-feature="BOOKING_NFSTAY__CARD_TITLE" className="text-sm font-semibold text-foreground truncate leading-tight">{property.public_title}</h3>
        <p className="text-xs text-muted-foreground capitalize">{property.property_type}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0" />
          <span data-feature="BOOKING_NFSTAY__CARD_LOCATION" className="truncate">{property.city}, {property.state ? `${property.state}, ` : ''}{property.country}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {property.max_guests}
            </span>
            <span className="flex items-center gap-1">
              <BedDouble className="w-3.5 h-3.5" />
              {property.room_counts.bedrooms}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="w-3.5 h-3.5" />
              {property.room_counts.bathrooms}
            </span>
          </div>
          <div className="text-right">
            <span data-feature="BOOKING_NFSTAY__CARD_PRICE" className="text-sm font-bold text-foreground">{currency?.symbol}{property.base_rate_amount}</span>
            <span className="text-[11px] text-muted-foreground block leading-tight">avg per night</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
