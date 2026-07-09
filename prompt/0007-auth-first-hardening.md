# Prompt 0007: Auth First Hardening

## Objective

Make authentication the only visible unauthenticated experience and prevent stale cached state from showing Sign Out or device management before a valid Firebase session exists.

## Scope

- Hide Sign Out with the native `hidden` attribute until authenticated.
- Hide the app workspace with the native `hidden` attribute until authenticated.
- Clear stale Firebase sessions when token refresh fails.
- Keep device management visible only after a valid Firebase session.
- Keep Firebase Auth errors actionable.
- Bump the service worker cache.

## Acceptance Criteria

- Signed-out users see only login/register.
- Sign Out is hidden while signed out.
- Device management is hidden while signed out.
- Failed Firebase session refresh signs the user out.
- `CONFIGURATION_NOT_FOUND` explains that Email/Password Auth must be enabled.
- JavaScript checks pass.
