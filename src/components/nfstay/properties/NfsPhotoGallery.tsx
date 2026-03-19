import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { NfsPropertyImage } from '@/lib/nfstay/types';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

interface NfsPhotoGalleryProps {
  images: NfsPropertyImage[];
  onReorder?: (images: NfsPropertyImage[]) => void;
  onDelete?: (index: number) => void;
  onCaptionChange?: (index: number, caption: string) => void;
  readOnly?: boolean;
}

export default function NfsPhotoGallery({
  images,
  onReorder,
  onDelete,
  onCaptionChange,
  readOnly = false,
}: NfsPhotoGalleryProps) {
  if (images.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No photos yet.
      </p>
    );
  }

  const moveImage = (fromIndex: number, direction: 'up' | 'down') => {
    if (!onReorder) return;
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= images.length) return;

    const reordered = [...images];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // Re-assign order values to match new positions
    const withUpdatedOrder = reordered.map((img, i) => ({ ...img, order: i }));
    onReorder(withUpdatedOrder);
  };

  if (readOnly) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image, index) => (
          <div key={`${image.url}-${index}`} className="relative overflow-hidden rounded-lg">
            <img
              src={image.url}
              alt={image.caption ?? `Photo ${index + 1}`}
              className="aspect-square w-full object-cover"
              loading="lazy"
            />
            {index === 0 && (
              <Badge className="absolute left-2 top-2" variant="secondary">
                Cover
              </Badge>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((image, index) => (
        <div
          key={`${image.url}-${index}`}
          className="relative overflow-hidden rounded-lg border bg-card"
        >
          {/* Thumbnail */}
          <div className="relative">
            <img
              src={image.url}
              alt={image.caption ?? `Photo ${index + 1}`}
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
            />
            {index === 0 && (
              <Badge className="absolute left-2 top-2" variant="secondary">
                Cover
              </Badge>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-2 p-3">
            {/* Caption input */}
            <Input
              type="text"
              placeholder="Add a caption..."
              value={image.caption ?? ''}
              onChange={(e) => onCaptionChange?.(index, e.target.value)}
            />

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={index === 0}
                onClick={() => moveImage(index, 'up')}
                aria-label="Move up"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={index === images.length - 1}
                onClick={() => moveImage(index, 'down')}
                aria-label="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onDelete?.(index)}
                aria-label="Delete photo"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
