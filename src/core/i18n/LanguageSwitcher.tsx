import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useLocale } from './useLocale';
import { SUPPORTED_LOCALES, LOCALE_META, type SupportedLocale } from './constants';

/**
 * Language switcher dropdown with flags.
 * Shows current language flag + code. Clicking opens a dropdown with all languages.
 * Design: matches existing nfstay TopBar style (dark text, subtle hover, small font).
 */
export default function LanguageSwitcher() {
  const { locale, changeLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const current = LOCALE_META[locale] || LOCALE_META.en;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
        aria-label="Change language"
        data-feature="I18N__LANG_SWITCHER"
      >
        <Globe className="w-[13px] h-[13px]" strokeWidth={2} />
        <span className="hidden md:inline">{current.flag} {locale.toUpperCase()}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-border/50 py-1 min-w-[180px] z-[200] animate-in fade-in slide-in-from-top-1 duration-150">
          {SUPPORTED_LOCALES.map((loc: SupportedLocale) => {
            const meta = LOCALE_META[loc];
            const isActive = loc === locale;
            return (
              <button
                key={loc}
                onClick={() => {
                  changeLocale(loc);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-[13px] transition-colors ${
                  isActive
                    ? 'bg-[#ECFDF5] text-[#1E9A80] font-semibold'
                    : 'text-[#1A1A1A] hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{meta.flag}</span>
                <span>{meta.nativeLabel}</span>
                {isActive && (
                  <span className="ml-auto text-[#1E9A80] text-[11px]">&#10003;</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
