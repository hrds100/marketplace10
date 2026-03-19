// Dynamic white-label theming hook
// Injects CSS that overrides Tailwind color classes with the operator's accent color.
// Ported from VPS useWhiteLabelTheme — scoped to .nfs-wl-themed container.

import { useEffect, useState } from 'react';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => {
        const clamped = Math.max(0, Math.min(255, Math.round(v)));
        return clamped.toString(16).padStart(2, '0');
      })
      .join('')
  );
}

function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * (percent / 100),
    rgb.g + (255 - rgb.g) * (percent / 100),
    rgb.b + (255 - rgb.b) * (percent / 100)
  );
}

function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r * (1 - percent / 100),
    rgb.g * (1 - percent / 100),
    rgb.b * (1 - percent / 100)
  );
}

function getContrastColor(hex: string): '#000000' | '#FFFFFF' {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FFFFFF';
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  return luminance > 150 ? '#000000' : '#FFFFFF';
}

const STYLE_ID = 'nfs-white-label-theme';

export function useNfsWhiteLabelTheme(accentColor?: string | null): { isThemeReady: boolean } {
  const [isThemeReady, setIsThemeReady] = useState(false);

  useEffect(() => {
    const color = accentColor || '#6366f1';
    const lighter = lightenColor(color, 30);
    const veryLight = lightenColor(color, 80);
    const darker = darkenColor(color, 20);
    const contrast = getContrastColor(color);

    // Remove existing style tag if any
    const existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* NFStay White-Label Dynamic Theme */
      .nfs-wl-themed .bg-blue-600,
      .nfs-wl-themed .bg-purple-600 { background-color: ${color} !important; }

      .nfs-wl-themed .text-blue-600,
      .nfs-wl-themed .text-purple-600 { color: ${color} !important; }

      .nfs-wl-themed .border-blue-600 { border-color: ${color} !important; }
      .nfs-wl-themed .border-purple-200,
      .nfs-wl-themed .border-blue-200 { border-color: ${lighter} !important; }

      .nfs-wl-themed .bg-blue-100,
      .nfs-wl-themed .bg-purple-100 { background-color: ${veryLight} !important; }

      .nfs-wl-themed .text-blue-700,
      .nfs-wl-themed .text-purple-700 { color: ${color} !important; }

      .nfs-wl-themed .bg-green-600 { background-color: ${lighter} !important; }

      .nfs-wl-themed .hover\\:bg-blue-700:hover,
      .nfs-wl-themed .hover\\:bg-purple-700:hover { background-color: ${darker} !important; }

      .nfs-wl-themed .focus\\:ring-blue-500:focus,
      .nfs-wl-themed .focus\\:ring-purple-500:focus { --tw-ring-color: ${color} !important; }

      .nfs-wl-themed .focus\\:border-blue-500:focus,
      .nfs-wl-themed .focus\\:border-purple-500:focus { border-color: ${color} !important; }

      .nfs-wl-themed .bg-gray-900 { background-color: ${color} !important; }

      .nfs-wl-themed .bg-primary-gradient {
        background: ${color} !important;
      }

      .nfs-wl-themed .bg-primary-gradient-faint {
        background: linear-gradient(135deg, ${veryLight}, ${veryLight}) !important;
      }

      .nfs-wl-themed .bg-primary-auto {
        background-color: ${color} !important;
        color: ${contrast} !important;
      }

      .nfs-wl-themed .btn-primary-auto {
        background-color: ${color} !important;
        color: ${contrast} !important;
        border-color: ${darker} !important;
      }

      .nfs-wl-themed .btn-primary-auto:hover {
        background-color: ${darker} !important;
      }

      /* Currency modal overrides */
      .nfs-wl-themed [data-radix-popper-content-wrapper] .bg-blue-600,
      .nfs-wl-themed [data-radix-popper-content-wrapper] .bg-purple-600 {
        background-color: ${color} !important;
      }

      .nfs-wl-themed [role="dialog"] .bg-blue-600,
      .nfs-wl-themed [role="dialog"] .bg-purple-600 {
        background-color: ${color} !important;
      }
    `;

    document.head.appendChild(style);
    setIsThemeReady(true);

    return () => {
      const el = document.getElementById(STYLE_ID);
      if (el) el.remove();
    };
  }, [accentColor]);

  return { isThemeReady };
}
