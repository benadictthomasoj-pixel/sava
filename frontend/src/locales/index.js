/**
 * AAYAM Infrastructure Intelligence — Multilingual Locales Registry
 *
 * Supported Indian Languages & English:
 * - en: English (Canonical default)
 * - ta: Tamil (தமிழ்)
 * - hi: Hindi (हिन्दी)
 * - te: Telugu (తెలుగు)
 * - ml: Malayalam (മലയാളം)
 * - kn: Kannada (ಕನ್ನಡ)
 */

import en from './en';
import ta from './ta';
import hi from './hi';
import te from './te';
import ml from './ml';
import kn from './kn';

export const STORAGE_KEY = 'aayam_ui_language';
export const DEFAULT_LANGUAGE = 'en';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', script: 'Latin' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', script: 'Tamil' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', script: 'Devanagari' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', script: 'Telugu' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', script: 'Malayalam' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', script: 'Kannada' },
];

export const LOCALES = {
  en,
  ta,
  hi,
  te,
  ml,
  kn,
};

/**
 * Checks whether a given language code is supported.
 * @param {string} code
 * @returns {boolean}
 */
export function isSupportedLanguage(code) {
  if (!code || typeof code !== 'string') return false;
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code.toLowerCase().trim());
}

/**
 * Traverses a nested object by dot-separated path (e.g. 'nav.overview')
 * @param {Object} obj
 * @param {string} path
 * @returns {any}
 */
export function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Replaces `{paramName}` placeholders in a template string with provided variable values.
 * @param {string} template
 * @param {Object} vars
 * @returns {string}
 */
export function interpolate(template, vars) {
  if (typeof template !== 'string') return template;
  if (!vars || typeof vars !== 'object') return template;

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? String(vars[key]) : match;
  });
}
