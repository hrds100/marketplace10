import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseNfsImageUploadReturn {
  upload: (file: File, operatorId: string, propertyId: string) => Promise<string | null>;
  remove: (path: string) => Promise<boolean>;
  uploading: boolean;
  error: string | null;
}

export function useNfsImageUpload(): UseNfsImageUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File, operatorId: string, propertyId: string): Promise<string | null> => {
    setUploading(true);
    setError(null);

    try {
      const path = `${operatorId}/${propertyId}/${Date.now()}_${file.name}`;

      const { error: uploadErr } = await supabase.storage
        .from('nfs-images')
        .upload(path, file);

      if (uploadErr) {
        setError(uploadErr.message);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from('nfs-images')
        .getPublicUrl(path);

      return publicUrlData.publicUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const remove = useCallback(async (path: string): Promise<boolean> => {
    setUploading(true);
    setError(null);

    try {
      const { error: removeErr } = await supabase.storage
        .from('nfs-images')
        .remove([path]);

      if (removeErr) {
        setError(removeErr.message);
        return false;
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove image');
      return false;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, remove, uploading, error };
}
