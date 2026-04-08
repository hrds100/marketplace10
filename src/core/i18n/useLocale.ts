import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_LOCALE,
  LOCALE_SLUGS,
  SLUG_TO_LOCALE,
  LANG_STORAGE_KEY,
  type SupportedLocale,
} from './constants';

/**
 * Extract the locale slug from a pathname.
 * Returns the slug and the remaining path.
 */
export function parseLocalePath(pathname: string): { locale: SupportedLocale; path: string } {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0]?.toLowerCase();
  if (first && first in SLUG_TO_LOCALE) {
    const remaining = '/' + segments.slice(1).join('/');
    return { locale: SLUG_TO_LOCALE[first], path: remaining || '/' };
  }
  return { locale: DEFAULT_LOCALE, path: pathname };
}

/**
 * Build a locale-prefixed path.
 * English paths have no prefix. Other locales get /slug/ prepended.
 */
export function localePath(path: string, locale: SupportedLocale): string {
  if (locale === DEFAULT_LOCALE) return path;
  const slug = LOCALE_SLUGS[locale];
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/${slug}${cleanPath}`;
}

/**
 * Core i18n hook for components.
 * Provides current locale, language switcher, and locale-aware navigation.
 */
export function useLocale() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const currentLocale = (i18n.language || DEFAULT_LOCALE) as SupportedLocale;

  /** Change language — updates i18n, localStorage, URL, and HTML dir */
  const changeLocale = useCallback(
    (newLocale: SupportedLocale) => {
      i18n.changeLanguage(newLocale);
      localStorage.setItem(LANG_STORAGE_KEY, newLocale);

      // Update HTML dir for RTL
      document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = LOCALE_SLUGS[newLocale];

      // Update URL to reflect new locale
      const { path } = parseLocalePath(location.pathname);
      const newPath = localePath(path, newLocale);
      navigate(newPath + location.search + location.hash, { replace: true });
    },
    [i18n, navigate, location]
  );

  /** Navigate to a path with the current locale prefix */
  const navigateLocale = useCallback(
    (path: string, options?: { replace?: boolean }) => {
      const prefixed = localePath(path, currentLocale);
      navigate(prefixed, options);
    },
    [currentLocale, navigate]
  );

  return {
    locale: currentLocale,
    changeLocale,
    navigateLocale,
    localePath: (path: string) => localePath(path, currentLocale),
  };
}
