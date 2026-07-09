# Skill 01: Web App Manifest and Installability

## Purpose

Make the PWA installable and recognizable as an app on supported devices.

## Use When

- Creating or updating the PWA shell.
- Adding app identity, icons, theme color, shortcuts, or standalone display.
- Checking whether the app can be added to the home screen.

## Implementation Notes

- Add a `manifest.webmanifest` file.
- Link it from `index.html`.
- Include `name`, `short_name`, `id`, `start_url`, `scope`, `display`, `background_color`, `theme_color`, and icons.
- Use `display: standalone` for app-like launch behavior.
- Keep the app responsive before and after installation.
- Test install behavior on Android and iOS because platform UI differs.

## Acceptance Checks

- Browser can load the manifest without errors.
- App has a stable name, icon, theme color, and start URL.
- App can be added to the home screen where supported.
- Installed app opens to the correct route.

## Sources

- MDN Progressive Web Apps: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- web.dev Web App Manifest: https://web.dev/learn/pwa/web-app-manifest
- web.dev PWA Checklist: https://web.dev/articles/pwa-checklist
