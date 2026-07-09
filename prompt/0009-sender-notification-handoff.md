# Sender Notification Handoff

## Objective

Add sender-side notifications for message requests so a control device can create a request, the assigned sender device can receive a browser notification, and the notification click opens the pending request and attempts the appropriate WhatsApp, Viber, or SMS handoff.

## Scope

- Make notification permission explicit after the user signs in.
- Watch Firebase Realtime Database for pending requests assigned to the current device.
- Show one notification per pending request on the assigned sender device.
- Use notification click-through URLs to focus the pending request and attempt the external app handoff.
- Keep manual buttons as the fallback path.
- Update service worker notification click handling.
- Update README with the notification behavior and platform limits.

## Constraints

- Do not attempt silent background sending.
- Do not automate WhatsApp, Viber, SMS, iMessage, or third-party app UI.
- Browser notification permission must be requested from a user click.
- Without a Web Push backend, notifications only work while the sender PWA is installed/open enough for the app to sync.
- Viber personal deep links can forward/share message text but cannot reliably preselect a phone number.

## Acceptance Criteria

- Signed-out users still cannot access device, sync, or request actions.
- Signed-in users see a clear Enable Notifications action.
- Creating a request for another device writes to Firebase as before.
- The assigned sender device detects pending requests from Firebase and shows a notification when permission is granted.
- Clicking the notification opens the PWA pending view, focuses the request, and attempts the channel handoff.
- SMS links include the recipient and message body where the platform supports it.
- README documents how notification handoff works and what remains limited.

## Execution Notes

- Keep this as a static-hosting compatible implementation.
- Use local storage only for per-device notification de-duplication.
- Preserve user-confirmed send semantics.
