import { loadProducts, findBySlug, localize, pickVideo, applyTheme } from '../products.js';
import { getLanguage, languageName, t } from '../language.js';
import { getScanSlug, getSource, toTutorials } from '../router.js';
import { mountVideo, showMissingVideo } from '../video.js';
import { initLocationShare } from '../sharing.js';
import { trackEvent } from '../analytics.js';
import { enableDialog, openDialog } from '../ui.js';

const $ = (id) => document.getElementById(id);

export async function init() {
  const slug = getScanSlug();
  const products = await loadProducts();
  const product = slug && findBySlug(products, slug);
  if (!product) return toTutorials('unknown-product'); // never a dead end

  applyTheme(product);
  // Scan pages are reached through QR codes: keep them out of search results, canonical = clean URL.
  $('canonical').href = `${location.origin}/scan/${product.slug}`;

  // Menu items from products.json decide which sections exist for this product.
  document.querySelectorAll('[data-section]').forEach((el) => {
    el.hidden = !(product.menu || ['video', 'location']).includes(el.dataset.section);
  });

  trackEvent('scan', { product: product.slug, source: getSource(), language: getLanguage() });

  initLocationShare();
  setupLiveGuide(product);
  render(product);
  document.addEventListener('languagechange', () => render(product));
}

function render(product) {
  const lang = getLanguage();
  document.title = `${product.name} | ScanGuide`;
  $('product-name').textContent = product.name;
  $('product-type').textContent = localize(product.type, lang);
  $('product-desc').textContent = localize(product.description, lang);
  renderVideo(product, lang);
  renderGuideSteps();
}

function renderVideo(product, lang) {
  const mount = $('video-mount');
  const video = pickVideo(product, lang);
  const note = $('video-fallback');
  if (!video) { showMissingVideo(mount); note.hidden = true; return; }

  const title = t('videoTitle', { product: product.name, language: languageName(video.lang) });
  $('video-title').textContent = title;
  $('video-lang').textContent = `${t('videoLang')}: ${languageName(video.lang)}`;
  note.hidden = !video.fallback;
  note.textContent = video.fallback ? t('videoFallback', { language: languageName(lang) }) : '';

  mountVideo(mount, { id: video.id, title, poster: product.poster, lang: video.lang }, {
    onPlay: () => trackEvent('video_play', { product: product.slug, language: video.lang }),
    onComplete: () => trackEvent('video_complete', { product: product.slug, language: video.lang })
  });
}

/* ---------- Live-location guide (instructions only; a web page cannot start live sharing) ---------- */
function setupLiveGuide(product) {
  const dialog = $('live-guide');
  enableDialog(dialog);
  $('open-live').addEventListener('click', () => {
    trackEvent('live_guide_open', { channel: 'guide', product: product.slug });
    openDialog(dialog);
  });
  $('open-wa').addEventListener('click', () => trackEvent('live_guide_open', { channel: 'whatsapp' }));
  $('open-maps').addEventListener('click', () => trackEvent('live_guide_open', { channel: 'google_maps' }));
}

function renderGuideSteps() {
  [['wa-steps', 'waSteps'], ['gm-steps', 'gmSteps']].forEach(([id, key]) => {
    $(id).replaceChildren(...t(key).map((text) => Object.assign(document.createElement('li'), { textContent: text })));
  });
}
