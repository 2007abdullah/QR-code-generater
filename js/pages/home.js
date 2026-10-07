import { loadProducts } from '../products.js';
import { applyTranslations, t } from '../language.js';
import { scanPath } from '../router.js';
import { icon, enableDialog, openDialog } from '../ui.js';

export async function init() {
  const products = await loadProducts();
  const grid = document.getElementById('test-grid');
  const dialog = document.getElementById('qr-dialog');
  enableDialog(dialog);

  grid.replaceChildren(...products.map((p) => {
    const card = document.createElement('article');
    card.className = 'card test-card';
    card.style.setProperty('--accent', p.theme.accent);
    card.style.setProperty('--accent-soft', p.theme.soft);
    card.innerHTML = `
      <h3></h3>
      <p class="muted"><span data-i18n="qrLabel"></span>: <span class="code-chip"></span></p>
      <code class="route"></code>
      <div class="btn-row">
        <a class="btn btn--sm" data-open-qr>${icon('qr')}<span data-i18n="openQr"></span></a>
        <a class="btn btn--sm btn--secondary" data-open-scan><span data-i18n="openScan"></span></a>
        <button type="button" class="btn btn--sm btn--secondary" data-view-qr><span data-i18n="viewQr"></span></button>
      </div>`;
    card.querySelector('h3').textContent = p.name;
    card.querySelector('.code-chip').textContent = p.qrCode;
    card.querySelector('.route').textContent = `/q/${p.qrCode}  >  ${scanPath(p.slug, { src: 'qr' })}`;
    card.querySelector('[data-open-qr]').href = `/q/${p.qrCode}`;
    card.querySelector('[data-open-scan]').href = scanPath(p.slug, { src: 'web' });
    card.querySelector('[data-view-qr]').addEventListener('click', () => {
      dialog.querySelector('img').src = `/qr/${p.qrCode}.svg`;
      dialog.querySelector('img').alt = `${t('qrLabel')} ${p.qrCode} - ${p.name}`;
      dialog.querySelector('h2').textContent = `${p.name} (${p.qrCode})`;
      dialog.querySelector('code').textContent = `${location.origin}/q/${p.qrCode}`;
      openDialog(dialog);
    });
    return card;
  }));
  applyTranslations(grid);
}
