# Sender Reconnection Status

## Objective

Restore sender availability promptly after a temporary network disconnect.

## Scope

- Trigger an immediate Firebase synchronization when the browser regains network access.
- Show the sender's cloud status as offline while the browser reports no network connection.
- Preserve the existing periodic retry and recent-heartbeat availability logic.
- Document reconnection behavior in the public README.

## Constraints

- Do not create or promote device records during reconnect.
- Do not send messages or open third-party apps automatically.
- Keep notification permission user-confirmed.

## Acceptance Criteria

- An active signed-in sender checks in immediately after an `online` event.
- The sender can become green again once notification permission is granted and its heartbeat reaches the cloud.
- An offline browser is visibly marked as not cloud-connected.
- JavaScript checks and a deployed browser verification pass.

## Execution Notes

- The existing six-second polling loop remains as a fallback when browser network events are delayed or unavailable.
