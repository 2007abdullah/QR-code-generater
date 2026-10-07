/** Shared page chrome: header, footer, mobile menu and dialog helpers. One place to edit navigation. */
import { applyTranslations, bindLanguageSelects } from './language.js';

export const icon = (name) =>
  `<svg class="icon" aria-hidden="true" focusable="false"><use href="/assets/icons/sprite.svg#${name}"></use></svg>`;

const NAV = [
  { key: 'home', href: '/', label: 'navHome' },
  { key: 'tutorials', href: '/tutorials', label: 'navTutorials' },
  { key: 'about', href: '/about', label: 'navAbout' },
  { key: 'contact', href: '/contact', label: 'navContact' }
];
const FOOTER = [
  { key: 'tutorials', href: '/tutorials', label: 'navTutorials' },
  { key: 'privacy', href: '/privacy', label: 'fPrivacy' },
  { key: 'contact', href: '/contact', label: 'navContact' },
  { key: 'about', href: '/about', label: 'navAbout' }
];

const links = (items, page) =>
  items.map((i) => `<li><a href="${i.href}" data-i18n="${i.label}"${i.key === page ? ' aria-current="page"' : ''}></a></li>`).join('');

function renderHeader(page) {
  const header = document.getElementById('site-header');
  if (!header) return;
  header.innerHTML = `
    <div class="container header-bar">
      <a class="brand" href="/" aria-label="ScanGuide"><img src="/assets/logo.svg" alt="ScanGuide" width="176" height="36"></a>
      <nav id="site-nav" class="nav" data-i18n-label="menu"><ul>${links(NAV, page)}</ul></nav>
      <div class="header-tools">
        <div class="lang">
          ${icon('globe')}
          <label class="sr-only" for="lang-select" data-i18n="language"></label>
          <select id="lang-select" data-lang-select></select>
        </div>
        <button type="button" class="menu-btn" aria-expanded="false" aria-controls="site-nav" data-i18n-label="menu">${icon('menu')}</button>
      </div>
    </div>`;

  const btn = header.querySelector('.menu-btn');
  const nav = header.querySelector('.nav');
  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.innerHTML = icon(open ? 'close' : 'menu');
  };
  btn.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); btn.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !e.composedPath().includes(header)) setOpen(false);
  });
}

function renderFooter(page) {
  const footer = document.getElementById('site-footer');
  if (!footer) return;
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="container footer-grid">
      <nav aria-label="Footer"><ul class="footer-nav">${links(FOOTER, page)}</ul></nav>
      <small>&copy; ${new Date().getFullYear()} ScanGuide. <span data-i18n="rights"></span></small>
    </div>`;
}

export function renderChrome(page) {
  renderHeader(page);
  renderFooter(page);
  bindLanguageSelects();
  applyTranslations();
}

/** Backdrop click + [data-close] buttons close a <dialog>. Escape is handled natively. */
export function enableDialog(dialog) {
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
  });
}

export function openDialog(dialog) {
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}
