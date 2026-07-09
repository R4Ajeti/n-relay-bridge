# Prompt 0006: Auth Gate App Actions

## Objective

Require Firebase login before the user can save a device, link devices, create requests, manage pending requests, notifications, or sync payloads.

## Scope

- Leave register and login usable before authentication.
- Disable operational forms and buttons while signed out.
- Add action-handler guards so unsigned users cannot mutate local app state.
- Keep signed-in behavior unchanged.
- Update README briefly.

## Acceptance Criteria

- Signed-out users can only register or sign in.
- Signed-out users cannot save device profile.
- Signed-out users cannot link/remove devices.
- Signed-out users cannot create/update/cancel/clear requests.
- Signed-out users cannot use export/import sync actions.
- Signed-in users can use the full app.
- JavaScript checks pass.
