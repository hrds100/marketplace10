import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUp, ArrowDown, Trash2, Upload } from 'lucide-react';
import type { NfsProperty, NfsPropertyImage } from '@/lib/nfstay/types';

interface Props {
  property: NfsProperty;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export default function StepPhotos({ property, onSave, saving }: Props) {
  const [images, setImages] = useState<NfsPropertyImage[]>(
    property.images?.length ? [...property.images] : [],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ images });
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next.map((img, i) => ({ ...img, order: i })));
  };

  const removeImage = (index: number) => {
    setImages((prev) =>
      prev.filter((_, i) => i !== index).map((img, i) => ({ ...img, order: i })),
    );
  };

  const updateCaption = (index: number, caption: string) => {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, caption } : img)));
  };

  const handleFileSelect = () => {
    // Placeholder: actual file upload will be wired by the wizard page via use-nfs-image-upload
    const placeholder: NfsPropertyImage = {
      url: `https://placeholder.co/600x400?text=Photo+${images.length + 1}`,
      caption: '',
      order: images.length,
    };
    setImages((prev) => [...prev, placeholder]);
  };

  return (
    <form data-feature="BOOKING_NFSTAY__PROPERTY_WIZARD" id="property-step-form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Photos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add photos of your property. The first photo will be the cover image.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleFileSelect}
        disabled={saving}
        className="w-full h-24 border-dashed"
      >
        <Upload className="h-5 w-5 mr-2" />
        Click to upload
      </Button>

      <p className="text-xs text-muted-foreground">
        Note: actual file upload integration with use-nfs-image-upload will be wired by the wizard page.
      </p>

      {images.length === 0 && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          Add at least 1 photo for the best listing results.
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-3">
          {images.map((img, index) => (
            <div
              key={`${img.url}-${index}`}
              className="flex items-center gap-3 rounded-md border p-2"
            >
              <img
                src={img.url}
                alt={img.caption || `Photo ${index + 1}`}
                className="h-16 w-16 rounded object-cover flex-shrink-0"
              />

              <div className="flex-1 space-y-1">
                {index === 0 && (
                  <span className="text-xs font-medium text-primary">Cover photo</span>
                )}
                <Input
                  data-feature="BOOKING_NFSTAY__WIZARD_INPUT"
                  placeholder="Caption (optional)"
                  value={img.caption ?? ''}
                  onChange={(e) => updateCaption(index, e.target.value)}
                  disabled={saving}
                  className="h-8 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveImage(index, -1)}
                  disabled={saving || index === 0}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveImage(index, 1)}
                  disabled={saving || index === images.length - 1}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => removeImage(index)}
                disabled={saving}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
