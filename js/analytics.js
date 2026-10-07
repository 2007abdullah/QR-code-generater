/**
 * Privacy-friendly analytics abstraction (demo: logs to the console only).
 *
 * Safety net: only the keys listed in ALLOWED_KEYS can ever leave this module, and values must be
 * short strings. Coordinates, IPs, names, etc. are impossible to send by accident.
 * To use Plausible or Matomo later, replace `send()` (see README, "Analytics").
 */
const ALLOWED_KEYS = ['product', 'source', 'language', 'from', 'to', 'channel', 'page'];

function sanitize(payload = {}) {
  const clean = {};
  for (const key of ALLOWED_KEYS) {
    const value = payload[key];
    if (typeof value === 'string' && value.length <= 40 && /^[\w .-]+$/.test(value)) clean[key] = value;
  }
  return clean;
}

function send(name, data) {
  // Demo provider. Swap for: window.plausible?.(name, { props: data })
  console.info(`[analytics] ${name}`, data);
}

export function trackEvent(name, payload) {
  send(name, sanitize(payload));
}
