# Skill 04: Messaging Deep Links

## Purpose

Open the correct external messaging app with the user-visible message handoff.

## Use When

- Building WhatsApp, Viber, or SMS/iMessage action buttons.
- Preparing recipient and message text for external app handoff.
- Documenting platform limits around manual sending.

## Implementation Notes

- WhatsApp can use `https://wa.me/<phone>?text=<encoded-text>`.
- Viber can use `viber://forward?text=<encoded-text>` for share/forward behavior.
- iOS Messages can be opened with `sms:<phone>`.
- Treat SMS/iMessage body prefill as unreliable on iOS because Apple's documented `sms:` scheme does not include message text.
- Copy message text before opening SMS/iMessage so the user can paste if needed.
- Mark a request as `opened` after the handoff link is activated.
- Require the user to manually tap Send in the external app.

## Acceptance Checks

- WhatsApp button opens WhatsApp or WhatsApp web fallback.
- Viber button opens Viber when installed.
- SMS button opens the system Messages compose screen.
- Message text is URL-encoded.
- The UI clearly preserves manual send confirmation.

## Sources

- WhatsApp Click to Chat: https://faq.whatsapp.com/5913398998672934
- Viber Share Button: https://developers.viber.com/docs/tools/share-button/
- Apple SMS Links: https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/SMSLinks/SMSLinks.html
