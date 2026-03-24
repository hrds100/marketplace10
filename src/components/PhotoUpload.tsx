import { useState, useRef } from 'react';
import { Image, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MAX_PHOTOS = 10;
const MAX_SIZE_MB = 5;

interface Props {
  photos: string[];
  onChange: (urls: string[]) => void;
}

export default function PhotoUpload({ photos, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos`);
      return;
    }

    const valid = Array.from(files)
      .filter(f => {
        if (f.size > MAX_SIZE_MB * 1024 * 1024) {
          toast.error(`${f.name} exceeds ${MAX_SIZE_MB}MB`);
          return false;
        }
        if (!f.type.startsWith('image/')) {
          toast.error(`${f.name} is not an image`);
          return false;
        }
        return true;
      })
      .slice(0, remaining);

    if (valid.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of valid) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `deals/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('deals-photos').upload(path, file);
      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }
      const { data } = supabase.storage.from('deals-photos').getPublicUrl(path);
      newUrls.push(data.publicUrl);
    }

    onChange([...photos, ...newUrls]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div data-feature="DEALS__LIST_A_DEAL">
      <label className="text-xs font-semibold text-foreground block mb-1">Property photos</label>
      <p className="text-xs text-muted-foreground mb-2">Upload up to {MAX_PHOTOS} photos. JPG or PNG, max {MAX_SIZE_MB}MB each.</p>

      <label
        className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center cursor-pointer hover:border-primary/30 transition-colors"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Image className="w-7 h-7 text-muted-foreground mb-2" />
        <span className="text-sm text-muted-foreground">
          {uploading ? 'Uploading...' : 'Drag photos here or click to browse'}
        </span>
        <span className="text-xs text-muted-foreground mt-1">{photos.length}/{MAX_PHOTOS} uploaded</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
          disabled={uploading}
        />
      </label>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {photos.map((url, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden aspect-[4/3]">
              <img src={url} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
