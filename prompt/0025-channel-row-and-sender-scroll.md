# Channel Row And Sender Scroll

## Objective

Adjust the request composer so SMS/iMessage stays first while optional WhatsApp and Viber controls sit to the right, and remove the internal sender/pending request scrollbar.

## Scope

- Keep SMS/iMessage as the default visible first channel.
- Group optional WhatsApp and Viber controls on the right side of the channel row.
- Keep the channel layout responsive on phone screens.
- Remove the pending request panel's fixed internal scrolling behavior.
- Update the README with public-facing verification notes.

## Constraints

- Do not change user-confirmed handoff behavior.
- Do not reintroduce the Sent action.
- Do not automate messaging app taps or sends.
- Keep the change focused on layout and scrolling.

## Acceptance Criteria

- SMS/iMessage appears first in the channel row.
- Optional WhatsApp and Viber controls are visually grouped to the right when space allows.
- On narrow screens, the channel controls wrap without clipping text.
- The pending/sender request list no longer has its own scrollbar.
- `npm run check` passes.

## Execution Notes

- Read the existing form and pending panel CSS before editing.
- Prefer CSS-only changes unless markup is needed for robust alignment.
- Keep README language product-facing.
