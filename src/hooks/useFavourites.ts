import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import React from 'react';

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

interface FavouritesContextValue {
  favourites: Set<string>;
  toggle: (id: string) => Promise<void>;
  isFav: (id: string) => boolean;
  loading: boolean;
}

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

export function FavouritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favourites, setFavourites] = useState<Set<string>>(loadLocal);
  const [loading, setLoading] = useState(true);

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
        // DB is truth - if DB says no favourites, clear local stale IDs
        setFavourites(new Set());
        saveLocal(new Set());
      }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const favsRef = useRef(favourites);
  useEffect(() => { favsRef.current = favourites; }, [favourites]);

  const toggle = useCallback(async (id: string) => {
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

  const value = { favourites, toggle, isFav, loading };

  return React.createElement(FavouritesContext.Provider, { value }, children);
}

export function useFavourites(): FavouritesContextValue {
  const ctx = useContext(FavouritesContext);
  if (!ctx) {
    // Fallback for components outside the provider (shouldn't happen in normal use)
    // This keeps backwards compatibility
    throw new Error('useFavourites must be used within FavouritesProvider');
  }
  return ctx;
}
