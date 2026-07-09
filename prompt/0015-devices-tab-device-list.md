# Remove Pairing and Show Devices in Device Tab

## Objective

Remove the pairing/linking UI and its related manual device-add functionality, then show saved devices directly in the Device tab so users can see the devices already attached to their account from the device management area.

## Scope

- Remove the pairing form and any event handling that manually creates linked devices.
- Keep the current device profile save flow.
- Keep existing saved/current devices visible in a device list on the Device panel.
- Preserve signed-in gating, Firebase sync, notification testing, and request targeting.
- Update public README language to describe the current device management behavior.

## Constraints

- Do not add silent background messaging or third-party app automation.
- Do not collect messaging credentials.
- Keep changes scoped to the PWA UI and local/Firebase device state behavior.
- Keep the README public-facing and avoid internal prompt/build workflow details.

## Acceptance Criteria

- The app no longer renders a Pairing/Linked Devices section or link-device form.
- There is no active manual link-device submit handler.
- The Device panel displays the current device and other saved account devices in the same area.
- Device removal still works for non-current saved devices.
- Existing request target options continue to use saved sender devices.
- Project checks pass.

## Execution Notes

- Inspect `index.html`, `src/app.js`, and `src/styles.css` for the pairing selectors and layout.
- Remove stale selectors defensively so render/access code does not reference missing DOM nodes.
- Reuse the existing `renderDevices` list behavior rather than creating a separate device-list model.
