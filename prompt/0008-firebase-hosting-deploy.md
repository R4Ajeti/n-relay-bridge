# Prompt 0008: Firebase Hosting Deploy

## Objective

Deploy `n-relay-bridge` to the existing Firebase project `n-relay-bridge-db` and return the live Hosting URL.

## Scope

- Add a clean Firebase Hosting build step.
- Generate `src/firebase-config.generated.json` from `.env`.
- Copy only public PWA runtime files into `dist/`.
- Configure Firebase Hosting to serve `dist/`.
- Deploy Hosting and Realtime Database rules to `n-relay-bridge-db`.
- Update README with the live URL and deploy command.

## Constraints

- Do not deploy `.env`.
- Do not deploy Firebase Admin SDK/service-account JSON.
- Do not deploy prompts, skills, local tools, or internal project files.
- Keep the local `/health` endpoint as local-only because Firebase Hosting is static.

## Acceptance Criteria

- `npm run build` creates a clean `dist/` artifact.
- Firebase Hosting deploy succeeds for project `n-relay-bridge-db`.
- Realtime Database rules deploy succeeds.
- README includes the deployed URL.
