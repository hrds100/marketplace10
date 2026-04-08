/** Supported locales and their metadata */
export const SUPPORTED_LOCALES = ['en', 'pt-BR', 'ar', 'es', 'it', 'fr'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

/** Locale slugs used in URLs (lowercase, hyphenated) */
export const LOCALE_SLUGS: Record<SupportedLocale, string> = {
  en: 'en',
  'pt-BR': 'pt-br',
  ar: 'ar',
  es: 'es',
  it: 'it',
  fr: 'fr',
};

/** Reverse map: URL slug → locale code */
export const SLUG_TO_LOCALE: Record<string, SupportedLocale> = Object.fromEntries(
  Object.entries(LOCALE_SLUGS).map(([locale, slug]) => [slug, locale as SupportedLocale])
) as Record<string, SupportedLocale>;

/** Display metadata for the language switcher */
export const LOCALE_META: Record<SupportedLocale, { flag: string; label: string; nativeLabel: string }> = {
  en: { flag: '\u{1F1EC}\u{1F1E7}', label: 'English', nativeLabel: 'English' },
  'pt-BR': { flag: '\u{1F1E7}\u{1F1F7}', label: 'Portuguese', nativeLabel: 'Portugu\u00eas' },
  ar: { flag: '\u{1F1E6}\u{1F1EA}', label: 'Arabic', nativeLabel: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
  es: { flag: '\u{1F1EA}\u{1F1F8}', label: 'Spanish', nativeLabel: 'Espa\u00f1ol' },
  it: { flag: '\u{1F1EE}\u{1F1F9}', label: 'Italian', nativeLabel: 'Italiano' },
  fr: { flag: '\u{1F1EB}\u{1F1F7}', label: 'French', nativeLabel: 'Fran\u00e7ais' },
};

/** Set of URL slugs for fast lookup (excludes 'en' since English is unprefixed) */
export const NON_DEFAULT_SLUGS = new Set(
  Object.entries(LOCALE_SLUGS)
    .filter(([locale]) => locale !== DEFAULT_LOCALE)
    .map(([, slug]) => slug)
);

/** localStorage key shared with the landing page */
export const LANG_STORAGE_KEY = 'nfstay_lang';
