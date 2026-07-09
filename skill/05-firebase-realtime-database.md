# Skill 05: Firebase Realtime Database

## Purpose

Persist linked devices and message requests in Firebase Realtime Database for authenticated users.

## Use When

- Adding cloud sync to the PWA.
- Saving linked devices across phones.
- Reading pending message requests on another signed-in device.
- Designing Firebase rules and database paths.

## Environment

Use this environment variable:

```text
N_RELAY_FIREBASE_WEB_CONFIG_BASE64
```

It stores base64-encoded Firebase Web config JSON. It must not contain service-account credentials or private keys.

## Database Structure

```text
users/{uid}
|-- account
|   |-- uid
|   |-- email
|   `-- updatedAt
|-- devices/{deviceId}
`-- messageRequests/{requestId}
```

## Security Model

- Firebase Auth provides the user identity.
- Realtime Database reads and writes are scoped to `users/{uid}`.
- Rules should require `auth != null && auth.uid === $uid`.
- Multiple devices share data by signing in to the same Firebase Auth account.

## Sources

- Firebase Realtime Database REST API: https://firebase.google.com/docs/reference/rest/database
- Firebase Auth REST API: https://firebase.google.com/docs/reference/rest/auth
- Authenticate REST Requests: https://firebase.google.com/docs/database/rest/auth
- Realtime Database Security Rules: https://firebase.google.com/docs/database/security
