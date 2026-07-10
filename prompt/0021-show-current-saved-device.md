# Show Current Saved Device

## Objective

Show a sender phone's own saved record in the Saved Devices list without allowing a duplicate or accidental removal.

## Scope

- Include the current device when it has been explicitly saved as a device profile.
- Mark the current record as This device.
- Keep removal available only for other saved devices.
- Update public README behavior notes.

## Constraints

- Do not create a new device record while rendering the list.
- Do not allow removal of the currently active device from its own screen.
- Preserve the existing stable device ID and explicit-save rules.

## Acceptance Criteria

- A saved sender phone sees its sender record in Saved Devices.
- The current saved device appears once, not as a duplicate.
- Other saved devices retain their Remove action.
- JavaScript checks and deployed browser verification pass.
