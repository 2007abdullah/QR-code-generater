import { loadProducts, localize } from '../products.js';
import { getLanguage, languageName, t } from '../language.js';
import { scanPath } from '../router.js';

export async function init() {
  const products = await loadProducts();
  const grid = document.getElementById('card-grid');
  const notice = document.getElementById('ref-notice');

  if (new URLSearchParams(location.search).get('ref')?.startsWith('unknown')) notice.hidden = false;

  function render() {
    const lang = getLanguage();
    document.title = `${t('tutorialsTitle')} | ScanGuide`;
    grid.replaceChildren(...products.map((p) => {
      const name = p.name;
      const card = document.createElement('article');
      card.className = 'card t-card';
      card.style.setProperty('--accent', p.theme.accent);
      card.style.setProperty('--accent-soft', p.theme.soft);

      const img = new Image();
      img.src = p.poster;
      img.alt = `${name}`;
      img.width = 640;
      img.height = 360;
      img.loading = 'lazy';
      img.decoding = 'async';

      const body = document.createElement('div');
      body.className = 't-body';
      const h2 = document.createElement('h2');
      h2.textContent = name;
      h2.style.setProperty('font-size', '1.35rem');
      const type = document.createElement('p');
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = localize(p.type, lang);
      type.append(pill);
      const desc = document.createElement('p');
      desc.className = 'muted';
      desc.textContent = localize(p.description, lang);

      const langs = document.createElement('ul');
      langs.className = 'langs';
      langs.setAttribute('aria-label', t('languagesLabel'));
      (p.languages || Object.keys(p.videos)).forEach((code) => {
        const li = document.createElement('li');
        li.textContent = code.toUpperCase();
        li.title = languageName(code);
        langs.append(li);
      });

      const cta = document.createElement('a');
      cta.className = 'btn';
      cta.href = scanPath(p.slug, { lang, src: 'web' });
      cta.append(t('watch'));
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = ` - ${name}`;
      cta.append(sr);

      body.append(h2, type, desc, langs, cta);
      card.append(img, body);
      return card;
    }));
  }

  render();
  document.addEventListener('languagechange', render);
}
