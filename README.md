<div align="center">

# n-relay-bridge

A lightweight PWA for saving your signed-in devices and opening SMS/iMessage by default, with optional WhatsApp or Viber handoff for user-confirmed sending.

![PWA](https://img.shields.io/badge/PWA-ready-125b50)
![Status](https://img.shields.io/badge/status-MVP-2457a6)
![Send Mode](https://img.shields.io/badge/send-user_confirmed-80620c)

</div>

## What It Does

`n-relay-bridge` is a multi-device messaging assistant.

The idea is simple: prepare a message on one device, open it on another device, then let the user confirm the final send inside the messaging app.

Current flow:

- Users must register or sign in before using device and message actions.
- Multiple devices can work as control devices.
- A sender device receives assigned message requests.
- Control devices default new requests to the most recently seen sender device that was explicitly saved as **Sender** or **Both**.
- Enabling notifications never changes a control device into a sender device.
- The sender device can enable browser notifications after login.
- The sender opens SMS/iMessage by default, with WhatsApp or Viber available only when the request includes them.
- The user manually taps Send inside the external app.

This project is intentionally built around transparent, user-confirmed handoff. It does not try to automate third-party apps in the background.

## Features

- Installable PWA shell with web app manifest.
- Service worker with offline fallback.
- Local device profile and an explicit saved-device list.
- SMS-first message request composer with optional WhatsApp and Viber add-ons.
- Sender-first request targeting for multi-controller accounts.
- Explicit sender-device roles, separate from notification permission.
- Stable device IDs with a visible `#xxxxxx` suffix; saving the same device updates its existing record.
- Pending request list for the sender device.
- Firebase email/password login.
- Realtime Database sync for saved devices and message requests.
- Sender-side local notifications for new assigned requests while the PWA is active.
- Optional Web Push backend for locked-device delivery to subscribed sender devices, including iOS Home Screen PWAs.
- Notification taps that carry channel handoff metadata and fall back to the pending request.
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

For locked-device notifications, generate VAPID keys and configure Web Push:

```bash
npm run functions:install
npm run webpush:keys
```

Put the public VAPID key in root `.env` as `N_RELAY_WEB_PUSH_PUBLIC_KEY`, then run `npm run firebase:config` again so the browser can create push subscriptions. Put the same public key, the private VAPID key, and a contact subject such as `mailto:you@example.com` in `functions/.env` using `functions/.env.example` as the template. The private key must remain server-side.

The app stores user data under:

```text
users/{uid}/devices
users/{uid}/messageRequests
```

Recommended Realtime Database rules are in `firebase.rules.json`.

## Notification Handoff

After login, open the sender phone, save it as a sender device, and tap **Enable Notifications**. Browsers only allow notification permission prompts from a user click, so the app cannot request this silently. After permission is granted, the same button becomes **Test / Sync Push** so you can verify local notifications and, when VAPID keys are configured, sync a Web Push subscription for locked-device delivery.

iOS has an extra platform requirement: Web Push works for web apps added to the Home Screen on iOS/iPadOS 16.4 or later. If the app is opened as a normal Safari/browser tab, the status pill shows **Install PWA for iOS notifications** and locked-screen notifications should not be expected. Apple documents that Home Screen web app notifications can appear on the Lock Screen, in Notification Center, and on Apple Watch after the user grants permission: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/

A browser that signs in as a control device stays local until **Save Device** is used. It cannot create an entry in **Saved Devices** or become a request target just by opening the app or enabling notifications. A saved phone also appears once in its own Saved Devices list with a **Current device** label; the current phone cannot remove itself from that screen. Each device receives a stable `#xxxxxx` suffix, and saving that same device again updates its existing record rather than adding another one.

The request form shows a status light above the sender picker. It turns green when the selected saved sender has a Web Push subscription or, for local active-app notifications, has granted notification permission and checked in during the previous two minutes. A yellow light means the sender is offline, missing permission, or missing iOS Web Push setup, so the request can still be saved but a locked-device popup should not be expected yet.

If the sender loses network access, the controller changes to the yellow offline state after the heartbeat expires. Once the sender reconnects, an active PWA checks in immediately on the browser reconnect event and also retries every six seconds; reopening the PWA resumes the same sync flow.

Cloud refreshes preserve text being entered in the Device form. Firebase receives only the device or request that was explicitly changed, plus intentional removals; a background refresh cannot replace other saved devices or wipe an unsaved Device edit. A removed cloud device also disappears from other browsers on their next refresh instead of remaining as a stale local option.

**Both** is an explicit saved role: it can create requests and receive assigned requests. Re-saving the same browser or installed PWA updates that one device ID; the app does not infer that two matching names are the same physical device.

To get a phone popup for a newly arrived message request:

- Open the installed PWA on the sender phone. On iPhone, this must be the Home Screen web app, not a regular Safari tab.
- Sign in with the same Firebase account as the controller.
- Confirm the phone is saved as the sender device and note its `device #xxxxxx` suffix.
- Tap **Enable Notifications** on the phone and accept the browser/OS prompt.
- Tap **Test / Sync Push**. A visible local test notification must appear, and locked iOS delivery additionally needs the sender picker to show **Web Push ready**.
- On the controller device, create the request and select the sender option with the same phone `#xxxxxx` suffix.
- Multiple controller devices can use the same account. They should all default to the most recently seen explicitly saved sender device.
- A control device may enable notifications for its own test alerts, but it is not selectable as a sender unless its role is explicitly saved as **Sender** or **Both**.
- Older device records marked **Both** by a previous release are shown as not saved and are excluded from the sender picker until that device saves its role again.
- For local active-app notifications, keep the sender PWA open or recently active so it can sync Firebase and display the popup.
- For locked iPhone delivery, deploy the Firebase Function, configure VAPID keys, open the Home Screen PWA, tap **Test / Sync Push**, and confirm the sender picker says **Web Push ready**.

When another signed-in device creates a message request for that sender device:

- the controller pushes the new request to Firebase immediately, with delayed autosave as a backup;
- the sender PWA checks Firebase for new assigned pending requests;
- if a saved target device has a Web Push subscription, the Firebase Function sends the notification even when the PWA is closed or the phone is locked;
- otherwise, the sender device shows one local notification per new request when permission is granted and the PWA is active enough to sync;
- the notification stores both the pending-request PWA URL and the primary channel handoff URL;
- tapping the notification first tries to open the primary app route;
- if Android or the browser blocks that direct route, the service worker falls back to the PWA pending request and the PWA attempts the same handoff.

Without the Firebase Function and VAPID keys, this static-hosting implementation works only while the sender PWA is open or active enough for the browser to keep syncing. Closed-app and locked-phone delivery requires the Web Push backend.

New requests use SMS/iMessage as the primary handoff. WhatsApp and Viber buttons appear on a pending request only when the controller added those options. Viber and SMS/iMessage use custom deep-link schemes, so some browsers may fall back to the PWA first; matching buttons remain available on the pending request card. WhatsApp uses an HTTPS `wa.me` link that Android can often route into WhatsApp when that option is enabled.

Phone test checklist:

- Open the installed PWA on the sender phone, not only the desktop browser.
- On iPhone, add the site to the Home Screen and launch from that icon.
- Sign in with the same Firebase account.
- Save the phone as the sender device.
- Note the phone's current device suffix, shown as `device #xxxxxx`.
- Tap **Enable Notifications**, then tap **Test / Sync Push**.
- If the test notification does not appear, check OS/browser notification settings for the installed PWA.
- On iPhone, confirm the header does not say **Install PWA for iOS notifications**.
- On iPhone locked-screen tests, confirm the selected sender says **Web Push ready** before locking the phone.
- From the controller device, create a new request and choose the sender option with the same `#xxxxxx` suffix.
- After a request notification appears, tap it. New SMS-first requests may open the PWA fallback first depending on OS/browser support; optional WhatsApp or Viber buttons remain on the pending request card when selected.
- If a request appears in the pending list but no notification appears, confirm the request target is the real phone device record created by the phone itself. Choosing another saved device ID will not notify that phone.
- If **Test / Sync Push** works but request notifications do not, the target device ID is wrong, the active PWA is not syncing, or the Web Push function is not deployed/configured.
- If old notifications still open only the PWA, clear them and create a new request so the notification has current handoff metadata.

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

Deploy Hosting, Realtime Database rules, and the Web Push Cloud Function:

```bash
npm run deploy:all
```

Use `npm run deploy:functions` after changing only the Web Push function or its runtime configuration.

The hosting deploy scripts increment the patch version before release. For example, `1.0.0` becomes `1.0.1`. The live PWA shows the deployed version in the header as `vX.Y.Z`, and the service worker cache name uses the same version so app updates are easier to confirm on phones.

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
- The Device panel only lists explicitly saved devices; an unsaved control browser stays local.
- The desktop workspace keeps Device, Control, and Sync on the left while Pending Requests owns the full right column.
- Hidden authenticated screens stay hidden while the sign-in screen is active.
- New requests default to sender-capable devices and do not silently fall back to controllers.
- Notification-enabled control devices keep their chosen control role; they do not create an extra sender target.
- Web controllers refresh their default target to the newest explicitly saved sender-capable device unless the user manually changes the sender field.
- Device and request updates use individual Firebase paths, so one browser sync cannot replace another browser's saved devices or pending requests.
- Background cloud refreshes keep unsaved Device form edits intact.
- The sender availability light is green only for a notification-permitted sender that checked in during the last two minutes.
- Deployments version the HTML, app module, Firebase module, and stylesheets, preventing an installed PWA from pairing a new page with an old cached app script.
- Browser-created requests push to Firebase immediately, with the existing delayed cloud save still available as backup.
- Request notifications include the PWA fallback URL, request ID, channel, and channel handoff URL.
- The service worker validates notification click targets, tries the channel handoff first, and falls back to the pending-request PWA URL.
- New requests default to SMS/iMessage, and pending cards only show WhatsApp or Viber buttons when those options were selected.
- iOS Safari/browser tab mode reports that Home Screen install is required instead of claiming lock-screen readiness.
- Saved sender devices expose notification mode metadata such as `local notify` or `web push`.
- The Web Push Cloud Function syntax check passes and sends request notifications to saved device subscriptions when VAPID keys are configured.
- Firebase Hosting deploy `v1.0.18` contains explicit device saving, targeted Firebase updates, sender availability status, reconnect handling, notification click handoff, and a scrollable desktop request list that keeps the composer accessible.

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
|-- functions/
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
- Show Web Push notifications on locked subscribed devices when Firebase Functions and VAPID keys are configured.
- Route notification taps toward the primary messaging app when Android/browser link handling allows it.

Unsupported behavior:

- Sending WhatsApp or Viber messages silently.
- Pressing buttons inside third-party apps.
- Reading or controlling another app's UI.
- Using push notifications to trigger automatic sending.
- Reliably preselecting both recipient and message in personal Viber deep links.
- Guaranteed closed-app request popups without the Web Push/FCM backend deployed and configured.

For true automated messaging, use official business APIs such as WhatsApp Business Cloud API, Viber Business Messages, or an SMS provider API.

## Roadmap

- Harden account and device management.
- Add a backend message request API.
- Add a visible Web Push delivery audit trail in the request detail UI.
- Add expired-subscription recovery prompts on sender devices.
- Add request status audit history.
- Test on real Android and iOS Home Screen installs.
