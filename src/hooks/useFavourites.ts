import { useState, useCallback } from 'react';

export function useFavourites() {
  const [favourites, setFavourites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('nfstay-favourites');
      return stored ? new Set(JSON.parse(stored)) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const toggle = useCallback((id: string) => {
    setFavourites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('nfstay-favourites', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isFav = useCallback((id: string) => favourites.has(id), [favourites]);

  return { favourites, toggle, isFav };
}
