# Prompt 0005: Health Endpoint and Rules Deploy

## Objective

Add a local `/health` endpoint for Firebase setup checks and deploy the Realtime Database rules when Firebase CLI credentials are available.

## Scope

- Replace the static Python development server with a small Node development server.
- Serve the existing PWA files.
- Add `GET /health`.
- Generate Firebase browser runtime config from `.env`.
- Add Firebase CLI config for Realtime Database rules.
- Attempt to deploy `firebase.rules.json` to the configured Firebase project.
- Update README briefly.

## Health Endpoint

`GET /health` should return JSON that checks:

- server status,
- Firebase generated config presence,
- required Firebase config fields,
- Realtime Database REST endpoint reachability,
- whether database rules appear protected or publicly readable,
- optional authenticated smoke test when health credentials exist.

Optional health credentials:

- `N_RELAY_FIREBASE_HEALTH_EMAIL`
- `N_RELAY_FIREBASE_HEALTH_PASSWORD`

## Constraints

- Do not expose Firebase Admin SDK service-account keys.
- Do not print secret env values.
- Keep generated browser config ignored by Git.
- Keep the PWA static-client architecture.

## Acceptance Criteria

- `http://localhost:4173/health` returns JSON.
- `npm run serve` starts the new local server.
- `npm run firebase:config` generates `src/firebase-config.generated.json`.
- README documents `/health` shortly.
- Firebase rules deploy is attempted and the outcome is reported.
