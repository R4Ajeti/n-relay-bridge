# Prompt 0002: JavaScript Gitignore

## Objective

Add a JavaScript-focused `.gitignore` that prevents local secrets, dependencies, generated build output, package-manager caches, logs, test artifacts, and editor/OS files from entering Git.

## Scope

- Add a root `.gitignore`.
- Cover common JavaScript, TypeScript, PWA, and frontend tooling outputs.
- Ignore environment files while allowing committed examples.
- Update `README.md` after execution.

## Constraints

- Do not ignore source files, prompts, skills, README, manifest, service worker, or app assets.
- Do not ignore lockfiles by default; they are important for reproducible installs.
- Keep the file readable and organized by category.

## Acceptance Criteria

- `.gitignore` exists at the repository root.
- `.env`, `.env.local`, and similar private env files are ignored.
- `.env.example` and `.env.sample` remain trackable.
- `node_modules`, common build folders, caches, logs, and coverage output are ignored.
- README prompt index and execution log are updated.
