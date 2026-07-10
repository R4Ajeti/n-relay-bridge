# Explicit Sender Device Targeting

## Objective

Prevent accidental browser device records from becoming selectable sender targets, and make a laptop-created message request reliably reach the explicitly saved Android sender device.

## Scope

- Keep device roles explicit: enabling notifications must not change a control device into a sender.
- Treat only user-saved sender/both device profiles as valid request targets.
- Keep an unsaved control browser local so it cannot create a cloud device record.
- Sync device and request changes at their individual Firebase paths rather than replacing the whole account state.
- Make **Both** an explicit complete device role and preserve a single saved record per device ID.
- Give default device labels a stable unique suffix and update an existing record on repeat save.
- Show notification availability beside the sender choice without changing device records automatically.
- Preserve unsaved Device form values while background cloud sync refreshes the rest of the app.
- Automatically recover account data created by earlier notification-role promotion so stale accidental browser records are not targeted.
- Keep the current Android sender as the default target when it is the only explicitly saved sender device.
- Verify the signed-in account flow using the test account supplied for this request.
- Update public README documentation for the device-targeting behavior.

## Constraints

- Do not silently send messages or automate actions inside third-party messaging apps.
- Do not expose the supplied test-account password in product files, logs, screenshots, or documentation.
- Preserve existing user-created message requests and explicitly saved sender profiles.
- Keep notification permission user-confirmed.

## Acceptance Criteria

- A notification-enabled control browser remains a control device unless the user explicitly saves it as Sender or Both.
- The sender-device picker only includes explicitly sender-capable devices.
- Legacy auto-promoted device records are excluded from sender targeting.
- A newly signed-in unsaved control browser does not add a Firebase device record.
- Syncing from one browser cannot replace devices or requests created by another browser.
- Saving the same device ID twice updates one saved record instead of creating a duplicate.
- **Both** is sender-capable only after an explicit save.
- The request composer shows a clear available/unavailable notification indicator for the selected saved sender.
- Typing a device name, platform, or role is not erased by cloud sync before **Save Device** is pressed.
- A new request is written immediately to Firebase and can be observed by the Android sender on the same account.
- JavaScript checks and a signed-in browser verification pass.
- README explains that sender role is an explicit saved device setting.

## Execution Notes

- The current implementation calls `normalizeNotificationReceiverRole()` during rendering, which changes any notification-enabled control device into `both`; this explains the unexpected second sender target.
- The live sender device should remain selectable only when it has been saved as Sender or Both by the user.
- The availability light must be based on notification permission plus a recent sender heartbeat, without creating or promoting a device record.
- Cloud writes must contain only explicitly changed device/request paths so background synchronization does not overwrite another device or reset an unsaved form draft.
