# Prompt 0003: Public README Polish

## Objective

Rewrite the README so it reads like a clean public GitHub project page for `n-relay-bridge`, without exposing internal prompt numbering, build logs, or code-generation workflow details.

## Scope

- Remove prompt index, prompt workflow, and execution-log language from `README.md`.
- Use the product name `n-relay-bridge`.
- Add a concise project description suitable for GitHub visitors.
- Add a "Skills" or capability section that explains what the project demonstrates.
- Keep run instructions and platform limitations.
- Keep links to implementation skill notes without making them sound like build prompts.
- Update internal agent guidance so future README edits stay public-facing.

## Constraints

- Do not remove the existing `prompt/` files.
- Do not change application behavior.
- Do not imply the app can silently send messages.
- Do not claim backend sync or production Web Push is already complete.

## Acceptance Criteria

- README contains no prompt numbering or prompt execution log.
- README uses `n-relay-bridge` as the main project name.
- README has a clear description, features, skills, local run steps, platform limits, and roadmap.
- Internal agent instructions no longer require exposing prompt indexes in public README updates.
