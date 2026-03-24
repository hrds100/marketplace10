/**
 * FeatureInspector — dev-only overlay for inspecting data-feature tags.
 *
 * Alt+Hover: highlights the nearest tagged element with a border + tooltip.
 * Alt+Click: copies the tag to clipboard + shows a toast with session info.
 *
 * Guarded by import.meta.env.MODE === 'development' — zero cost in production.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

// Session is the top-level part before "__"
function getSession(tag: string): string {
  return tag.includes('__') ? tag.split('__')[0] : tag;
}

export default function FeatureInspector() {
  // Dev-only guard
  if (import.meta.env.MODE !== 'development') return null;

  return <InspectorOverlay />;
}

function InspectorOverlay() {
  const [active, setActive] = useState(false);
  const [tooltip, setTooltip] = useState<{
    tag: string;
    x: number;
    y: number;
  } | null>(null);
  const highlightRef = useRef<HTMLElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || e.altKey) setActive(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setActive(false);
        clearHighlight();
      }
    };
    const handleBlur = () => {
      setActive(false);
      clearHighlight();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    cleanupRef.current = () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };

    return () => cleanupRef.current?.();
  }, [clearHighlight]);

  useEffect(() => {
    if (!active) return;

    const handleMove = (e: MouseEvent) => {
      const el = findTaggedParent(e.target as HTMLElement);
      if (el === highlightRef.current) {
        if (tooltip) setTooltip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : null));
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
      const el = findTaggedParent(e.target as HTMLElement);
      if (!el) return;

      e.preventDefault();
      e.stopPropagation();

      const tag = el.dataset.feature!;
      const session = getSession(tag);
      navigator.clipboard.writeText(tag).then(() => {
        const label =
          session === tag
            ? `Copied: ${tag}`
            : `Copied: ${tag}`;
        const description =
          session === tag
            ? `Session: ${session}`
            : `Session: ${session} > ${tag}`;
        toast(label, { description, position: 'bottom-right', duration: 2000 });
      });
    };

    document.addEventListener('mousemove', handleMove, true);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('mousemove', handleMove, true);
      document.removeEventListener('click', handleClick, true);
      clearHighlight();
    };
  }, [active, clearHighlight, findTaggedParent, tooltip]);

  if (!active || !tooltip) return null;

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
