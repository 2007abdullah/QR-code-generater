/** Click-to-load YouTube player (privacy-enhanced domain). No iframe exists until the user presses play. */
import { t } from './language.js';

const YT_ORIGIN = 'https://www.youtube-nocookie.com';
let stopListening = () => {};

function icon(name) {
  return `<svg class="icon" aria-hidden="true" focusable="false"><use href="/assets/icons/sprite.svg#${name}"></use></svg>`;
}

/**
 * @param {HTMLElement} mount  container to fill
 * @param {{id:string, title:string, poster:string, lang:string}} opts
 * @param {{onPlay?:Function, onComplete?:Function}} hooks
 */
export function mountVideo(mount, { id, title, poster, lang }, { onPlay, onComplete } = {}) {
  stopListening();
  mount.textContent = '';

  const frame = document.createElement('div');
  frame.className = 'video-frame';

  const img = new Image();
  img.src = poster;
  img.alt = '';
  img.width = 640;
  img.height = 360;
  img.loading = 'lazy';
  img.decoding = 'async';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'play-btn';
  btn.setAttribute('aria-label', `${t('playVideo')}: ${title}`);
  btn.innerHTML = `<span class="disc">${icon('play')}</span>`;

  frame.append(img, btn);
  mount.append(frame);

  btn.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    const params = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1', hl: lang, enablejsapi: '1', origin: location.origin });
    iframe.src = `${YT_ORIGIN}/embed/${encodeURIComponent(id)}?${params}`;
    iframe.title = title;
    iframe.loading = 'lazy';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.replaceChildren(iframe);
    iframe.focus();
    if (onPlay) onPlay();
    if (onComplete) stopListening = listenForEnd(iframe, onComplete);
  });
}

/** Best-effort "video finished" detection through YouTube's postMessage channel (no extra scripts). */
function listenForEnd(iframe, onComplete) {
  let done = false;
  const handler = (event) => {
    if (event.origin !== YT_ORIGIN || event.source !== iframe.contentWindow) return;
    let data;
    try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch (e) { return; }
    const ended = data && ((data.event === 'onStateChange' && data.info === 0) || (data.info && data.info.playerState === 0));
    if (ended && !done) { done = true; onComplete(); }
  };
  window.addEventListener('message', handler);
  iframe.addEventListener('load', () => {
    const post = (msg) => iframe.contentWindow.postMessage(JSON.stringify(msg), YT_ORIGIN);
    post({ event: 'listening', id: 1, channel: 'widget' });
    post({ event: 'command', func: 'addEventListener', args: ['onStateChange'] });
  });
  return () => window.removeEventListener('message', handler);
}

export function showMissingVideo(mount) {
  stopListening();
  mount.textContent = '';
  const p = document.createElement('p');
  p.className = 'status status--error';
  p.setAttribute('role', 'alert');
  p.textContent = t('videoMissing');
  mount.append(p);
}
