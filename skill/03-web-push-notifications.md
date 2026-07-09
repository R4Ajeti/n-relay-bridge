# Skill 03: Web Push Notifications

## Purpose

Notify the sender device that a message request is waiting for user review.

## Use When

- Adding sender-device alerts.
- Implementing push subscription storage.
- Asking the user for notification permission.
- Testing iOS Home Screen PWA notification behavior.

## Implementation Notes

- Use the Push API, Notifications API, and service workers together.
- Ask notification permission only after direct user interaction.
- Store push subscriptions per trusted linked device.
- On iOS, require the web app to be added to the Home Screen.
- Treat notifications as attention/wakeup signals only.
- Never use push to trigger automatic message sending.

## Acceptance Checks

- User can grant or deny notification permission.
- Browser creates a push subscription where supported.
- Backend can associate a subscription with a linked device.
- A push event displays a notification.
- Notification click opens the pending request view.

## Sources

- WebKit Web Push for iOS and iPadOS: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- Apple Sending Web Push Notifications: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
- MDN Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
