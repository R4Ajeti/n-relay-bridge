# Android Notification Target Debugging

## Objective

Make Android sender notification testing deterministic by exposing the real sender device ID and improving local notification delivery diagnostics.

## Scope

- Show the current device short ID in the device panel.
- Show device short IDs in the linked device list and sender dropdown.
- Mark manually linked devices as manual going forward.
- Add Android-friendly notification options such as tag, timestamp, vibration, and explicit non-silent behavior.
- Add service-worker message handling for notification display fallback.
- Update README with the target-device ID test process.

## Constraints

- Do not implement silent third-party messaging sends.
- Do not claim static Firebase polling is guaranteed closed-app push.
- Preserve current Firebase Hosting deployment path.
- Keep signed-out users gated.

## Acceptance Criteria

- The Android phone shows its own short device ID after saving the device.
- The laptop sender dropdown shows the same short ID so the user can choose the real Android sender.
- Test Notification still works from a user click.
- Service worker can display notifications from a posted message.
- README explains how to distinguish OS notification failure from wrong target selection.
