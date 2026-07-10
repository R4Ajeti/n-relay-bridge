# Configure Web Push VAPID Keys

## Objective

Generate a VAPID key pair for the `n-relay-bridge-db` Firebase-backed Web Push flow and configure the local environment files required by the web app and Firebase Function.

## Scope

- Confirm the active Firebase project.
- Generate a new VAPID public/private key pair with the repository's Web Push tooling.
- Add the public key to the root `.env` for the browser build.
- Add the public and private keys, plus a valid contact subject, to `functions/.env` for Firebase Functions deployment.
- Verify the keys are present without printing secret values and rebuild the Firebase configuration.

## Constraints

- Keep the private VAPID key out of source control, build output, and user-facing output.
- Do not alter Firebase project data or deploy without a separate explicit deployment request.
- Preserve existing environment settings.

## Acceptance Criteria

- Root `.env` contains `N_RELAY_WEB_PUSH_PUBLIC_KEY`.
- `functions/.env` contains the VAPID public/private keys and subject.
- The generated browser Firebase configuration contains a non-empty public key.
- Repository checks complete successfully.

## Execution Notes

The VAPID pair is generated locally because raw Web Push uses an application-server key pair; Firebase Functions uses the private key only when it delivers a notification.
