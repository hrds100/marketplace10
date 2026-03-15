import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const LS_KEY = 'nfstay-favourites';

function loadLocal(): Set<string> {
  try {
    const stored = localStorage.getItem(LS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function saveLocal(ids: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
}

export function useFavourites() {
  const { user } = useAuth();
  const [favourites, setFavourites] = useState<Set<string>>(loadLocal);
  const [loading, setLoading] = useState(true);

  // Load from Supabase when user is logged in
  useEffect(() => {
    if (!user) {
      setFavourites(loadLocal());
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from('user_favourites')
        .select('property_id')
        .eq('user_id', user.id);

      if (data && data.length > 0) {
        const ids = new Set(data.map((r: { property_id: string }) => r.property_id));
        setFavourites(ids);
        saveLocal(ids);
      } else {
        // Migrate localStorage favourites to Supabase on first login
        const local = loadLocal();
        if (local.size > 0) {
          const rows = [...local].map(pid => ({ user_id: user.id, property_id: pid }));
          await supabase.from('user_favourites').upsert(rows, { onConflict: 'user_id,property_id' });
          setFavourites(local);
        } else {
          setFavourites(new Set());
        }
      }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  // Ref tracks latest favourites so async DB calls never read stale state
  const favsRef = useRef(favourites);
  useEffect(() => { favsRef.current = favourites; }, [favourites]);

  const toggle = useCallback(async (id: string) => {
    // Read current state from ref BEFORE updating
    const wasFav = favsRef.current.has(id);

    setFavourites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveLocal(next);
      return next;
    });

    if (user) {
      if (wasFav) {
        await supabase
          .from('user_favourites')
          .delete()
          .eq('user_id', user.id)
          .eq('property_id', id);
      } else {
        await supabase
          .from('user_favourites')
          .upsert({ user_id: user.id, property_id: id }, { onConflict: 'user_id,property_id' });
      }
    }
  }, [user]);

  const isFav = useCallback((id: string) => favourites.has(id), [favourites]);

  return { favourites, toggle, isFav, loading };
}
