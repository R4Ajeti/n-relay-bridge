# Latest Message Home

## Objective

Make a focused latest-message view the first authenticated home screen, with the existing full workspace available as a second screen.

## Scope

- Add a signed-in home view that shows only the newest non-cancelled message request.
- Make the latest message card larger and provide one primary, channel-aware send button.
- Show a clear `No messages` empty state when no message requests are available.
- Place the control that opens the existing full workspace at the bottom of a deliberately long home view so it appears only after substantial scrolling.
- Preserve the existing full workspace layout and behavior as the second view.
- Keep notification and messaging handoffs user-confirmed.
- Update the public README with the new navigation, verification, limitations, and recommended next work.

## Constraints

- Do not silently send messages or automate third-party messaging apps.
- Do not remove or change the existing full workspace features.
- Keep SMS/iMessage as the default handoff and use the request's primary channel for the single home-screen send action.
- Preserve authentication gating, Firebase synchronization, notifications, and existing request actions.
- Keep the implementation responsive and keyboard accessible.

## Acceptance Criteria

- After sign-in or an ordinary app launch, the focused latest-message home is shown first.
- The newest non-cancelled request is displayed with a larger recipient, message, and exactly one send action.
- With no eligible requests, the home says `No messages` and does not show a send action.
- The full-workspace button is below the initial viewport and requires substantial downward scrolling to reach.
- Activating that button shows the unchanged Device, New Request, Pending Requests, and Sync workspace.
- Browser back returns from the full workspace to the focused home view.
- Existing send handoffs still open the external app and mark the request as opened.
- `npm run check` passes.

## Execution Notes

- Reuse the existing request sorting, channel labels, deep-link construction, and request handoff function.
- Prefer view-state navigation over duplicating the workspace or its business logic.
- Verify populated, empty, desktop, and narrow layouts in the local browser.
