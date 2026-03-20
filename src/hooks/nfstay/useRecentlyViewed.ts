import { useState, useCallback } from "react";

const STORAGE_KEY = 'nfs_recently_viewed';
const MAX_ITEMS = 8;

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });

  const addViewed = useCallback((id: string) => {
    setIds(prev => {
      const next = [id, ...prev.filter(p => p !== id)].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { recentIds: ids, addViewed };
}
