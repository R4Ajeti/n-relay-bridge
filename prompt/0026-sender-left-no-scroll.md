# Sender Left No Scroll

## Objective

Move the Sender/Pending Requests panel to the left side of the workspace and ensure it appears first on narrow phone layouts, while removing any internal sender list scrollbar behavior.

## Scope

- Change the desktop grid so the Sender/Pending panel occupies the left column.
- Move Device, New Request, and Sync panels to the right column.
- Change the narrow layout so Sender/Pending appears before the other panels.
- Keep the existing SMS-first and optional channel behavior.
- Update README verification language to match the new layout.

## Constraints

- Do not reintroduce the Sent action.
- Do not change message handoff safety behavior.
- Do not add internal scrolling to the Sender/Pending panel.
- Keep layout changes scoped to the app shell and related documentation.

## Acceptance Criteria

- Sender/Pending Requests is on the left side on desktop-width layouts.
- Sender/Pending Requests is the first panel on phone-width layouts.
- The Sender/Pending request list does not use its own scrollbar.
- `npm run check` passes.

## Execution Notes

- The previous grid placed `pending` in the right column; update the grid areas directly.
- Search CSS for overflow rules after patching.
- Keep README public-facing.
