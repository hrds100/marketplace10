// nfstay Photo Gallery
// - readOnly (traveler view): VPS-style hero layout (cover + 2×2 grid) + fullscreen lightbox
// - edit mode (operator): reorderable grid with caption/delete controls
import { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { NfsPropertyImage } from '@/lib/nfstay/types';
import { ArrowUp, ArrowDown, Trash2, ChevronLeft, ChevronRight, X, Images } from 'lucide-react';

interface NfsPhotoGalleryProps {
  images: NfsPropertyImage[];
  onReorder?: (images: NfsPropertyImage[]) => void;
  onDelete?: (index: number) => void;
  onCaptionChange?: (index: number, caption: string) => void;
  readOnly?: boolean;
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: NfsPropertyImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [current, setCurrent] = useState(initialIndex);

  // Jump to initial image once embla is ready
  useEffect(() => {
    if (emblaApi) emblaApi.scrollTo(initialIndex, true);
  }, [emblaApi, initialIndex]);

  // Track selected index
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrent(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  // Keyboard: Esc / arrows
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') emblaApi?.scrollPrev();
    if (e.key === 'ArrowRight') emblaApi?.scrollNext();
  }, [emblaApi, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <div
      data-feature="BOOKING_NFSTAY__GALLERY_LIGHTBOX"
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 text-white flex-shrink-0">
        <span className="text-sm font-medium opacity-70">{current + 1} / {images.length}</span>
        {images[current]?.caption && (
          <span className="text-sm opacity-70 text-center flex-1 mx-4 truncate">{images[current].caption}</span>
        )}
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Carousel */}
      <div className="flex-1 overflow-hidden relative">
        <div className="overflow-hidden h-full" ref={emblaRef}>
          <div className="flex h-full">
            {images.map((img, i) => (
              <div key={i} className="flex-[0_0_100%] flex items-center justify-center px-12 py-4">
                <img
                  src={img.url}
                  alt={img.caption ?? `Photo ${i + 1}`}
                  className="max-h-full max-w-full object-contain rounded"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Prev / Next */}
        <button
          onClick={() => emblaApi?.scrollPrev()}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => emblaApi?.scrollNext()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-1.5 px-4 py-3 overflow-x-auto flex-shrink-0">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`flex-shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-all ${
                i === current ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-75'
              }`}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NfsPhotoGallery({
  images,
  onReorder,
  onDelete,
  onCaptionChange,
  readOnly = false,
}: NfsPhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (images.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No photos yet.</p>
    );
  }

  // ── Traveler (readOnly) view ────────────────────────────────────────────────
  if (readOnly) {
    // Sort: cover image first, then by order
    const sorted = [...images].sort((a, b) => {
      if (a.is_cover && !b.is_cover) return -1;
      if (!a.is_cover && b.is_cover) return 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });

    const cover = sorted[0];
    const secondary = sorted.slice(1, 5); // up to 4 in the right grid
    const overflow = sorted.length > 5 ? sorted.length - 5 : 0;

    return (
      <>
        <div className="relative rounded-xl overflow-hidden">
          {/* ── Desktop hero grid ── */}
          <div
            className="hidden md:grid gap-1"
            style={{ gridTemplateColumns: sorted.length === 1 ? '1fr' : '3fr 2fr', height: '420px' }}
          >
            {/* Cover — spans full height */}
            <div
              className="relative overflow-hidden cursor-pointer group"
              onClick={() => openLightbox(0)}
            >
              <img
                data-feature="BOOKING_NFSTAY__GALLERY_HERO"
                src={cover.url}
                alt={cover.caption ?? 'Cover photo'}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>

            {/* Secondary grid (2×2) */}
            {secondary.length > 0 && (
              <div className="grid grid-cols-2 grid-rows-2 gap-1">
                {[0, 1, 2, 3].map((i) => {
                  const img = secondary[i];
                  if (!img) return <div key={i} className="bg-muted" />;
                  const isLastVisible = i === 3 && overflow > 0;
                  return (
                    <div
                      key={i}
                      className="relative overflow-hidden cursor-pointer group"
                      onClick={() => openLightbox(i + 1)}
                    >
                      <img
                        data-feature="BOOKING_NFSTAY__GALLERY_THUMB"
                        src={img.url}
                        alt={img.caption ?? `Photo ${i + 2}`}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      />
                      {isLastVisible && (
                        <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                          <span className="text-white text-xl font-bold">+{overflow + 1}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Mobile: single cover ── */}
          <div
            className="md:hidden aspect-[4/3] overflow-hidden cursor-pointer"
            onClick={() => openLightbox(0)}
          >
            <img
              src={cover.url}
              alt={cover.caption ?? 'Cover photo'}
              className="w-full h-full object-cover"
            />
          </div>

          {/* View all button */}
          {images.length > 1 && (
            <button
              onClick={() => openLightbox(0)}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/95 hover:bg-white text-gray-900 text-xs font-semibold px-3 py-2 rounded-lg shadow transition-colors"
            >
              <Images className="w-3.5 h-3.5" />
              View all {images.length} photos
            </button>
          )}
        </div>

        {lightboxOpen && (
          <Lightbox
            images={sorted}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </>
    );
  }

  // ── Admin edit mode ─────────────────────────────────────────────────────────
  const moveImage = (fromIndex: number, direction: 'up' | 'down') => {
    if (!onReorder) return;
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onReorder(reordered.map((img, i) => ({ ...img, order: i })));
  };

  return (
    <div data-feature="BOOKING_NFSTAY__PROPERTY_WIZARD" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((image, index) => (
        <div
          key={`${image.url}-${index}`}
          className="relative overflow-hidden rounded-lg border bg-card"
        >
          <div className="relative">
            <img
              src={image.url}
              alt={image.caption ?? `Photo ${index + 1}`}
              className="aspect-[4/3] w-full object-cover cursor-pointer"
              loading="lazy"
              onClick={() => openLightbox(index)}
            />
            {index === 0 && (
              <Badge className="absolute left-2 top-2" variant="secondary">Cover</Badge>
            )}
          </div>
          <div className="flex flex-col gap-2 p-3">
            <Input
              type="text"
              placeholder="Add a caption..."
              value={image.caption ?? ''}
              onChange={(e) => onCaptionChange?.(index, e.target.value)}
            />
            <div className="flex items-center gap-1">
              <Button data-feature="BOOKING_NFSTAY__GALLERY_REORDER" type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => moveImage(index, 'up')} aria-label="Move up">
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button data-feature="BOOKING_NFSTAY__GALLERY_REORDER" type="button" variant="ghost" size="icon" disabled={index === images.length - 1} onClick={() => moveImage(index, 'down')} aria-label="Move down">
                <ArrowDown className="h-4 w-4" />
              </Button>
              <div className="flex-1" />
              <Button data-feature="BOOKING_NFSTAY__GALLERY_DELETE" type="button" variant="ghost" size="icon" onClick={() => onDelete?.(index)} aria-label="Delete photo" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {lightboxOpen && (
        <Lightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}
