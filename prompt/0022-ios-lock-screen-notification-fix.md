# iOS Lock-Screen Notification Fix

## Objective

Find and fix why notification handoff alerts do not reliably appear on a connected iOS device when the phone is locked.

## Scope

- Inspect the PWA notification flow, including permission checks, service worker notification rendering, device registration, and sender targeting.
- Improve iOS-facing diagnostics so the app clearly reports whether the device is installed as a Home Screen web app, has notification permission, and has service worker notification support.
- Keep the implementation within web platform limits for iOS PWAs.
- Update public README guidance for iOS lock-screen notification setup and limitations.

## Constraints

- Do not attempt to silently automate taps or sends inside WhatsApp, Viber, SMS, iMessage, or other third-party messaging apps.
- Do not collect third-party messaging credentials.
- Use user-confirmed handoff flows only.
- True automated background sending requires official messaging APIs and is out of scope.
- iOS Web Push notifications require a Home Screen web app on iOS/iPadOS 16.4 or later and user-granted notification permission.

## Acceptance Criteria

- The app distinguishes iOS Safari/browser mode from iOS Home Screen app mode in notification diagnostics.
- The app avoids claiming locked-screen notification readiness when iOS cannot support it in the current install context.
- Service worker notification payload handling remains compatible with background delivery.
- README documents how to test iOS locked-screen notifications and known platform limitations.
- Relevant local verification commands pass or any blockers are documented.

## Execution Notes

- Start by reading the current app, service worker, Firebase client, manifest, package scripts, and README notification sections.
- Prefer focused UI/logic changes over broad refactors.
- Verify with existing scripts and, if feasible, a local server smoke test.
