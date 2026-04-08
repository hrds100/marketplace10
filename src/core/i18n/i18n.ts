import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { DEFAULT_LOCALE, SLUG_TO_LOCALE, LANG_STORAGE_KEY } from './constants';

// Import translation files directly (bundled — small enough for Phase 0)
import enCommon from './locales/en/common.json';
import ptBRCommon from './locales/pt-BR/common.json';
import arCommon from './locales/ar/common.json';
import esCommon from './locales/es/common.json';
import itCommon from './locales/it/common.json';
import frCommon from './locales/fr/common.json';

/** Detect locale from URL path (first segment) */
function detectLocaleFromURL(): string | undefined {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const first = segments[0]?.toLowerCase();
  if (first && first in SLUG_TO_LOCALE) {
    return SLUG_TO_LOCALE[first];
  }
  return undefined;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      'pt-BR': { common: ptBRCommon },
      ar: { common: arCommon },
      es: { common: esCommon },
      it: { common: itCommon },
      fr: { common: frCommon },
    },
    defaultNS: 'common',
    ns: ['common'],
    fallbackLng: DEFAULT_LOCALE,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
    },
  });

// URL locale takes highest priority — override whatever the detector chose
const urlLocale = detectLocaleFromURL();
if (urlLocale) {
  i18n.changeLanguage(urlLocale);
}

export default i18n;
