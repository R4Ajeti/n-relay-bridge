# Skill 02: Service Worker and Offline Fallback

## Purpose

Give the PWA a reliable app shell and a clear offline state.

## Use When

- Adding offline behavior.
- Caching the app shell.
- Preventing the default browser offline error page.
- Preparing for push notifications or background events.

## Implementation Notes

- Register a service worker from the main app.
- Precache core shell files during the service worker `install` event.
- Clean old caches during `activate`.
- For navigation requests, return `offline.html` when network fetch fails.
- Cache static same-origin assets after successful fetch.
- Do not cache sensitive account data in the static app shell.

## Acceptance Checks

- Service worker registration succeeds on localhost or HTTPS.
- Reload works after the app shell has been cached.
- Offline navigation shows the app's offline page.
- Updating the cache name clears old app shell versions.

## Sources

- web.dev Service Workers: https://web.dev/learn/pwa/service-workers
- MDN Offline and Background Operation: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
- web.dev PWA Checklist: https://web.dev/articles/pwa-checklist
