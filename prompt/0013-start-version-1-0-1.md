# Start Version At 1.0.1

## Objective

Set production versioning so the next deployed PWA version is `v1.0.1`.

## Scope

- Reset the package source version to `1.0.0`.
- Use the existing patch-bump deploy workflow so deployment publishes `1.0.1`.
- Update README to document the production version baseline.
- Verify and deploy.

## Constraints

- Do not change the patch-bump behavior for future deploys.
- Do not manually deploy `1.0.2` by setting the source version to `1.0.1` before deploy.
- Keep generated runtime files ignored.

## Acceptance Criteria

- `npm run deploy` bumps `1.0.0` to `1.0.1`.
- Live app version file reports `1.0.1`.
- Live service worker cache name includes `1.0.1`.
- README notes that production versioning starts at `v1.0.1`.
