/** Message links (WhatsApp / SMS / copy) and the location-share widget. */
import { requestLocation, buildMapsUrl, buildMessage, LocationError } from './location.js';
import { t } from './language.js';
import { trackEvent } from './analytics.js';

export const whatsappUrl = (message) => `https://wa.me/?text=${encodeURIComponent(message)}`;
/* iOS and Android parse sms: bodies slightly differently; "?&body=" works on both in most cases. */
export const smsUrl = (message) => `sms:?&body=${encodeURIComponent(message)}`;

export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.className = 'sr-only';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('copy failed');
}

/** Wires up the markup in scan.html. `coords` is kept only in this closure (memory). */
export function initLocationShare() {
  const $ = (id) => document.getElementById(id);
  const startBtn = $('share-location'), status = $('loc-status'), actions = $('loc-actions');
  const preview = $('loc-preview'), wa = $('share-wa'), sms = $('share-sms'), copyBtn = $('share-copy'), clearBtn = $('clear-location');
  let coords = null;

  const say = (text, kind = '') => {
    status.textContent = text;
    status.className = `status ${kind ? `status--${kind}` : ''}`.trim();
  };

  function currentMessage() {
    return buildMessage(buildMapsUrl(coords), t('msgIntro'));
  }

  function render() {
    if (!coords) { actions.hidden = true; return; }
    const message = currentMessage();
    preview.querySelector('span').textContent = message;
    wa.href = whatsappUrl(message);
    sms.href = smsUrl(message);
    actions.hidden = false;
  }

  startBtn.addEventListener('click', async () => {
    startBtn.setAttribute('aria-disabled', 'true');
    startBtn.setAttribute('aria-busy', 'true');
    say(t('locating'));
    try {
      coords = await requestLocation();
      render();
      say(t('locReady'), 'ok');
      wa.focus();
    } catch (err) {
      coords = null;
      render();
      const reason = err instanceof LocationError ? err.reason : 'unavailable';
      say(t({ unsupported: 'errUnsupported', denied: 'errDenied', timeout: 'errTimeout' }[reason] || 'errUnavailable'), 'error');
    } finally {
      startBtn.removeAttribute('aria-disabled');
      startBtn.removeAttribute('aria-busy');
    }
  });

  [['whatsapp', wa], ['sms', sms]].forEach(([channel, el]) =>
    el.addEventListener('click', () => trackEvent('share_once', { channel })));

  copyBtn.addEventListener('click', async () => {
    if (!coords) return;
    try {
      await copyText(currentMessage());
      say(t('copied'), 'ok');
      trackEvent('share_once', { channel: 'copy' });
    } catch (e) {
      say(t('copyFailed'), 'error');
    }
  });

  clearBtn.addEventListener('click', () => {
    coords = null;
    wa.removeAttribute('href');
    sms.removeAttribute('href');
    render();
    say('');
    startBtn.focus();
  });

  // Re-render the message when the language changes (the "I'm here:" text is localised).
  document.addEventListener('languagechange', () => { render(); });
}
