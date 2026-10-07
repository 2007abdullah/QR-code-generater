/** Entry point: language -> shared chrome -> page module (loaded only for the current page). */
import { initLanguage } from './language.js';
import { renderChrome } from './ui.js';

const PAGES = {
  home: () => import('./pages/home.js'),
  tutorials: () => import('./pages/tutorials.js'),
  scan: () => import('./pages/scan.js')
};

initLanguage();
const page = document.body.dataset.page;
renderChrome(page === 'scan' ? '' : page);

if (PAGES[page]) {
  PAGES[page]()
    .then((mod) => mod.init())
    .catch((err) => {
      console.error(err);
      const main = document.getElementById('main');
      if (main) main.insertAdjacentHTML('afterbegin', '<p class="status status--error container" role="alert">Content could not be loaded. Please refresh the page.</p>');
    });
}
