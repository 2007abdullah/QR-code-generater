/**
 * Browser geolocation, nothing else. No network calls, no storage.
 * Coordinates live only in the caller's memory and are never sent to any server.
 */
export const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

export class LocationError extends Error {
  /** @param {'unsupported'|'denied'|'unavailable'|'timeout'} reason */
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

export const roundCoord = (value, places = 5) => Number(value.toFixed(places));

/** Must be called from a user tap, never on page load. */
export function requestLocation() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new LocationError('unsupported'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: roundCoord(pos.coords.latitude), lng: roundCoord(pos.coords.longitude) }),
      (err) => reject(new LocationError({ 1: 'denied', 2: 'unavailable', 3: 'timeout' }[err.code] || 'unavailable')),
      GEO_OPTIONS
    );
  });
}

export const buildMapsUrl = ({ lat, lng }) =>
  `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(5)},${lng.toFixed(5)}`;

export const buildMessage = (mapsUrl, intro) => `${intro} ${mapsUrl}`;
