# Prompt 0001: Multi-Device PWA Messaging Assistant

## Objective

Build a simple Progressive Web App that lets a user prepare a message request on one linked device and open the appropriate messaging app on another linked device for final manual sending.

The first supported setup is:

- Phone 1: Android, used as the control device.
- Phone 2: iOS, used as the sender device.
- Both devices use the same PWA account.
- Both devices can be linked to the same account.

The PWA must not attempt silent or automatic sending through WhatsApp, Viber, SMS, iMessage, or any other third-party messaging app. The final send action must remain user-confirmed inside the target app.

## Required User Flow

1. The Android phone opens the PWA and logs in.
2. The iOS phone opens the same PWA and logs in to the same account.
3. The user links both devices to the account.
4. The Android phone creates a message request with:
   - recipient,
   - message text,
   - preferred channel,
   - target sender device.
5. The backend stores the request and notifies the iOS device.
6. The iOS PWA displays the pending request.
7. The user selects one of the supported actions:
   - Open WhatsApp with a prepared message.
   - Open Viber with a prepared/share message.
   - Open SMS/iMessage compose screen.
8. The selected app opens.
9. The user manually confirms and sends the message.

## Core Product Rules

- The system is a messaging assistant, not an automation bypass.
- No background sending through personal WhatsApp, Viber, SMS, or iMessage accounts.
- No attempt to control another app's UI.
- No hidden sending, spoofing, scraping, or credential collection.
- Every send action must require visible user confirmation.
- Device linking must be explicit and revocable.

## Basic PWA Skills To Use

Use no more than these four capability areas for the initial build:

1. [Web App Manifest and Installability](../skill/01-web-app-manifest-installability.md)
2. [Service Worker and Offline Fallback](../skill/02-service-worker-offline.md)
3. [Web Push Notifications](../skill/03-web-push-notifications.md)
4. [Messaging Deep Links](../skill/04-messaging-deep-links.md)

## Suggested MVP Architecture

- **Frontend:** PWA with responsive mobile-first UI.
- **Backend:** API for accounts, linked devices, message requests, request status, and push subscriptions.
- **Storage:** database tables for users, devices, message requests, and audit events.
- **Notifications:** Web Push for sender-device alerts.
- **Security:** authenticated API calls, device-level tokens, request ownership checks, and audit logs.

## Suggested Data Model

### User

- `id`
- `email` or `phone`
- `created_at`

### Device

- `id`
- `user_id`
- `display_name`
- `platform`: `android`, `ios`, or `other`
- `role`: `control`, `sender`, or `both`
- `trusted`
- `last_seen_at`

### Message Request

- `id`
- `user_id`
- `created_by_device_id`
- `target_device_id`
- `channel`: `whatsapp`, `viber`, or `sms`
- `recipient`
- `message`
- `status`: `draft`, `pending`, `opened`, `sent_by_user`, `cancelled`, or `failed`
- `created_at`
- `updated_at`

### Push Subscription

- `id`
- `device_id`
- `endpoint`
- `keys`
- `created_at`
- `last_used_at`

## Acceptance Criteria

- The PWA can be installed or added to the home screen.
- The app registers a service worker successfully.
- The app remains usable enough to show a clear offline state.
- A user can identify/link at least two devices under the same account.
- Android control flow can create a pending message request.
- iOS sender flow can see a pending message request.
- The iOS sender can open WhatsApp, Viber, or SMS/iMessage from the request.
- The UI makes it clear that the user must manually tap Send in the external app.
- README is updated after this prompt is executed.

## Platform References

- MDN describes PWAs as web apps built with web platform technologies that can be installed, work offline/background where supported, and integrate with device capabilities: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- web.dev's PWA checklist recommends fast startup, browser compatibility, responsive layout, installability, and offline fallback behavior: https://web.dev/articles/pwa-checklist
- web.dev documents service workers as a core PWA capability for fast loading, offline access, push notifications, and background handling: https://web.dev/learn/pwa/service-workers
- WebKit documents Web Push support for iOS/iPadOS Home Screen web apps starting with iOS/iPadOS 16.4: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- WhatsApp documents click-to-chat links with optional prefilled text: https://faq.whatsapp.com/5913398998672934
- Viber documents `viber://forward?text=<Your Text>` for sharing/forwarding text from mobile websites: https://developers.viber.com/docs/tools/share-button/
- Apple documents the `sms:` URL scheme for launching Messages on iOS and notes that the URL must not include message text: https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/SMSLinks/SMSLinks.html

## Execution Notes

- Start with a narrow, transparent MVP.
- Prefer a working manual-confirmation workflow over unsupported automation.
- Keep the first build small enough to verify on real Android and iOS devices.
- Update README after execution with what changed, what was verified, and what remains.
