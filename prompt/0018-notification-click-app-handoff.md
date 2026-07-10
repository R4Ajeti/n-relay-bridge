# Notification Click App Handoff

## Objective

Fix Android request notifications so browser-created message requests can be received by the phone and notification taps route toward the requested messaging app.

## Scope

- Inspect the provided Android screenshots in `experimental-resource/notification`.
- Preserve sender-side request notifications from Firebase polling while the sender PWA is active.
- Include the channel-specific handoff URL in request notification data.
- Update service-worker notification click handling to try the requested app handoff first and fall back to the pending-request PWA URL.
- Keep local app launch handoff behavior for cases where direct external opening is blocked.
- Update the public README with the current notification tap behavior and limitations.

## Constraints

- Do not silently send messages.
- Do not automate taps inside WhatsApp, Viber, SMS, iMessage, or other third-party apps.
- Do not collect third-party messaging credentials.
- Do not claim static Firebase polling provides guaranteed closed-app push delivery.
- Keep browser notification permission user-confirmed.

## Acceptance Criteria

- Request notification options include request ID, channel, PWA fallback URL, and channel handoff URL.
- Notification clicks prefer the channel handoff URL when present.
- Notification clicks fall back to opening the PWA pending request if the direct handoff cannot be opened.
- Existing PWA launch handoff remains available through `handoff=1`.
- Syntax checks pass.
- README explains notification receive/click routing and known platform limits.

## Execution Notes

- The screenshots show Android can display test/request notifications, so the fix should focus on reliable routing metadata and click handling.
- Use `https://wa.me/...` for WhatsApp because Android can route it to WhatsApp when installed and configured.
- Keep Viber/SMS deep links as best-effort because custom schemes may be blocked by some browsers from a service worker.
