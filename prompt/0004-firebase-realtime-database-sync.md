# Prompt 0004: Firebase Realtime Database Sync

## Objective

Add Firebase Realtime Database persistence for accounts, linked devices, and message requests while keeping the app deployable as a static PWA.

## Scope

- Use a base64-encoded Firebase Web config from an environment variable.
- Generate a browser-readable runtime config file from that environment variable.
- Add Firebase Auth email/password login through REST APIs.
- Use Firebase ID tokens to access Realtime Database through REST APIs.
- Save linked devices and message requests under the authenticated user's UID.
- Add a recommended Realtime Database structure and rules file.
- Add `.env.example` for setup.
- Update README briefly with Firebase setup and database notes.

## Environment Variable

Use this environment variable:

- `N_RELAY_FIREBASE_WEB_CONFIG_BASE64`

It must contain base64-encoded JSON with at least:

- `apiKey`
- `databaseURL`
- `projectId`
- `authDomain`
- `appId`

This is Firebase Web config, not a Firebase service-account private key.

## Database Structure

Use this Realtime Database layout:

```text
users/{uid}
|-- account
|   |-- uid
|   |-- email
|   |-- updatedAt
|-- devices/{deviceId}
|   |-- id
|   |-- accountId
|   |-- name
|   |-- platform
|   |-- role
|   |-- trusted
|   |-- current
|   |-- createdAt
|   `-- updatedAt
`-- messageRequests/{requestId}
    |-- id
    |-- userId
    |-- createdByDeviceId
    |-- targetDeviceId
    |-- channel
    |-- recipient
    |-- message
    |-- status
    |-- createdAt
    `-- updatedAt
```

## Constraints

- Do not expose service-account JSON or private keys in the browser.
- Do not require a bundler.
- Keep localStorage fallback behavior when Firebase config is missing.
- Keep all third-party messaging send actions user-confirmed.

## Acceptance Criteria

- `.env.example` documents the Firebase config variable.
- A build script generates `src/firebase-config.generated.json`.
- Generated Firebase config is ignored by Git.
- User can create/sign in to a Firebase Auth account from the PWA.
- Signed-in user data syncs linked devices and message requests to Realtime Database.
- README includes short Firebase setup notes.
- JavaScript syntax checks pass.
