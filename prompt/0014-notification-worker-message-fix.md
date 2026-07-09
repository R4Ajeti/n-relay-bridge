# Notification Worker Message Fix

## Objective

Fix sender-device notification acceptance/testing so an enabled notification permission can produce a visible service-worker notification on the current device.

## Scope

- Align the page-to-service-worker notification message contract.
- Preserve the existing fallback to `registration.showNotification`.
- Keep notification permission requested only from the user's explicit button click.
- Save screenshots taken during notification debugging under `experimental-resource/notification`.
- Update the public README with current verification and known limits.

## Constraints

- Do not automate WhatsApp, Viber, SMS, iMessage, or third-party app UI.
- Do not claim static hosting provides guaranteed closed-app push delivery.
- Do not collect third-party messaging credentials.
- Keep the implementation compatible with Firebase Hosting.

## Acceptance Criteria

- The service worker handles the message type emitted by the app notification helper.
- The notification helper can detect worker message delivery failures and use the registration fallback.
- Syntax checks pass for the changed files.
- README explains the service-worker notification test behavior and device screenshot limitation.

## Execution Notes

- The suspected bug is that `src/app.js` posts `show-notification`, while `sw.js` only handles `notification-diagnostic`.
- A connected Android phone was not visible through `adb devices` at the start of this work, so phone screenshots may not be available from the shell.
