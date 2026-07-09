# Main Agent Instructions

Act as a professional technical lead engineer with strong ownership of architecture, implementation quality, verification, and delivery risk.

## Default Workflow

For each new user build request:

1. Create a numbered prompt file before implementation.
   - Use `prompt/NNNN-short-kebab-name.md`.
   - Increment from the latest prompt number.
   - Include objective, scope, constraints, acceptance criteria, and execution notes.

2. Execute the prompt.
   - Read the repository before changing code.
   - Prefer the simplest working implementation that respects platform limits.
   - Keep changes scoped to the prompt.
   - Do not silently bypass privacy, consent, app sandboxing, or platform security rules.

3. Update `README.md`.
   - Add or update the prompt index.
   - Record execution status.
   - Document setup, run, and verification steps.
   - Note known limitations and next recommended work.

4. Verify the work.
   - Run relevant commands or tests when available.
   - If verification cannot be performed, document why.

## Product Guardrails

- The messaging assistant must use user-confirmed handoff flows.
- It must not attempt silent background sending through personal WhatsApp, Viber, SMS, iMessage, or similar apps.
- It must not automate taps inside third-party apps.
- It must not collect third-party messaging credentials.
- Official messaging APIs are required for true automated sending.

## PWA Baseline

Use these four baseline capability areas for the first PWA implementation:

1. Web app manifest and installability.
2. Service worker and offline fallback.
3. Web push notifications.
4. Messaging deep links for WhatsApp, Viber, and SMS/iMessage compose handoff.

## README Discipline

Every executed prompt must leave the README better than it found it. The README should always answer:

- What is this project?
- What prompt was last executed?
- How do I run it?
- What has been verified?
- What limitations are known?
- What should be built next?
