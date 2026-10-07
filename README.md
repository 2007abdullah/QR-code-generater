# ScanGuide: QR Tutorial & Location Sharing Demo

A mobile-first demo site (plain HTML, CSS and JavaScript, no framework, no build step, no backend) showing this journey:

```
QR code -> /q/SD -> 302 redirect -> /scan/safety-detect?src=qr -> tutorial video -> language
        -> share location -> WhatsApp / SMS / copy -> live-location instructions
```

ScanGuide is a **fictional brand** made for a portfolio. Products, videos and copy are placeholders.

---

## 1. Project overview

| Page | Address | Purpose |
|---|---|---|
| Home | `/` | Hero, **Test the QR flow** panel, "Built to demonstrate" |
| Video Tutorials | `/tutorials` | Indexable product grid; every card opens the *same* scan page |
| Scan page | `/scan/<slug>` | The page a QR code leads to (one template for every product) |
| QR short links | `/q/SD`, `/q/HC`, `/q/RT` | Permanent addresses printed in the QR codes |
| About / Contact / Privacy | `/about`, `/contact`, `/privacy` | Simple demo pages |

Core idea: **the QR code never changes, the content behind it can.** Videos live in one file (`products.json`).

## 2. File structure

```
index.html  tutorials.html  scan.html  404.html  about.html  contact.html  privacy.html
products.json            <- ALL product content and video IDs (edit this)
vercel.json              <- Vercel: real 302 redirects, rewrites, security headers
_redirects  _headers     <- Netlify: same rules
robots.txt  sitemap.xml  .nojekyll  package.json
css/    style.css (base, phone layout)   responsive.css (tablet/desktop)
js/
  app.js            entry point, loads the page module
  ui.js             shared header/footer/menu/dialog helpers
  language.js       language detection, saving, translating
  translations.js   ALL interface text in 6 languages (edit this)
  products.js       loads products.json, picks the right video
  router.js         /q and /scan routing, simulated redirects (404 fallback)
  video.js          click-to-load YouTube player
  location.js       browser geolocation only (no network, no storage)
  sharing.js        WhatsApp / SMS / copy + location widget
  analytics.js      privacy-safe event logger (console in the demo)
  not-found.js      script used by 404.html
  pages/            home.js, tutorials.js, scan.js (page-specific code)
assets/  logo.svg  favicon.svg  og-image.png  icons/sprite.svg  posters/*.svg
qr/      SD.svg  HC.svg  RT.svg
tools/   generate-qr.py (makes the QR SVGs)   serve.mjs (local server with real 302s)
```

Run locally: `node tools/serve.mjs` then open http://localhost:3000 (no install needed; any recent Node).

## 3. How to add a new product

1. Open `products.json` and copy one product block into the `products` list.
2. Change `slug` (URL name, lowercase, e.g. `air-check`), `qrCode` (short and unique, e.g. `AC`), `name`, `type`, `description`, `videos`, `languages` and `theme` colours.
3. Add a poster image at the path given in `poster` (16:9, e.g. `assets/posters/air-check.svg` or `.webp`).
4. Generate its QR code: `python3 tools/generate-qr.py https://your-domain.com`
5. Add the redirect line for the new code (see section 8): one line in `vercel.json` **or** `_redirects`.
6. Add the new page to `sitemap.xml` only if it should be indexed (scan pages are `noindex`, so skip it).

The tutorials grid, scan page, test panel and QR demo pick the product up automatically.

## 4. How to change a video

In `products.json`, find the product and replace the ID for the language:

```json
"videos": { "en": "M7lc1UVf-VE", "nl": "M7lc1UVf-VE" }
```

The ID is the part after `v=` in a YouTube link. **No QR code, redirect or HTML needs to change.** If a language has no video, the English one is shown with a short notice. (All IDs in the demo are the same placeholder video; replace them.)

## 5. How to change translations

Open `js/translations.js`. Each language is one block; edit the text on the right of the colon. Keep `{product}` and `{language}` placeholders as they are. Product names/descriptions are in `products.json`.

## 6. How to add a language

1. `js/translations.js`: copy the `en` block, rename it (e.g. `it`), translate it, and add `it: 'Italiano'` to `LANGUAGE_NAMES`.
2. `js/language.js`: add `'it'` to the `SUPPORTED` list.
3. `products.json`: add `it` to each product's `type`, `description`, `videos` and `languages` (missing entries fall back to English).

## 7. How QR redirects work

Printed QR codes contain `https://your-domain/q/SD`. That address is **permanent**. The host answers it with an HTTP **302 (temporary) redirect** to `/scan/safety-detect?src=qr`. Because it is temporary, you can later point `SD` somewhere else (a new product page, a campaign page, a different video) without reprinting. A QR code never points straight to YouTube.

Unknown codes (`/q/ZZ`) go to `/tutorials`, never to an error page. `src=qr` lets analytics tell QR visits from web visits (`src=web`).

**Important:** a real 302 is a server response. JavaScript navigation is *not* the same thing. This demo does both:

- On Vercel/Netlify the **real 302** comes from `vercel.json` / `_redirects`.
- On hosts without redirect rules (GitHub Pages, `python -m http.server`), `404.html` + `js/router.js` **simulate** the same routing in the browser so the demo still works. That is a stand-in for the demo only.

## 8. How production redirects should be configured

- **Vercel:** the `redirects` list in `vercel.json` (already included, `"statusCode": 302`).
- **Netlify:** `_redirects` (already included, `302`).
- **Apache:** `Redirect 302 /q/SD /scan/safety-detect?src=qr` (or `RewriteRule ... [R=302,L]`).
- **Nginx:** `location = /q/SD { return 302 /scan/safety-detect?src=qr; }`
- **CMS / existing platform:** create a temporary (302) redirect rule per short code, or a small route that looks the code up in a table.

The scan page needs one rewrite so `/scan/<anything>` serves `scan.html` (included for Vercel and Netlify). Test with `curl -I https://your-domain/q/SD` and confirm `HTTP/2 302` and a `location:` header.

## 9. How location sharing works

1. The person taps **Share my location** (nothing is requested on page load).
2. `navigator.geolocation.getCurrentPosition()` runs with `enableHighAccuracy: true, timeout: 10000, maximumAge: 0`.
3. Coordinates are rounded to 5 decimals and turned into `https://www.google.com/maps/search/?api=1&query=LAT,LNG`.
4. A message "I'm here: <link>" is built and offered as:
   - WhatsApp: `https://wa.me/?text=<encoded message>`
   - SMS: `sms:?&body=<encoded message>`
   - Copy: `navigator.clipboard.writeText()` (with a fallback)
5. The WhatsApp/SMS buttons are real links shown *after* the location is found, so the final tap is a genuine user gesture. This is more reliable on iOS than opening apps from async code.

Errors are handled and translated: permission denied, position unavailable, timeout, unsupported browser, clipboard blocked.

## 10. Why location is not sent to the server

- There is no backend and no API for location. The site is static files.
- `js/location.js` makes no network requests and uses no storage; coordinates only exist in a JavaScript variable until the tab is closed or **Clear location** is pressed.
- Analytics (`js/analytics.js`) only accepts a fixed list of keys (`product, source, language, from, to, channel, page`), so coordinates cannot be sent even by mistake.
- Verified in the automated browser test: after sharing, no network request contained the coordinates and nothing was written to `localStorage`.

Honest limits: the host still sees normal connection data (e.g. IP address) like any website, which reveals an approximate network location. And once someone sends the link through WhatsApp/SMS, that app and its provider handle it.

## 11. Deploy to Vercel

1. Push this folder to a GitHub repository (or run `npx vercel` in the folder).
2. In Vercel: **Add New > Project**, import the repo.
3. Framework preset: **Other**. Build command: empty. Output directory: `.` (root).
4. Deploy. `vercel.json` is picked up automatically.
5. Set your real domain, then rerun `python3 tools/generate-qr.py https://your-domain.com` and update the `https://scanguide-demo.vercel.app` URLs in the HTML meta tags, `sitemap.xml` and `robots.txt`.

## 12. Deploy to Netlify

1. Drag the folder onto https://app.netlify.com/drop, or connect the repo.
2. Build command: empty. Publish directory: `.`
3. `_redirects` and `_headers` are picked up automatically. Update URLs as in step 5 above.

(GitHub Pages also works for the demo using the 404 simulation, but it cannot do real 302s and project sites live under a sub-path, so use a custom domain at the root.)

## 13. How to test on mobile

Geolocation, clipboard and many app links need **HTTPS**, so test on a real deployment, not `http://192.168...`.

1. Deploy (section 11/12) and open the site on a phone.
2. Open `/` on a laptop, scan the QR code on screen with the phone camera.
3. Check: scan page loads fast, poster shows, video plays after tapping, language selector works, **Share my location** asks for permission only after the tap, WhatsApp/SMS/Copy work, the live-location guide opens.
4. Deny the permission once to see the error message, then allow it in the browser/site settings and retry.
5. Repeat on at least one iPhone (Safari) and one Android phone (Chrome). Test with the phone language set to Dutch, German, etc.
6. Quick desktop check: Chrome DevTools > device toolbar (320, 375, 390, 414, 768, 1024). Sensors panel can fake a location.

**Printed QR codes:** test on multiple iPhones and Android phones, in low light, at different distances and angles, and on printed proofs of the real material (gloss, curved surfaces) before any print run.

## 14. Accessibility checklist (WCAG 2.2 AA targets)

- [x] Semantic landmarks, one `h1` per page, logical heading order
- [x] Skip link, full keyboard operation, visible focus ring
- [x] Native `<dialog>` modals: focus is trapped, Escape closes, focus returns to the opener
- [x] Labelled language selects, descriptive iframe `title`, alt text on images
- [x] Status and error messages in a polite live region (`role="status"`), errors not conveyed by colour alone
- [x] Interactive controls are at least 44x44px; text meets AA contrast
- [x] Reduced-motion respected (the single scan-line animation is disabled)
- [ ] To do before launch: screen reader pass (VoiceOver + TalkBack), zoom to 200%/400%, real-device contrast check

## 15. Performance checklist

- [x] No framework, no third-party scripts, no web fonts (system font stack), about 17 KB of gzipped JS in total (including all six languages), loaded as ES modules; only the current page's module is fetched
- [x] YouTube iframe is **not** created until Play is pressed
- [x] Images are lazy-loaded with width/height set; the video box reserves its space (no layout shift)
- [x] SVG posters and QR codes are tiny; icons come from one sprite
- [x] Cache headers set in `vercel.json` / `_headers`
- [ ] To do: replace placeholder posters with compressed WebP/AVIF (about 40 KB), run Lighthouse on the live URL
- [ ] Optional: self-host a brand webfont (WOFF2, `font-display: swap`) and add a service worker

## 16. Privacy considerations

- Location requested only after a tap; never sent to or stored by the site (section 10).
- Only `scanguide_lang` (language preference) is stored in `localStorage`.
- Videos use `youtube-nocookie.com` and load only after Play. YouTube then applies its own terms.
- A strict Content-Security-Policy and `Permissions-Policy` are included in the host config.
- The Privacy page is demo wording. **It makes no GDPR or other compliance claim.** Have the client's legal adviser review it before launch.

## 17. Production TODOs

- Replace the placeholder video IDs, posters, product copy, About/Contact/Privacy text and the `scanguide-demo.vercel.app` URLs.
- Replace the poster SVGs in `VideoObject` data (`tutorials.html`) with real thumbnails (JPG/WebP), real upload dates and descriptions. Search engines need real data; the current values are placeholders.
- Confirm the live-location steps against current WhatsApp and Google Maps versions on iOS and Android; menu names change.
- Decide on analytics (below), cookie/consent needs, and an incident/contact process.
- Longer pages (About, Contact, Privacy) are English only; translate them if the client needs it. Have native speakers review all UI translations.
- Add a QR error-correction/size review with the printer; consider level Q/H for curved or small labels.
- Add monitoring for the redirect endpoints (`/q/*`) and a process for changing a redirect target.

### Analytics

`js/analytics.js` exposes `trackEvent(name, payload)` with events `scan`, `video_play`, `video_complete`, `language_change`, `share_once`, `live_guide_open`. Today it logs to the console. To use a privacy-friendly tool:

- **Plausible:** add its script tag (allow the domain in the CSP), then in `send()` call `window.plausible(name, { props: data })`.
- **Matomo:** load the tracker and call `_paq.push(['trackEvent', 'ScanGuide', name, JSON.stringify(data)])`.

Keep the allow-list of keys. Never add coordinates, IP addresses or personal data.

---

## Known limitations (read before promising features)

- A static site **cannot** do server-side 302s without host configuration. The browser fallback is a simulation.
- A web page **cannot** start WhatsApp or Google Maps *live* location. The site only shows instructions and opens the apps. Deep links may not land on the exact screen on every device.
- Browser geolocation does not stop the host from seeing an approximate location from the IP address.
- YouTube subtitles are not automatic in every language. The note tells people to use the CC button if available; add captions to each video yourself.
- `sms:` links behave slightly differently on iPhone and Android (the `?&body=` form works in most cases, not all). Test on devices.
- `video_complete` is detected through YouTube's embed message channel on a best-effort basis and may not fire in every browser.
- Scan pages use `noindex` plus a canonical pointing to the clean `/scan/<slug>` URL. They are meant to be reached by QR, not by search.
