# Visible App Version And Patch Deploy

## Objective

Show a visible app version in the PWA and automatically increment the patch version on each deploy so it is clear when an update is live.

## Scope

- Use `package.json` as the source of truth for the app version.
- Add a generated browser version file with version and build timestamp.
- Display the app version in the header.
- Make `npm run deploy` increment the patch version before build/deploy.
- Make the deployed service worker cache name include the package version so app-shell updates are visible and reliable.
- Update README with the version/deploy behavior.

## Constraints

- Patch-only deploy bumps: `X.Y.Z` becomes `X.Y.(Z+1)`.
- Do not auto-bump major or minor versions.
- Keep generated browser runtime files out of git.
- Preserve the existing Firebase deployment command and project target.

## Acceptance Criteria

- The header shows `vX.Y.Z` after the version file loads.
- `npm run build` writes `src/app-version.generated.json`.
- `npm run deploy` bumps patch, builds, and deploys.
- The deployed `sw.js` contains the current package version in its cache name.
- README explains how to confirm the live version.
