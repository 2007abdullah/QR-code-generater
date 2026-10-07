/** Language detection, persistence and UI translation. */
import { TRANSLATIONS, LANGUAGE_NAMES } from './translations.js';
import { trackEvent } from './analytics.js';

export const SUPPORTED = ['en', 'nl', 'es', 'fr', 'de', 'pt'];
export const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'scanguide_lang';
let current = DEFAULT_LANGUAGE;

const normalise = (value) => (typeof value === 'string' ? value.toLowerCase().split(/[-_]/)[0] : '');

/** Priority: 1) ?lang=  2) saved choice  3) phone/browser language  4) English. */
export function detectLanguage() {
  const fromUrl = normalise(new URLSearchParams(location.search).get('lang'));
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* storage blocked: ignore */ }
  const fromPhone = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).map(normalise);
  return [fromUrl, normalise(saved), ...fromPhone].find((l) => SUPPORTED.includes(l)) || DEFAULT_LANGUAGE;
}

export const getLanguage = () => current;
export const languageName = (code) => LANGUAGE_NAMES[code] || code;

export function t(key, vars = {}) {
  const value = (TRANSLATIONS[current] && TRANSLATIONS[current][key]) ?? TRANSLATIONS.en[key] ?? key;
  if (typeof value !== 'string') return value;
  return value.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m));
}

/** Fills elements marked with data-i18n (text), data-i18n-label (aria-label), data-i18n-title (title). */
export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-label]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
  root.querySelectorAll('[data-i18n-title]').forEach((el) => el.setAttribute('title', t(el.dataset.i18nTitle)));
  document.documentElement.lang = current;
}

function syncSelects() {
  document.querySelectorAll('select[data-lang-select]').forEach((sel) => { sel.value = current; });
}

/** Keeps ?lang= in the address bar truthful (without reloading) when it is already present. */
function syncUrl() {
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) {
    url.searchParams.set('lang', current);
    history.replaceState(null, '', url);
  }
}

export function setLanguage(lang, { fromUser = true } = {}) {
  if (!SUPPORTED.includes(lang)) return;
  const previous = current;
  current = lang;
  if (fromUser) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
    syncUrl();
    if (previous !== lang) trackEvent('language_change', { from: previous, to: lang });
  }
  applyTranslations();
  syncSelects();
  document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang, previous } }));
}

/** Turns every <select data-lang-select> into a working language picker. */
export function bindLanguageSelects(root = document) {
  root.querySelectorAll('select[data-lang-select]').forEach((sel) => {
    if (!sel.options.length) {
      SUPPORTED.forEach((code) => sel.add(new Option(languageName(code), code)));
      sel.addEventListener('change', () => setLanguage(sel.value));
    }
    sel.value = current;
  });
}

export function initLanguage() {
  current = detectLanguage();
  document.documentElement.lang = current;
}
