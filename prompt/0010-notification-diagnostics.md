# Notification Diagnostics

## Objective

Make notification behavior easier to test and debug on the actual Android sender phone.

## Scope

- Keep the existing sender-side Firebase polling notification flow.
- Change the notification action into a clear permission/test control.
- When permission is already granted, tapping the control must show a local test notification on the current device.
- After permission is granted, force a Firebase sync check for assigned pending requests.
- Update README with practical phone testing steps and the static-hosting limitation.

## Constraints

- Do not claim this is guaranteed closed-app push.
- Do not automate third-party messaging apps or silent sends.
- Browser notification permission must still be requested only from a user gesture.
- Keep implementation compatible with static Firebase Hosting.

## Acceptance Criteria

- Signed-in users can tap a visible button to enable notifications.
- Once notifications are granted, the button becomes a test notification action.
- A successful tap sends a local notification to the current Android sender device.
- The app checks Firebase for assigned pending requests after enabling/testing notifications.
- README explains how to test on the sender phone and when FCM/Web Push backend is required.
