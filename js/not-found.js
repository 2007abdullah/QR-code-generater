import { handleNotFound } from '/js/router.js';

handleNotFound().then((handled) => {
  if (handled === false) {
    document.getElementById('nf-title').textContent = 'Page not found';
    document.getElementById('nf-text').textContent = 'That page does not exist. Browse the tutorials instead.';
  }
});
