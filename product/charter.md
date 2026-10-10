# Product Charter: QuickNotes

- Status: Approved
- Owner: AITechie
- Date: 2026-10-04

<!-- This is one level above the per-feature Intent -> Spec -> Plan loop
     in docs/framework.md. It exists once per product/project (not once
     per feature) and is the entry point for a greenfield start. It
     answers "why does this product exist" so that each feature's
     /intent doesn't have to re-justify itself from scratch. -->

## Vision
QuickNotes is a fast, minimal, private personal notes app. It opens
straight to a place to type, lets you find any note instantly, and keeps
every note on your own device: no account, no server, no sync.

<!-- Derived by the Charter agent from the human's answers; the owner
     should confirm or reword it before approval. -->

## Target users
A single user: AITechie, using it as a personal tool. QuickNotes is meant
to replace the note tool AITechie uses today for everyday notes.

## Success metrics
- **Launch speed:** the app is ready to type in under 1 second from launch.
- **Search speed:** search returns results in under 100 ms over 1,000 notes.
- **Adoption:** AITechie uses it daily for 4 weeks instead of their current tool.

## Scope for v1
- A note has a **title** and a **plain-text body**.
- Create, edit and delete notes.
- List notes and open one.
- Search across both title and body.
- Notes are stored locally in the browser (IndexedDB) and persist across
  reloads and restarts.
- Installable PWA that works offline.
- Light and dark mode.
- Deployed to GitHub Pages through GitHub Actions; CI runs lint and tests.

## Explicitly out of scope for v1
- Accounts, multiple users, and sync across devices or browsers
- Tags and folders
- Rich text formatting and attachments
- Sharing, import and export
- Any server or backend component

## Initial feature breakdown
Ordered by dependency. Each slug runs its own
/intent -> /spec -> /plan -> /implement -> /review -> /ship loop.
- `project-foundation`: Scaffold React + Vite + TypeScript + Tailwind with lint, a test runner, a CI workflow (lint + tests) and an empty app shell.
- `pages-deploy`: Deploy the built app to GitHub Pages through a GitHub Actions workflow on pushes to main.
- `note-storage`: Define the note model (id, title, body, timestamps) and an IndexedDB repository with create, read, update, delete and list.
- `create-note`: Let the user create a note with a title and plain-text body, saved to local storage.
- `list-notes`: Show all notes, most recently updated first, and open a selected note.
- `edit-delete-note`: Let the user edit an open note's title and body and delete a note (with a confirmation or undo), saving changes to local storage.
- `search-notes`: Filter notes by a query over title and body as the user types, under 100 ms over 1,000 notes.
- `theme-mode`: Light and dark mode that follows the system preference, with a manual toggle that is remembered.
- `pwa-offline`: Web app manifest and service worker so the app installs, works offline and is ready to type in under 1 second.

**Revision 2026-10-09:** at the owner's request, the former `edit-note`
and `delete-note` slugs are merged into one slug, `edit-delete-note`, in
the same position (after `list-notes`, before `search-notes`). This saves
a full delivery cycle. There is no scope change: v1 still covers editing
and deleting notes exactly as before.

## Tech stack & architecture
- **Frontend:** React + Vite + TypeScript, as a progressive web app (PWA).
- **Backend:** none. The app runs entirely in the browser.
- **Datastore:** IndexedDB in the user's browser. No remote storage.
- **API style & auth:** no network API and no auth. All data access goes
  through a local repository layer.
- **Hosting & deployment:** static hosting on GitHub Pages, deployed by
  GitHub Actions. CI runs lint and tests on every push and pull request.
- **Architecture note:** with no server, everything except the UI (data
  model, repository, search) should sit behind interfaces that are
  independent of IndexedDB. That keeps it testable and leaves room for
  sync later without a rewrite.

## Design system
- **Component library:** Tailwind CSS. No third-party component kit is
  assumed; feature plans may propose one if needed.
- **Visual rules:** a minimal, neutral style with light and dark mode.
  Specific colors, fonts and copy tone are left to the
  `project-foundation` and `theme-mode` specs, within that direction.
- **Accessibility:** WCAG 2.1 AA.
- **Supported browsers and screen sizes:** TBD (open question). The PWA
  target suggests current evergreen browsers on desktop and mobile; the
  owner should confirm.

## Constraints
- **Team:** solo builder. AITechie is product owner, tech lead, release
  manager and on-call. There is no Jira (`tracker.mode: none`).
- **Privacy:** notes never leave the device. No analytics, telemetry or
  third-party network calls involving note content.
- **Cost:** $0 hosting cost.
- **Timeline:** none.
- **Known risk:** IndexedDB data lives in one browser profile. The browser
  may evict it, and it is lost if site data is cleared. With export out of
  scope, there is no v1 backup. `note-storage` should request persistent
  storage (`navigator.storage.persist()`), and the owner should accept or
  revisit this risk at approval.

## Approval
<!-- A charter is not approved until a human signs off here. -->
- Previous revision (before Revision 2026-10-09), approved by: AITechie , 10/02/2026
- Approved by:  Approved by: AITechie, 2026-10-09
