# Standing decisions: QuickNotes

- Status: Approved
- Owner: AITechie
- Date: 2026-10-07

<!-- The owner's default answers, collected from the decisions already
     made on project-foundation, pages-deploy, note-storage and
     create-note. Stage agents read this file before raising questions:
     anything it covers is applied as a decision, not asked again, and
     the artifact records "per product/decisions.md §n". Agents only use
     this file while its Status is approved. Only the owner edits it. -->

## 1. How to treat agent proposals
1. When an agent's proposal fits everything below, it is **accepted as
   proposed**. The agent records it as a decision in the artifact,
   citing this file, instead of listing it as an open question.
2. Ask the owner **only** when a choice:
   - changes the approved charter (scope, non-goals, stack, constraints);
   - adds a runtime dependency, a paid service, or any cost above $0;
   - adds a network call, a third party, telemetry, or data leaving the
     device;
   - changes what is stored, for how long, or who can see it;
   - loosens an existing test or guard beyond what the spec states;
   - is a visible product choice this file doesn't cover (a new screen,
     a new flow, a different entry point).
3. Every question still raised comes with a recommended answer.

## 2. Product and UX
1. Explicit user actions over automatic ones (a Save button, no
   autosave; no draft persistence).
2. Errors appear inline, when the user acts (not while typing); typed
   text is never lost; messages are plain and specific.
3. No silent fallbacks: when something fails, say so clearly.
4. One accent colour (blue-700) on the zinc greys; no extra colours,
   including no red for errors.
5. Accessibility first: WCAG 2.1 AA, visible labels, focus management,
   live-region announcements, keyboard shortcuts as an addition, never a
   replacement.
6. Platform limits that a web page can't fix (iOS keyboard focus, iOS
   leave-page warnings, browser permission prompts) are accepted and
   recorded as risks.
7. Defer extras (skip links, notices, polish) to the slug that needs
   them.

## 3. Engineering
1. Node 24 LTS; verify every package version and licence with
   `npm view` before using it; licences must fit project-foundation R5.
2. No new runtime dependencies unless the spec justifies one; dev-only
   test tools are fine when allowlisted.
3. Prefer the platform API over a thin wrapper when the spec needs
   custom error handling.
4. Guards and tests are revised deliberately and named in a "Changes to
   earlier specs" table; never deleted or loosened silently.

## 4. Testing and release
1. Checks that need a real browser, device, or GitHub are listed as
   manual ship checks; agents never mark them passed. The owner may
   defer them, and they are recorded as deferred, not passed.
2. Release by branch and PR into main; merge only after CI is green;
   GitHub Pages deploys from main.
3. Never force-push; never push straight to main except a docs or
   ledger follow-up the owner has said yes to.

## 5. Privacy in the repo
1. No email addresses, phone numbers or personal contact details in any
   file or commit; the owner appears only as "AITechie".

## Approval
- Approved by: AITechie, 2026-10-07
