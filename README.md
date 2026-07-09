<div align="center">

# n-relay-bridge

A lightweight PWA for saving your signed-in devices and opening WhatsApp, Viber, or SMS/iMessage for user-confirmed sending.

![PWA](https://img.shields.io/badge/PWA-ready-125b50)
![Status](https://img.shields.io/badge/status-MVP-2457a6)
![Send Mode](https://img.shields.io/badge/send-user_confirmed-80620c)

</div>

## What It Does

`n-relay-bridge` is a multi-device messaging assistant.

The idea is simple: prepare a message on one device, open it on another device, then let the user confirm the final send inside the messaging app.

Current flow:

- Users must register or sign in before using device and message actions.
- Android works as the control device.
- iOS works as the sender device.
- The sender device can enable browser notifications after login.
- The sender opens WhatsApp, Viber, or SMS/iMessage with the message prepared where supported.
- The user manually taps Send inside the external app.

This project is intentionally built around transparent, user-confirmed handoff. It does not try to automate third-party apps in the background.

## Features

- Installable PWA shell with web app manifest.
- Service worker with offline fallback.
- Local device profile and added-device list.
- Message request composer.
- Pending request list for the sender device.
- Firebase email/password login.
- Realtime Database sync for saved devices and message requests.
- Sender-side notifications for new assigned requests while the PWA is active.
- Notification click-through to the pending request and channel handoff.
- WhatsApp click-to-chat handoff.
- Viber share/forward handoff.
- SMS/iMessage compose handoff.
- Import/export payload for early manual sync testing.

## Skills

This project demonstrates four core PWA skills:

| Skill | What it covers |
|---|---|
| [Web App Manifest](skill/01-web-app-manifest-installability.md) | Installability, app identity, icons, theme color, standalone launch |
| [Service Worker](skill/02-service-worker-offline.md) | App shell caching, offline fallback, update lifecycle |
| [Web Push](skill/03-web-push-notifications.md) | Sender-device alerts and notification click-through behavior |
| [Messaging Deep Links](skill/04-messaging-deep-links.md) | WhatsApp, Viber, and SMS/iMessage user-confirmed handoff |
| [Firebase Realtime Database](skill/05-firebase-realtime-database.md) | Authenticated device sync and request persistence |

## Firebase Setup

Create a Firebase project with Authentication email/password enabled and Realtime Database created. Encode the Firebase Web config as base64 and set:

```text
N_RELAY_FIREBASE_WEB_CONFIG_BASE64
```

For local setup, copy `env_example` to `.env` and fill in the value.

Do not use Firebase Admin SDK or service-account JSON in the PWA.

If login or registration returns `configuration not found`, enable Firebase Console > Authentication > Sign-in method > Email/Password for the project in your web config.

Generate the browser runtime config:

```bash
npm run firebase:config
```

The app stores user data under:

```text
users/{uid}/devices
users/{uid}/messageRequests
```

Recommended Realtime Database rules are in `firebase.rules.json`.

## Notification Handoff

After login, open the Android sender device, save it as a sender device, and tap **Enable Notifications**. Browsers only allow notification permission prompts from a user click, so the app cannot request this silently. After permission is granted, the same button becomes **Test Notification** so you can verify the current Android phone/browser can show PWA notifications. The test uses the same browser notification path as new assigned requests.

To get a phone popup for a newly arrived message request:

- Open the installed PWA on the Android sender phone.
- Sign in with the same Firebase account as the controller.
- Confirm the phone is saved as the sender device and note its `device #xxxxxx` suffix.
- Tap **Enable Notifications** on the phone and accept the browser/OS prompt.
- Tap **Test Notification**. A visible test notification must appear on that phone before request notifications can work.
- On the controller device, create the request and select the sender option with the same phone `#xxxxxx` suffix.
- Keep the sender PWA open or recently active so it can sync Firebase and display the popup.

When another signed-in device creates a message request for that sender device:

- the sender PWA checks Firebase for new assigned pending requests;
- the sender device shows one notification per new request when permission is granted;
- clicking the notification opens the pending request in the PWA;
- the PWA attempts the selected handoff: WhatsApp, Viber, or SMS/iMessage.

This static-hosting implementation works while the sender PWA is open or active enough for the browser to keep syncing. Closed-app, guaranteed delivery requires storing push subscriptions and sending Web Push/FCM notifications from a backend such as Firebase Cloud Functions.

Phone test checklist:

- Open the installed PWA on the Android sender phone, not only the desktop browser.
- Sign in with the same Firebase account.
- Save the Android phone as the sender device.
- Note the Android phone's current device suffix, shown as `device #xxxxxx`.
- Tap **Enable Notifications**, then tap **Test Notification**.
- If the test notification does not appear, check OS/browser notification settings for the installed PWA.
- From the controller device, create a new request and choose the sender option with the same `#xxxxxx` suffix.
- If a request appears in the pending list but no notification appears, confirm the request target is the real Android device record created by the Android phone itself. Choosing another saved device ID will not notify that phone.
- If **Test Notification** works but request notifications do not, the target device ID is wrong or the Android PWA is not currently syncing.
- If the phone never shows the test notification, open Android settings for the browser or installed PWA and allow notifications there, then return to the app and tap **Test Notification** again.

Check local Firebase setup:

```text
http://localhost:4173/health
```

The health endpoint checks both Realtime Database reachability and whether Firebase Email/Password Auth is enabled.

## Deploy

Deploy to Firebase Hosting and release Realtime Database rules:

```bash
npm run deploy
```

Every deploy increments the patch version before release. For example, `1.0.0` becomes `1.0.1`. The live PWA shows the deployed version in the header as `vX.Y.Z`, and the service worker cache name uses the same version so app updates are easier to confirm on phones.

Production versioning starts at `v1.0.1`.

Live Firebase Hosting URL:

```text
https://n-relay-bridge-db.web.app
```

The `/health` endpoint is local-only because Firebase Hosting serves the static PWA.

## Run Locally

Start a static server from the project root:

```bash
npm run serve
```

Open the app:

```text
http://127.0.0.1:4173/
```

Localhost is required for service worker testing in development.

## Verification

Current verification:

- `npm run check` passes JavaScript syntax checks for the app, service worker, and tooling.
- The local app shell serves successfully at `http://127.0.0.1:4173/`.
- The Device panel includes the added-device list, and no manual device-add form is served.

## Project Structure

```text
.
|-- index.html
|-- manifest.webmanifest
|-- sw.js
|-- offline.html
|-- firebase.rules.json
|-- package.json
|-- tools/
|-- icons/
|-- src/
|   |-- app.js
|   |-- firebase-client.js
|   `-- styles.css
`-- skill/
```

## Platform Limits

Personal WhatsApp, Viber, SMS, and iMessage accounts cannot be used for silent background sending from a PWA.

Supported behavior:

- Open the external app.
- Prepare the recipient or message where the platform allows it.
- Let the user review and manually send.
- Show browser notifications for assigned requests while the sender PWA is open or active enough to sync.

Unsupported behavior:

- Sending WhatsApp or Viber messages silently.
- Pressing buttons inside third-party apps.
- Reading or controlling another app's UI.
- Using push notifications to trigger automatic sending.
- Reliably preselecting both recipient and message in personal Viber deep links.
- Guaranteed closed-app request popups without a Web Push/FCM backend.

For true automated messaging, use official business APIs such as WhatsApp Business Cloud API, Viber Business Messages, or an SMS provider API.

## Roadmap

- Add real account authentication.
- Add backend-backed device management.
- Add message request API.
- Add push subscription storage.
- Send guaranteed Web Push/FCM notifications from the backend.
- Add request status audit history.
- Test on real Android and iOS Home Screen installs.
