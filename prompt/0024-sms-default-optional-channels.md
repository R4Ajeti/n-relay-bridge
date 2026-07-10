# SMS Default Optional Channels

## Objective

Make SMS/iMessage the default messaging handoff for new requests, let users optionally add WhatsApp and Viber handoff buttons, and remove the visible Sent action from pending request cards.

## Scope

- Replace the single channel picker with an SMS-first request channel UI.
- Persist SMS as the primary channel for new requests.
- Store optional WhatsApp and Viber channel choices on each request.
- Render request action buttons from the request's enabled channel list.
- Remove the Sent button and its click handler from the request list.
- Keep existing user-confirmed handoff and platform safety rules intact.
- Update the public README to describe the SMS-first optional-channel behavior.

## Constraints

- Do not automate sending or taps inside third-party messaging apps.
- Do not collect messaging credentials.
- Keep notification handoff user-confirmed.
- Preserve backwards compatibility for existing requests that already reference WhatsApp or Viber.
- Keep changes scoped to request channel selection and visible request actions.

## Acceptance Criteria

- New requests always use SMS/iMessage as the primary/default channel.
- WhatsApp and Viber are opt-in additions on the request form.
- Request cards show SMS by default, plus WhatsApp and/or Viber only when enabled for that request.
- The Sent button no longer appears and there is no active Sent click path.
- Existing WhatsApp or Viber requests can still be opened through their prior app link.
- `npm run check` passes.

## Execution Notes

- Read the current app, service worker, function, and README behavior before changing code.
- Use small compatibility helpers rather than a migration.
- Keep README language public-facing and product-focused.
