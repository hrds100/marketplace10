import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Expand, ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { NfsPropertyImage } from '@/lib/nfstay/types';

interface NfsWlImageGalleryProps {
  images: NfsPropertyImage[];
  title?: string;
}

export default function NfsWlImageGallery({
  images,
  title = 'Property',
}: NfsWlImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-xl bg-muted">
        <div className="text-center">
          <ImageIcon className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No photos available</p>
        </div>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const prevImage = () => {
    setLightboxIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextImage = () => {
    setLightboxIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'Escape') setLightboxOpen(false);
  };

  // Single image layout
  if (images.length === 1) {
    return (
      <>
        <div
          className="group relative cursor-pointer overflow-hidden rounded-xl"
          onClick={() => openLightbox(0)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') openLightbox(0);
          }}
        >
          <img
            src={images[0].url}
            alt={images[0].caption || title}
            className="aspect-[16/9] w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
          <button className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 md:opacity-0">
            <Expand className="h-3.5 w-3.5" />
            View photo
          </button>
        </div>
        <LightboxDialog
          images={images}
          index={lightboxIndex}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          onPrev={prevImage}
          onNext={nextImage}
          onKeyDown={handleKeyDown}
          title={title}
        />
      </>
    );
  }

  // Multi-image: hero + grid layout
  const heroImage = images[0];
  const gridImages = images.slice(1, 5);
  const remainingCount = images.length - 5;

  return (
    <>
      <div className="grid gap-2 rounded-xl overflow-hidden md:grid-cols-2 md:grid-rows-2 md:h-[420px]">
        {/* Hero image — spans both rows on desktop */}
        <div
          className="group relative cursor-pointer md:row-span-2"
          onClick={() => openLightbox(0)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') openLightbox(0);
          }}
        >
          <img
            src={heroImage.url}
            alt={heroImage.caption || title}
            className="h-full w-full object-cover aspect-[16/9] md:aspect-auto"
          />
          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
        </div>

        {/* Grid images */}
        {gridImages.map((img, i) => (
          <div
            key={`${img.url}-${i}`}
            className="group relative hidden cursor-pointer md:block"
            onClick={() => openLightbox(i + 1)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') openLightbox(i + 1);
            }}
          >
            <img
              src={img.url}
              alt={img.caption || `Photo ${i + 2}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />

            {/* "+N more" badge on last grid image */}
            {i === gridImages.length - 1 && remainingCount > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-lg font-semibold text-white">
                  +{remainingCount} more
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Mobile: "Show all photos" button */}
        <button
          className="flex items-center justify-center gap-1.5 bg-muted/60 py-3 text-xs font-medium md:hidden"
          onClick={() => openLightbox(0)}
        >
          <Expand className="h-3.5 w-3.5" />
          Show all {images.length} photos
        </button>
      </div>

      <LightboxDialog
        images={images}
        index={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onPrev={prevImage}
        onNext={nextImage}
        onKeyDown={handleKeyDown}
        title={title}
      />
    </>
  );
}

// Fullscreen lightbox dialog
function LightboxDialog({
  images,
  index,
  open,
  onOpenChange,
  onPrev,
  onNext,
  onKeyDown,
  title,
}: {
  images: NfsPropertyImage[];
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  title: string;
}) {
  const current = images[index];
  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0"
        onKeyDown={onKeyDown}
      >
        <DialogTitle className="sr-only">{title} - Photo {index + 1}</DialogTitle>
        <DialogDescription className="sr-only">
          Photo {index + 1} of {images.length}
        </DialogDescription>

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Image */}
        <div className="flex items-center justify-center p-4">
          <img
            src={current.url}
            alt={current.caption || `Photo ${index + 1}`}
            className="max-h-[80vh] max-w-full rounded-lg object-contain"
          />
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={onPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={onNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-sm">
          {index + 1} / {images.length}
        </div>

        {/* Caption */}
        {current.caption && (
          <p className="absolute bottom-12 left-1/2 -translate-x-1/2 max-w-md text-center text-sm text-white/80">
            {current.caption}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
