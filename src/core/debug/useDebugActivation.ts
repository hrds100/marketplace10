import { useState, useEffect } from 'react';

export function useDebugActivation(): boolean {
  const [active, setActive] = useState(() => {
    if (import.meta.env.VITE_DEBUG_REPORT_ENABLED !== 'true') return false;
    return sessionStorage.getItem('nfs_debug_active') === '1';
  });

  useEffect(() => {
    if (import.meta.env.VITE_DEBUG_REPORT_ENABLED !== 'true') return;
    let buffer = '';
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      const isEditable = (document.activeElement as HTMLElement)?.isContentEditable;
      if (tag === 'input' || tag === 'textarea' || isEditable) return;
      buffer = (buffer + e.key).slice(-10);
      if (buffer.endsWith('nfsdebug')) {
        sessionStorage.setItem('nfs_debug_active', '1');
        setActive(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return active;
}
