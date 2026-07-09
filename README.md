<div align="center">

# n-relay-bridge

A lightweight PWA for linking your devices and opening WhatsApp, Viber, or SMS/iMessage for user-confirmed sending.

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
- The sender opens WhatsApp, Viber, or SMS/iMessage with the message prepared where supported.
- The user manually taps Send inside the external app.

This project is intentionally built around transparent, user-confirmed handoff. It does not try to automate third-party apps in the background.

## Features

- Installable PWA shell with web app manifest.
- Service worker with offline fallback.
- Local device profile and linked-device prototype.
- Message request composer.
- Pending request list for the sender device.
- Firebase email/password login.
- Realtime Database sync for linked devices and message requests.
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

Unsupported behavior:

- Sending WhatsApp or Viber messages silently.
- Pressing buttons inside third-party apps.
- Reading or controlling another app's UI.
- Using push notifications to trigger automatic sending.

For true automated messaging, use official business APIs such as WhatsApp Business Cloud API, Viber Business Messages, or an SMS provider API.

## Roadmap

- Add real account authentication.
- Add backend-backed linked devices.
- Add message request API.
- Add push subscription storage.
- Send Web Push notifications from the backend.
- Add request status audit history.
- Test on real Android and iOS Home Screen installs.
