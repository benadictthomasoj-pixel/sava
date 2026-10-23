import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  STORAGE_KEY,
  LOCALES,
  isSupportedLanguage,
  getNestedValue,
  interpolate,
} from '../locales';

const LanguageContext = createContext(null);

/**
 * Reads initial language preference strictly from localStorage.
 * Guaranteed never to read or tamper with sessionStorage or network.
 */
function getInitialLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isSupportedLanguage(saved)) {
      return saved.toLowerCase().trim();
    }
  } catch (err) {
    // In restricted iframe or private browsing environments, gracefully fallback
    console.warn('Could not read saved language from localStorage:', err);
  }

  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => getInitialLanguage());

  // Synchronize document.documentElement.lang whenever active language changes
  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = language;
    }
  }, [language]);

  /**
   * Safely switches the active language.
   * Persists only to localStorage under 'aayam_ui_language'.
   * Never touches sessionStorage, auth tokens, URL hashes, or network APIs.
   */
  const setLanguage = useCallback((newLang) => {
    if (!newLang || typeof newLang !== 'string') return;
    const normalized = newLang.toLowerCase().trim();

    if (!isSupportedLanguage(normalized)) {
      console.warn(`Unsupported language code: '${newLang}'. Falling back to '${DEFAULT_LANGUAGE}'.`);
      setLanguageState(DEFAULT_LANGUAGE);
      try {
        window.localStorage.setItem(STORAGE_KEY, DEFAULT_LANGUAGE);
      } catch (err) {
        console.warn('Could not persist language to localStorage:', err);
      }
      return;
    }

    setLanguageState(normalized);
    try {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } catch (err) {
      console.warn('Could not persist language to localStorage:', err);
    }
  }, []);

  /**
   * Translation helper function.
   * Signature: t(key, [fallbackOrVars], [vars])
   *
   * Usage examples:
   * - t('nav.overview')
   * - t('nav.overview', 'Overview Fallback')
   * - t('demo.visibleCount', { count: 3 })
   * - t('demo.visibleCount', '{count} visible', { count: 3 })
   *
   * Guarantees:
   * - Never returns undefined.
   * - Falls back to English if the key is missing in active language.
   * - Falls back to fallback string or key if missing in both.
   * - Replaces {interpolated} variables safely.
   */
  const t = useCallback(
    (key, fallbackOrVars, maybeVars) => {
      if (!key || typeof key !== 'string') return '';

      let fallbackText = null;
      let vars = null;

      if (typeof fallbackOrVars === 'string') {
        fallbackText = fallbackOrVars;
        if (maybeVars && typeof maybeVars === 'object') {
          vars = maybeVars;
        }
      } else if (fallbackOrVars && typeof fallbackOrVars === 'object') {
        vars = fallbackOrVars;
      } else if (maybeVars && typeof maybeVars === 'object') {
        vars = maybeVars;
      }

      // 1. Look up in active language dictionary
      const activeLocale = LOCALES[language] || LOCALES[DEFAULT_LANGUAGE];
      let val = getNestedValue(activeLocale, key);

      // 2. If missing in active language, fallback to English dictionary
      if (val === undefined || val === null || val === '') {
        const enLocale = LOCALES[DEFAULT_LANGUAGE];
        val = getNestedValue(enLocale, key);
      }

      // 3. If still missing, fallback to custom fallback string or key itself
      if (val === undefined || val === null) {
        val = fallbackText !== null ? fallbackText : key;
      }

      // 4. Interpolate variables if provided
      if (vars && typeof val === 'string') {
        return interpolate(val, vars);
      }

      return typeof val === 'string' ? val : String(val);
    },
    [language]
  );

  const currentLanguageMeta = useMemo(() => {
    return (
      SUPPORTED_LANGUAGES.find((lang) => lang.code === language) ||
      SUPPORTED_LANGUAGES[0]
    );
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      supportedLanguages: SUPPORTED_LANGUAGES,
      currentLanguageMeta,
      isRTL: false, // All 6 supported languages are LTR
    }),
    [language, setLanguage, t, currentLanguageMeta]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

const defaultLanguageContext = {
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key, fallbackOrVars, maybeVars) => {
    let fallbackText = null;
    let vars = null;
    if (typeof fallbackOrVars === 'string') {
      fallbackText = fallbackOrVars;
      if (maybeVars && typeof maybeVars === 'object') vars = maybeVars;
    } else if (fallbackOrVars && typeof fallbackOrVars === 'object') {
      vars = fallbackOrVars;
    } else if (maybeVars && typeof maybeVars === 'object') {
      vars = maybeVars;
    }

    let val = getNestedValue(LOCALES[DEFAULT_LANGUAGE], key);
    if (val === undefined || val === null) {
      val = fallbackText !== null ? fallbackText : key;
    }
    if (vars && typeof val === 'string') {
      return interpolate(val, vars);
    }
    return typeof val === 'string' ? val : String(val);
  },
  supportedLanguages: SUPPORTED_LANGUAGES,
  currentLanguageMeta: SUPPORTED_LANGUAGES[0],
  isRTL: false,
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  return context || defaultLanguageContext;
}
