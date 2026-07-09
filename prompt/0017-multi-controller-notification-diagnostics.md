# Multi-Controller Notification Diagnostics

## Objective

Diagnose and fix sender notifications so one sender phone can receive message-request notifications from many controller devices without confusion from stale or duplicate control device records.

## Scope

- Use the connected Android phone to inspect the live PWA/WebAPK state, notification permission, service worker state, current device ID, and saved devices.
- Confirm whether many control devices are supported by the data model.
- Improve the app so active/current devices are easier to identify and stale device records are less likely to be selected by mistake.
- Keep support for multiple controller devices.
- Add diagnostics or UI metadata where it helps users pick the real sender device and understand notification readiness.
- Update README with the verified notification behavior and limitations.

## Constraints

- Do not add silent background sending or third-party app automation.
- Do not require messaging credentials.
- Do not remove support for multiple controllers.
- Keep changes scoped to local/Firebase device targeting and notification diagnostics.
- Preserve user-confirmed messaging handoff behavior.

## Acceptance Criteria

- A controller-created request can target the current sender phone device and trigger a sender notification when permission is granted and the sender PWA is active.
- The sender dropdown clearly distinguishes sender devices from control devices and prioritizes likely-current sender devices.
- Web controllers stop retaining stale sender targets after account sync unless the user manually picks a different sender.
- The device list exposes enough recency/current-device detail to identify stale duplicate devices.
- The app does not imply that multiple controllers block notifications.
- Phone-based checks and screenshots are captured during diagnosis.
- Project checks and build pass.

## Execution Notes

- Use Android Debug Bridge and Chrome DevTools Protocol against the connected phone for state inspection.
- Prefer small, transparent UI labels over hidden heuristics.
- If stale records are the issue, make the selected target safer rather than deleting user records automatically.
