# N Smart Phone

N Smart Phone is a prompt-driven project for building a multi-device PWA messaging assistant.

The target product lets a user prepare a message request on one linked device and open WhatsApp, Viber, or SMS/iMessage on another linked device for final manual sending.

## Current Product Direction

- Android phone: control device.
- iOS phone: sender device.
- Both devices use the same PWA account.
- Android creates message requests.
- iOS receives pending requests.
- iOS opens WhatsApp, Viber, or SMS/iMessage with the message prepared where the platform supports it.
- The user manually confirms and sends inside the target messaging app.

This project does not attempt silent sending or third-party app UI automation.

## Prompt Workflow

Every build request should follow this workflow:

1. Create a numbered prompt in `prompt/`.
2. Execute that prompt.
3. Update this README with the result.
4. Record verification and known limitations.

## Prompt Index

| Prompt | Name | Status |
|---|---|---|
| [0001](prompt/0001-multi-device-pwa-messaging-assistant.md) | Multi-Device PWA Messaging Assistant | Created and executed as project foundation |
| [0002](prompt/0002-javascript-gitignore.md) | JavaScript Gitignore | Created and executed |

## Run Locally

Start a static server from the project root:

```bash
python3 -m http.server 4173
```

Open:

```text
http://127.0.0.1:4173/
```

## PWA Capability Baseline

The first implementation should stay within these four capability areas:

1. [Web app manifest and installability](skill/01-web-app-manifest-installability.md).
2. [Service worker and offline fallback](skill/02-service-worker-offline.md).
3. [Web push notifications](skill/03-web-push-notifications.md).
4. [Messaging deep links for WhatsApp, Viber, and SMS/iMessage compose handoff](skill/04-messaging-deep-links.md).

## Platform Notes

- iOS Home Screen web apps support Web Push on iOS/iPadOS 16.4 and later after user permission.
- WhatsApp can be opened with click-to-chat links and optional prefilled text.
- Viber supports a share/forward URL scheme for prepared text.
- iOS Messages can be opened with the `sms:` URL scheme, but Apple does not officially support including message text in that URL.

## Execution Log

### Prompt 0001

Created the project foundation:

- Added the first implementation prompt.
- Added root agent instructions in `AGENTS.md`.
- Documented the prompt-driven workflow in this README.
- Added the four internet-sourced PWA skill notes in `skill/`.
- Built the first static PWA shell with manifest, service worker, offline fallback, local message requests, sync payload import/export, and messaging deep-link actions.

Verification:

- Repository contents were inspected before writing files.
- Static runtime files now exist.
- JavaScript syntax checks passed for `src/app.js` and `sw.js`.
- `manifest.webmanifest` parses as valid JSON.
- Local server returned `200 OK` for `/`, `/manifest.webmanifest`, and `/sw.js`.
- Browser verification confirmed the main UI renders, creates a request, and generates WhatsApp, Viber, and SMS links.
- Mobile viewport check at 390px wide reported no horizontal overflow.
- Git status was inspected during implementation.

### Prompt 0002

Added repository hygiene for JavaScript development:

- Created `.gitignore`.
- Ignored private environment files, dependencies, build output, caches, logs, coverage, test artifacts, local databases, editor files, OS files, and local certificates.
- Kept `.env.example`, `.env.sample`, `.env.template`, and useful VS Code example files trackable.

Verification:

- Confirmed there was no existing `.gitignore` before adding the new file.
- Preserved lockfiles as trackable for reproducible JavaScript installs.
- Checked ignore behavior for `.env`, `.env.local`, `node_modules`, `dist`, and `coverage`.

## Next Recommended Work

Build the backend-backed device sync layer:

- account authentication
- linked device registration
- message request API
- push subscription API
- Web Push delivery from backend to sender device
