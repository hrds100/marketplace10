/**
 * FeatureInspector — overlay for inspecting data-feature tags.
 *
 * Activation:
 *   - Always active in dev mode (import.meta.env.MODE === 'development')
 *   - On deployed previews: visit any URL with ?inspector to activate.
 *     This sets localStorage so it persists across page navigations.
 *     Visit ?inspector=off to deactivate.
 *
 * Usage:
 *   Option+Hover (Mac) / Alt+Hover (Windows): highlights nearest tagged
 *   element with a green border + tooltip showing the tag.
 *   Option+Click / Alt+Click: copies tag to clipboard + toast with session.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

const STORAGE_KEY = 'feature-inspector-enabled';

function isInspectorEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  // Process URL param first (sets/clears localStorage for persistence)
  const params = new URLSearchParams(window.location.search);
  if (params.has('inspector')) {
    const val = params.get('inspector');
    if (val === 'off' || val === 'false') {
      localStorage.removeItem(STORAGE_KEY);
      return import.meta.env.MODE === 'development';
    }
    localStorage.setItem(STORAGE_KEY, 'true');
    return true;
  }

  // Always on in dev
  if (import.meta.env.MODE === 'development') return true;

  // Fall back to localStorage (persists across navigations on previews)
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function getSession(tag: string): string {
  return tag.includes('__') ? tag.split('__')[0] : tag;
}

export default function FeatureInspector() {
  const [enabled] = useState(isInspectorEnabled);
  if (!enabled) return null;
  return <InspectorOverlay />;
}

function InspectorOverlay() {
  const activeRef = useRef(false);
  const [tooltip, setTooltip] = useState<{
    tag: string;
    x: number;
    y: number;
  } | null>(null);
  const highlightRef = useRef<HTMLElement | null>(null);
  // Force re-render when tooltip changes
  const [, forceUpdate] = useState(0);

  const clearHighlight = useCallback(() => {
    if (highlightRef.current) {
      highlightRef.current.style.outline = '';
      highlightRef.current.style.outlineOffset = '';
      highlightRef.current = null;
    }
    setTooltip(null);
  }, []);

  const findTaggedParent = useCallback(
    (el: HTMLElement | null): HTMLElement | null => {
      while (el) {
        if (el.dataset?.feature) return el;
        el = el.parentElement;
      }
      return null;
    },
    [],
  );

  useEffect(() => {
    // --- Key listeners ---
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || e.altKey) {
        activeRef.current = true;
        forceUpdate((n) => n + 1);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        activeRef.current = false;
        clearHighlight();
        forceUpdate((n) => n + 1);
      }
    };
    const handleBlur = () => {
      activeRef.current = false;
      clearHighlight();
      forceUpdate((n) => n + 1);
    };

    // --- Mouse listeners (always attached, check activeRef inline) ---
    const handleMove = (e: MouseEvent) => {
      if (!activeRef.current) return;
      const el = findTaggedParent(e.target as HTMLElement);
      if (el === highlightRef.current) {
        setTooltip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : null));
        return;
      }
      clearHighlight();
      if (!el) return;

      el.style.outline = '2px solid #1E9A80';
      el.style.outlineOffset = '-2px';
      highlightRef.current = el;

      const tag = el.dataset.feature!;
      setTooltip({ tag, x: e.clientX, y: e.clientY });
    };

    const handleClick = (e: MouseEvent) => {
      if (!activeRef.current) return;
      const el = findTaggedParent(e.target as HTMLElement);
      if (!el) return;

      e.preventDefault();
      e.stopPropagation();

      const tag = el.dataset.feature!;
      const session = getSession(tag);
      navigator.clipboard.writeText(tag).then(() => {
        const label = `Copied: ${tag}`;
        const description =
          session === tag
            ? `Session: ${session}`
            : `Session: ${session} > ${tag}`;
        toast(label, { description, position: 'bottom-right', duration: 2000 });
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('mousemove', handleMove, true);
    document.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('mousemove', handleMove, true);
      document.removeEventListener('click', handleClick, true);
      clearHighlight();
    };
  }, [clearHighlight, findTaggedParent]);

  if (!activeRef.current || !tooltip) return null;

  const session = getSession(tooltip.tag);
  const label =
    session === tooltip.tag ? tooltip.tag : `${session} > ${tooltip.tag}`;

  return (
    <div
      data-feature="SHARED"
      style={{
        position: 'fixed',
        left: tooltip.x + 12,
        top: tooltip.y + 12,
        zIndex: 99999,
        pointerEvents: 'none',
        background: '#1A1A1A',
        color: '#FFFFFF',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        maxWidth: '400px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </div>
  );
}
