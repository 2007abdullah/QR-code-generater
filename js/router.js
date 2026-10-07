/**
 * Routing helpers.
 *
 * In production the HOST does the routing (see vercel.json / _redirects):
 *   /q/SD  --HTTP 302-->  /scan/safety-detect?src=qr
 *   /scan/<slug>  --rewrite-->  scan.html
 * If a host has no such rules (GitHub Pages, python -m http.server), 404.html calls handleNotFound(),
 * which SIMULATES the same behaviour in the browser. A client-side jump is NOT an HTTP 302.
 */
import { loadProducts, findByQr, findBySlug } from './products.js';

const SLUG = /^[a-z0-9-]{1,60}$/;
const SOURCES = ['qr', 'web'];
const STATIC_PAGES = ['tutorials', 'about', 'contact', 'privacy'];

export function scanPath(slug, { lang, src } = {}) {
  const params = new URLSearchParams();
  if (lang) params.set('lang', lang);
  if (src) params.set('src', src);
  const qs = params.toString();
  return `/scan/${slug}${qs ? `?${qs}` : ''}`;
}

/** Product slug from /scan/<slug> (real route) or ?product=<slug> (fallback route). */
export function getScanSlug() {
  const fromPath = location.pathname.match(/^\/scan\/([^/]+)\/?$/);
  const raw = (fromPath && decodeURIComponent(fromPath[1])) || new URLSearchParams(location.search).get('product') || '';
  const slug = raw.toLowerCase();
  return SLUG.test(slug) ? slug : null;
}

/** Only known values are accepted for ?src= (invalid input becomes "direct"). */
export function getSource() {
  const src = new URLSearchParams(location.search).get('src');
  return SOURCES.includes(src) ? src : 'direct';
}

export const toTutorials = (ref) => location.replace(`/tutorials${ref ? `?ref=${ref}` : ''}`);

/** Used by 404.html on hosts without redirect rules. */
export async function handleNotFound() {
  const path = location.pathname.replace(/\/+$/, '');
  const qr = path.match(/^\/q\/([^/]+)$/i);
  const scan = path.match(/^\/scan\/([^/]+)$/i);
  const page = path.slice(1);

  if (STATIC_PAGES.includes(page)) return location.replace(`/${page}.html${location.search}`);
  if (!qr && !scan) return false;

  try {
    const products = await loadProducts();
    if (qr) {
      const product = findByQr(products, decodeURIComponent(qr[1]));
      if (!product) return location.replace('/tutorials.html?ref=unknown-qr');
      return location.replace(`/scan.html?product=${product.slug}&src=qr`);
    }
    const product = findBySlug(products, decodeURIComponent(scan[1]).toLowerCase());
    if (!product) return location.replace('/tutorials.html?ref=unknown-product');
    const params = new URLSearchParams(location.search);
    params.set('product', product.slug);
    return location.replace(`/scan.html?${params}`);
  } catch (e) {
    return location.replace('/tutorials.html');
  }
}
