/** Content access: everything about products comes from /products.json. */
const YT_ID = /^[\w-]{11}$/;
let cache = null;

export async function loadProducts() {
  if (!cache) {
    const res = await fetch('/products.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`products.json: HTTP ${res.status}`);
    cache = (await res.json()).products || [];
  }
  return cache;
}

/** Text fields may be a plain string or an object keyed by language; English is the fallback. */
export function localize(value, lang) {
  if (typeof value === 'string') return value;
  return (value && (value[lang] || value.en)) || '';
}

export const findBySlug = (list, slug) => list.find((p) => p.slug === slug);
export const findByQr = (list, code) => list.find((p) => p.qrCode.toLowerCase() === String(code).toLowerCase());

/** Returns { id, lang, fallback } for the best available video, or null if none is configured. */
export function pickVideo(product, lang) {
  const videos = product.videos || {};
  const choose = (l, fallback) => (YT_ID.test(videos[l] || '') ? { id: videos[l], lang: l, fallback } : null);
  return choose(lang, false) || choose('en', true);
}

export function applyTheme(product, root = document.documentElement) {
  if (!product.theme) return;
  root.style.setProperty('--accent', product.theme.accent);
  root.style.setProperty('--accent-soft', product.theme.soft);
}
