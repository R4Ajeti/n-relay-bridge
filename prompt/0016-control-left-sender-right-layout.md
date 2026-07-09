# Control Left and Sender Right Layout

## Objective

Refine the app workspace so device setup and control actions stay in the left column, while the sender pending-request area owns the full right column for longer request queues.

## Scope

- Update the desktop workspace layout to place Device, Control/New Request, and Sync in a left-side operational column.
- Place Sender/Pending alone in the right column so many message requests have more vertical space.
- Keep mobile layout as a simple single-column flow.
- Improve the visual hierarchy, spacing, and modern cleanliness without changing the app's core behavior.
- Fix the auth/app visibility issue where hidden screens can still render behind the sign-in screen.
- Update README verification/product notes as needed.

## Constraints

- Keep the implementation simple and scoped to existing HTML/CSS behavior.
- Do not introduce new dependencies or framework changes.
- Do not change Firebase sync, notification, request, or device-state logic unless required by layout.
- Preserve user-confirmed messaging handoff rules.

## Acceptance Criteria

- On desktop, Control/New Request appears on the left side.
- Sender/Pending is the only panel in the right column and can grow with message volume.
- Device and Sync remain accessible in the left column.
- Mobile remains readable with no overlapping controls or text.
- Signed-out and loading states do not show the authenticated workspace behind the sign-in screen.
- The UI feels cleaner, quieter, and more modern while preserving the current brand palette.
- Project checks pass.

## Execution Notes

- Prefer CSS grid areas for predictable placement.
- Avoid decorative-heavy restyling; prioritize scanability, spacing, and clear workflow grouping.
- Verify with syntax checks, build, and local browser/screenshot review where available.
