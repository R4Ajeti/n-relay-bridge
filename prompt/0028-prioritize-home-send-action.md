# Prioritize Home Send Action

## Objective

Simplify the focused latest-message home so the send action receives primary attention and the supporting message details are smaller.

## Scope

- Remove the status/sign-out block from the focused home header while keeping it available in the full workspace.
- Remove the `Sender / Latest Message` heading block and its surrounding panel treatment from the focused home.
- Move the single send action above the message type, recipient, and body.
- Center and enlarge the send action.
- Reduce the visual size of the channel, recipient, and message details.
- Preserve the empty state, below-the-fold full-workspace navigation, and all existing handoff behavior.
- Update the public README and design QA evidence.

## Constraints

- Do not remove status, notification, cloud, or sign-out controls from the existing full workspace.
- Do not change the user-confirmed external messaging handoff.
- Keep exactly one send action on the focused message card.
- Preserve responsive behavior and keyboard accessibility.
- Keep changes scoped to the focused home presentation.

## Acceptance Criteria

- The focused home shows the brand header without status pills or Sign Out.
- The focused home does not show the `Sender` eyebrow or `Latest Message` heading/panel block.
- The send action appears first inside the message card, centered, and substantially larger than before.
- Channel, recipient, and message content appear below the send action at a smaller scale.
- The full workspace still shows its original header controls and panels.
- Empty state and below-the-fold workspace navigation still work.
- Desktop and phone layouts have no horizontal overflow.
- `npm run check` passes.

## Execution Notes

- Toggle focused-home styling from the existing render-access state so workspace chrome remains unchanged.
- Group supporting message information separately from the primary send action.
- Reuse existing channel labels, link generation, and click handling.
