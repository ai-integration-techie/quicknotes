# Spec: Create a note

- Status: Approved
- Slug: create-note
- Intent: [intent.md](./intent.md)
- Jira: none
- Owner: AITechie
- Reviewers: AITechie (Product Owner, Tech Lead)
- Date: 2026-10-07

<!-- Status values: draft -> approved -> superseded.
     Do not move to "approved" without a human sign-off in the Approval
     section below. A spec with open questions cannot be approved. -->

## Summary
QuickNotes gets its first real screen: a "New note" form, always visible
when the app opens, with focus already in the Title field. The user types
a title and a plain-text note, then saves with the "Save note" button or
Cmd/Ctrl+Enter. The note is saved on this device only, through the
shipped `note-storage` entry point (`src/storage/index.ts`). The user is
told clearly and accessibly whether the save worked, and their text is
never lost from the screen on failure. Opening the app still stores
nothing (`project-foundation` AC-33), and the UI is allowed to reach
storage only through the public entry point.

This spec settles the user-facing copy, states and accessibility for
saving that `note-storage` deliberately left to the first UI slug. It
also **deliberately changes** some approved items in `project-foundation`,
`pages-deploy` and `note-storage` (see "Changes to earlier specs").

## Changes to earlier specs
Once this spec is approved, the items below take precedence over the
items they name. This slug does not edit those slugs' own artifacts
(`spec.md`, `plan.md`, `review.md`); only code and tests change.

| Earlier item | What it says today | Replaced by (this spec) |
|---|---|---|
| `project-foundation` R20 | `<main>` holds only the "No notes yet" empty state and no buttons, inputs or links | `<main>` holds the "New note" form (R1-R4) and the revised info text (R33). |
| `project-foundation` R33 | The shell never reads or writes IndexedDB | The app touches IndexedDB only through the repository, and only when the user saves (R26-R28). Nothing is stored on load or while typing. `project-foundation` AC-33 is **unchanged** and must keep passing. |
| `project-foundation` copy table, empty-state rows | "No notes yet" / "Your notes will show up here." | "Your notes are saved on this device" / "They stay in this browser and are never sent anywhere." (R33, Copy table). |
| `project-foundation` AC-19 | Main contains the two old empty-state texts | AC-1 and AC-6 here. The banner/`<h1>` checks of AC-19 still hold. |
| `project-foundation` AC-20 | No button, textbox, link, searchbox or checkbox exists | AC-1 here: exactly two textboxes and one button, and still no link, searchbox or checkbox. |
| `project-foundation` AC-26 (e2e focus probe) | Injects a probe button and Tabs to it | AC-52 here: the real Title, Note and Save note controls show the 2px accent outline. The probe is dropped, because Tab from the focused Title field no longer reaches an appended button first. |
| `project-foundation` AC-27, AC-28, AC-29 (layout e2e) | Check the three shell texts and a centred `main > div` | AC-53 to AC-55 here, over the new texts and controls. |
| `project-foundation` a11y "axe detects a contrast failure" test | Recolours "Your notes will show up here." | Recolours the new secondary info line instead (AC-51). |
| `project-foundation` AC-35 (VoiceOver reading order) | Title, heading, two empty-state lines | AC-57 here (manual VoiceOver pass for the form). |
| `project-foundation` Accessibility, Keyboard ("Tab moves no focus") | No focusable elements | Tab order Title → Note → Save note (R36). |
| `pages-deploy` R16 / AC-16 | `/quicknotes/` shows "No notes yet" | Shows the "New note" form and "Your notes are saved on this device" (AC-6). Every other AC-16 check is unchanged. |
| `note-storage` R42 / AC-56 | No UI file reaches any storage module | Narrowed on purpose (owner decision 12): UI files may import **only** `src/storage/index.ts`, and that module's export list is pinned (R29-R31, AC-43 to AC-46). |

`note-storage` AC-51 (domain modules don't reference IndexedDB) and AC-53
(no production module reaches the in-memory double or test support) are
**not** changed and keep passing as they are. Every other requirement and
acceptance criterion in those three specs still holds.

## User stories
- US-1: As the user (AITechie), I want the app to open straight to an empty note form with my cursor already in it, so that I can start typing in under a second.
- US-2: As the user, I want to give a note a title and a plain-text body and save it with a button or Cmd/Ctrl+Enter, so that capturing a note is quick.
- US-3: As the user, I want my note saved exactly as I typed it, on this device only, and still there after a reload, a browser restart and a new deploy, so that I can trust QuickNotes with my daily notes.
- US-4: As the user, I want to be told clearly that a note was saved, and get an empty form for the next one, so that I know my note is safe and can carry on.
- US-5: As the user, I want to see when I'm near a field's limit, and be told on save which field is too long or that the note is empty, so that I never get a half-saved or silently changed note.
- US-6: As the user, I want an honest, plain message when the browser can't save (unavailable, full, or another failure), with my text still on screen, so that I don't lose what I typed.
- US-7: As the user, I want a warning before I close or reload the page with unsaved text, so that I don't lose a note by accident.
- US-8: As a keyboard or screen-reader user, I want the form, its messages and its states to meet WCAG 2.1 AA from 360px to desktop, so that saving a note works for me as well as anyone.
- US-9: As the developer, I want the UI to reach storage only through the public storage entry point, enforced by a test, so that the IndexedDB implementation and the test double stay hidden behind it.
- US-10: As the user, I want opening the app to store nothing and saving a note to send nothing over the network, so that the charter's privacy promise holds.

## Requirements

### Form and first load
- R1: The `<main>` landmark MUST contain, first, a section labelled by a visible `<h2>` "New note", holding one `<form>`. The form MUST contain, in this DOM and Tab order: a single-line text input labelled "Title", a multi-line `<textarea>` labelled "Note", and a `<button type="submit">` "Save note". Each label MUST be a visible `<label>` associated with its field. The page MUST still have exactly one `<h1>` ("QuickNotes", in the banner).
- R2: When the app loads, focus MUST be in the Title field without any click or key press. The form MUST be part of the app's first render: no lazy loading, no `Suspense` boundary and no wait on storage, a timer or a network request before it appears.
- R3: The app MUST stay "ready to type in under 1 second from launch" (charter). Measured as in AC-4, the Title field MUST be focused and accept typed text within 1,000 ms of navigation start.
- R4: Neither field may have a `maxlength` attribute (owner decision 5) or the `required` attribute, and the form MUST NOT rely on native browser validation (`noValidate`). The user can type and paste past the limits, and nothing is truncated.
- R5: The fields MUST hold exactly what the user typed or pasted. The app MUST NOT trim, normalise, reformat or otherwise change the text, and MUST pass the fields' current values to the repository unchanged. (The browser itself removes line breaks pasted into a single-line input and stores textarea line breaks as `\n`; see Open questions / risks, item 4.)
- R6: Pressing plain Enter in the Title field MUST NOT save. It MUST move focus to the Note field. Plain Enter in the Note field inserts a line break as normal. Tab and Shift+Tab keep their default focus behaviour in both fields (no keyboard trap).

### Saving
- R7: A save attempt MUST start when the user activates "Save note" (click, tap, or Enter/Space on the focused button), or presses Ctrl+Enter or Cmd+Enter (`ctrlKey` or `metaKey` with `Enter`) while focus is in the Title or Note field. Both shortcuts work on every platform. The shortcut MUST NOT start a save while an IME composition is in progress (`isComposing`). There is no autosave (owner decision 2).
- R8: A save attempt MUST first check the current values against the `note-storage` rules, using the `countCharacters`, `TITLE_MAX_CHARS` and `BODY_MAX_CHARS` exports from the storage entry point (one Unicode code point = one character):
  - both fields have 0 characters → the "both empty" message (R15);
  - Title over 200 characters → the title-too-long message (R16);
  - Note over 100,000 characters → the body-too-long message (R16).
  Whitespace counts as content: a title of `" "` with an empty note is valid. If any check fails, no note is stored.
- R9: If the checks pass, the app MUST call `create({ title, body })` exactly once on the repository from `getNoteRepository()`, with exactly those two keys and the fields' current values.
- R10: While a save is in progress (the saving state):
  - the button text MUST be "Saving…" and the button MUST have `aria-disabled="true"` (it stays focusable; it is not `disabled`);
  - both fields MUST be `readOnly`, so text can't change between the save and the clear;
  - further save attempts (button or shortcut) MUST be ignored, so one attempt creates at most one note.
- R11: Only after `create` resolves, the app MUST: show "Note saved." in the status region (R34), clear both fields, return the button to "Save note" without `aria-disabled`, make the fields editable, and move focus to the Title field.
- R12: The app MUST NOT show "Note saved." or clear the fields unless `create` resolved. It MUST NOT store the note anywhere else on failure (no fallback; `note-storage` R23).
- R13: "Note saved." MUST stay visible until the user next changes either field or makes another save attempt. There is no timer.

### Validation messages and the counter
- R14: Validation messages MUST appear only as the result of a save attempt, never while typing (owner decision 4). Typing never adds a message, `aria-invalid` or error styling.
- R15: The both-empty message MUST appear in the alert region below the Save button row (R34), and focus MUST move to the Title field.
- R16: The too-long messages MUST appear directly below the field they concern, and that field MUST get `aria-invalid="true"` and an `aria-describedby` that includes the message. Focus MUST move to the first field with an error, in DOM order (Title before Note). If both fields are too long, both messages show.
- R17: A field's error message and its `aria-invalid` MUST be removed as soon as that field is edited. The both-empty message MUST be removed as soon as either field contains at least one character. Removing a message is the only live change typing may cause to messages.
- R18: If the repository rejects with a `ValidationError` (`kind: "validation"`) despite R8, the app MUST map its issues the same way: `{ field: "note", rule: "empty" }` → the both-empty message; `{ field: "title" | "body", rule: "too-long" }` → that field's message using the issue's `actual`; any other issue → the generic failure message (R20).
- R19: A character counter MUST appear directly below a field (below any error message) when that field's character count is at least 90% of its limit: at 180 or more for Title, at 90,000 or more for Note. It MUST disappear when the count drops below that. Its text is "{count} of {limit} characters", with en-US thousands separators. It uses `countCharacters`, so an emoji like 😀 counts as 1. It updates as the user types, is linked to its field through `aria-describedby`, and MUST NOT be a live region. It shows the same neutral style under and over the limit (owner decision 4: no live errors).

### Storage failures
- R20: When `create` rejects, the app MUST show one message in the alert region (R34), chosen by the error's `kind`:
  - `"unavailable"` → the unavailable message;
  - `"quota-exceeded"` → the quota message;
  - `"validation"` → as in R18;
  - `"not-found"`, any other value, or anything that is not a `NoteStorageError` → the generic failure message.
- R21: On any failed save, both fields MUST keep their exact text, the button MUST return to "Save note" without `aria-disabled`, the fields MUST become editable again, and focus MUST stay where it was when the save started (the Save note button, or the field where the shortcut was pressed).
- R22: A storage failure message MUST stay until the next save attempt. A new save attempt MUST clear every message first, so that a repeated failure is announced again (R34).
- R23: The app MUST NOT check storage before a save (no "is storage available" probe on load, owner decision 8), and MUST add no copy of its own about the browser's persistent-storage permission prompt (owner decision 9).
- R24: The UI MUST NOT write note text to the console or include it in any error message, and MUST NOT call `console.*` with an error that contains note text.

### Leaving with unsaved text
- R25: While either field contains at least one character (whitespace included), the app MUST have a `beforeunload` handler that calls `preventDefault()` (and sets `returnValue` for older engines), so the browser shows its own "Leave site?" warning. When both fields are empty, including right after a successful save, no such handler may be active. The app MUST NOT keep unsaved text anywhere: no draft in IndexedDB, `localStorage`, `sessionStorage`, cookies, Cache Storage or the URL (owner decision 7).

### Storage use and AC-33
- R26: Loading the app, rendering the form and typing MUST NOT call any repository method, `indexedDB`, `navigator.storage.persisted()` or `navigator.storage.persist()`. Calling `getNoteRepository()` itself is allowed, because it touches nothing (`note-storage` R25).
- R27: In this slug the UI MUST call only the repository's `create`. It MUST NOT call `list`, `get`, `update`, `delete` or `isPersisted`, and MUST NOT read storage to decide what the info text says (owner decision 3).
- R28: `project-foundation` AC-33 MUST keep passing with its test unchanged. Every e2e test that saves a note MUST run in its own browser context: either the per-test `page` fixture (Playwright creates a fresh context for each test) or a context the test creates and closes itself. No e2e test or the Playwright config may use `launchPersistentContext` or `storageState`, so no stored note can leak into AC-33's fresh context.

### Storage boundary (owner decision 12)
- R29: A **UI module** is `index.html` plus every non-test `.ts`, `.tsx` and `.css` file under `src/` that is not under `src/notes/`, `src/storage/` or `src/test/`. A UI module's direct imports that resolve under `src/notes/`, `src/storage/` or `src/test/` MUST resolve to exactly `src/storage/index.ts`. A UI module MUST NOT import `idb` or `fake-indexeddb`.
- R30: The public surface of `src/storage/index.ts` MUST stay exactly what `note-storage` shipped: the value exports `getNoteRepository`, `NoteStorageError`, `NotFoundError`, `QuotaExceededError`, `StorageUnavailableError`, `ValidationError`, `BODY_MAX_CHARS`, `TITLE_MAX_CHARS` and `countCharacters`, and the type exports `Clock`, `IdGenerator`, `Note`, `NoteInput`, `NoteRepository`, `StorageManagerLike`, `NoteStorageErrorKind` and `ValidationIssue`. It MUST NOT export the IndexedDB factory (`createIndexedDbNoteRepository`), anything from `src/test/`, or any other storage internal. Changing this list needs a spec revision.
- R31: UI module source MUST NOT reference `indexedDB`, `IDB[A-Z]…` types, `localStorage`, `sessionStorage`, `document.cookie` or `caches.`. `tests/tooling/storage-boundary.test.ts` (and, for R31, the privacy scan) MUST enforce R29-R31, MUST keep the `note-storage` AC-51 and AC-53 checks unchanged, and MUST NOT be deleted or skipped. Each new rule MUST have a negative self-test that feeds it a violating fixture.

### Look, layout and accessibility
- R32: The form MUST follow the shell's look (`project-foundation` R24-R30): system font, zinc greys, white field backgrounds, the single `accent` colour (`blue-700`) for the Save note button and the focus outline, no new colour token, no animations or transitions. Field text MUST be at least 16px (so iOS Safari doesn't zoom on focus). Field borders MUST reach 3:1 against their background (WCAG 1.4.11).
- R33: Below the form, the info text MUST read "Your notes are saved on this device" (primary) and "They stay in this browser and are never sent anywhere." (secondary), styled like the old empty state. This text is static: it MUST NOT depend on storage, and it MUST NOT change after a save.
- R34: The form MUST contain two live regions that exist, empty, from the first render: a status region (`role="status"`, polite) used only for "Note saved.", and an alert region (`role="alert"`) used for the both-empty message and the storage failure messages. Only one message shows across the two regions at a time. Field too-long messages are not in a live region; they are announced through focus and `aria-describedby` (R16).
- R35: The "Save note" button MUST have `aria-keyshortcuts="Control+Enter Meta+Enter"`, and a visible hint next to it: "Press Cmd+Enter to save." on Apple platforms (macOS, iOS, iPadOS) and "Press Ctrl+Enter to save." elsewhere. The button's accessible name MUST be exactly "Save note" (or "Saving…" while saving); the hint is its accessible description.
- R36: Everything MUST work by keyboard alone. Tab order is Title → Note → Save note. Every focusable control MUST show the global 2px accent `:focus-visible` outline (`project-foundation` R26).
- R37: The page MUST meet WCAG 2.1 AA in every state (idle, saving, saved, each error), with zero axe violations for the `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa` tags, and MUST meet `project-foundation` R28 and R29 (360px-1920px with no horizontal scroll; reflow at 320px, 200% text and WCAG 1.4.12 text spacing) with the form and every message in place.
- R38: The Save note button SHOULD be at least 44px tall.

### Privacy, dependencies and real-browser checks
- R39: Saving a note MUST make no network request. `project-foundation` R32 (same-origin only, no analytics) keeps holding.
- R40: This slug MUST NOT add a runtime dependency (`dependencies` in `package.json` stays `react` and `react-dom`). A dev-only dependency (for example `@testing-library/user-event`) MAY be added if the plan justifies it, and MUST meet `project-foundation` R5's licence rule with the exception list unchanged.
- R41: Before ship, the real-browser survival check (`note-storage` A8, owner decision 11) MUST be done by hand on the live site in current desktop Chrome and desktop Safari, as in AC-58, and recorded.

## User experience

### Flows
- **US-1 (open and type):**
  1. The user opens `https://ai-integration-techie.github.io/quicknotes/`.
  2. The page shows the "QuickNotes" header, the "New note" heading, the Title and Note fields, the "Save note" button with its shortcut hint, and the info text below.
  3. The cursor is already in Title. The user types straight away.
- **US-2 / US-4 (save, success):**
  1. The user types a title, presses Tab or Enter to reach Note, and types the note.
  2. The user clicks "Save note" or presses Cmd/Ctrl+Enter.
  3. For a moment the button reads "Saving…" and the fields can't be edited.
  4. "Note saved." appears below the button and is announced. Both fields clear, and the cursor goes back to Title.
  5. The user starts the next note. As soon as they type, "Note saved." goes away.
- **US-5 (both empty):**
  1. With both fields empty, the user presses Save note (it is never disabled).
  2. "Add a title or some text first." appears below the button and is announced. Focus goes to Title.
  3. When the user types into either field, the message goes away.
- **US-5 (near and over the limit):**
  1. As the title reaches 180 characters, "180 of 200 characters" appears under it and keeps updating. The same happens for the note at 90,000.
  2. The user can keep typing or pasting past the limit. Nothing is cut off, and no error shows yet.
  3. On save, the message "The title is too long. It has 205 characters and the limit is 200." appears under Title, the field is marked invalid, and focus moves to it. Nothing is saved.
  4. When the user edits that field, the message goes away. The counter keeps showing the live count.
- **US-6 (storage fails):**
  1. The user saves a valid note, and the browser refuses (unavailable, full, or another error).
  2. The matching message appears below the button and is announced. The text stays in both fields, and focus stays where it was.
  3. The user can try again. The next attempt clears the message first.
- **US-7 (leaving with unsaved text):**
  1. With text in either field, the user reloads or closes the tab.
  2. The browser shows its own "Leave site?" warning. With both fields empty, it doesn't.
- **US-3 (survival, checked at ship):** see AC-58.

### Screens / views
One screen, the app shell with the create form. No wireframe; layout from
top to bottom:

- **Header:** unchanged from `project-foundation` (`<h1>` "QuickNotes").
- **Main** (`max-w-3xl`, centred, `px-4` below 640px and `sm:px-6` from 640px, as today):
  - **New note section**, top spacing about 1.5rem (`pt-6`):
    - `<h2>` "New note": `zinc-900`, semibold, `text-lg`.
    - **Title:** visible label "Title" (`text-sm`, medium, `zinc-900`) above a full-width single-line input: white background, 1px `zinc-500` border, rounded, `px-3 py-2`, `text-base` (16px), `zinc-900` text.
    - Below Title: the title error (when shown), then the title counter (when shown). Both `text-sm`, left-aligned.
    - **Note:** visible label "Note" above a full-width `<textarea>`, same styling as Title, 12 rows tall by default, vertically resizable only, and it scrolls internally when the text is longer.
    - Below Note: the body error, then the body counter, as for Title.
    - **Save row:** the "Save note" button (accent background, white text, medium weight, rounded, `px-4`, at least 44px tall), with the shortcut hint ("Press Ctrl+Enter to save.", `text-sm`, `zinc-600`) beside it. At 360px the hint wraps under the button if there isn't room. The row never scrolls horizontally.
    - **Message area,** directly below the Save row: the status region and the alert region (R34). They take no visible space when empty.
  - **Info text,** about 3rem below the form (`mt-12`), centred, styled like the old empty state: "Your notes are saved on this device" (`zinc-900`, medium, `text-lg`) and "They stay in this browser and are never sent anywhere." (`zinc-600`, `text-base`).
- **Desktop (640px and up):** same single column, capped at 48rem wide and centred. Fields fill the column. The hint sits on the same line as the button.
- **360px phone:** same single column, full width minus 16px padding each side. Labels stay above fields. Nothing overlaps or scrolls sideways.

### States
| State | What the user sees | Live announcement | Focus |
|---|---|---|---|
| Loading | As today: blank `zinc-50` page until the JS runs. No spinner. The form appears in the first render. | none | Title, once rendered |
| Idle, empty | Empty fields, "Save note" enabled, hint, info text, no messages | none | Title on load |
| Idle, with text | Typed text; counters if at or over 90% of a limit; no errors | none | wherever the user is |
| Saving | Button reads "Saving…" (`aria-disabled="true"`), fields read-only, text visible | none | unchanged |
| Saved | "Note saved." under the button; both fields empty; counters and errors gone | status (polite): "Note saved." | Title |
| Error: both empty | "Add a title or some text first." under the button | alert | Title |
| Error: title and/or note too long | Message under each over-limit field; field marked invalid; counter still shown; text kept | none (read on focus via `aria-describedby`) | first invalid field |
| Error: unavailable | Unavailable message under the button; text kept | alert | unchanged |
| Error: quota exceeded | Quota message under the button; text kept | alert | unchanged |
| Error: other | Generic failure message under the button; text kept | alert | unchanged |
| Render failure | The `project-foundation` error boundary message | alert (existing) | n/a |
| JavaScript off | The `project-foundation` `<noscript>` message | n/a | n/a |

There is no "has notes" or "no notes" state: listing notes is `list-notes`.

### Copy & validation
Tone (from `project-foundation`): plain and friendly, sentence case, no
jargon, no exclamation marks. `{n}` is a number with en-US thousands
separators (for example `100,001`).

| Location | Exact text |
|---|---|
| Section heading (`<h2>`) | New note |
| Title label | Title |
| Note label | Note |
| Save button, idle | Save note |
| Save button, saving | Saving… |
| Shortcut hint, Apple platforms | Press Cmd+Enter to save. |
| Shortcut hint, other platforms | Press Ctrl+Enter to save. |
| Counter | {n} of 200 characters / {n} of 100,000 characters |
| Saved | Note saved. |
| Both empty | Add a title or some text first. |
| Title too long | The title is too long. It has {n} characters and the limit is 200. |
| Note too long | The note is too long. It has {n} characters and the limit is 100,000. |
| Storage unavailable | Your note wasn't saved. This browser isn't letting QuickNotes store notes right now, which can happen in private browsing. Your text is still here. |
| Storage full | Your note wasn't saved because there's no storage space left for QuickNotes on this device. Free up some space, then try again. Your text is still here. |
| Any other failure | Your note wasn't saved because something went wrong. Your text is still here, so you can try again. |
| Info text, primary | Your notes are saved on this device |
| Info text, secondary | They stay in this browser and are never sent anywhere. |

All other copy (`<title>`, `<h1>`, error boundary, `<noscript>`) is
unchanged.

Field rules (from `note-storage`, unchanged):
- Title: at most 200 characters. Note: at most 100,000 characters. One character = one Unicode code point (`countCharacters`). The browser's `maxlength` counts differently (😀 = 2), so it isn't used at all.
- At least one of the two fields must have 1 or more characters. Whitespace counts.
- Text is saved exactly as it is in the fields.
- Checked only on save. The counter is the only live feedback.

### Accessibility
Target: WCAG 2.1 AA (charter).
- **Structure:** `banner` (`<h1>` "QuickNotes"), then `main` with a section labelled by `<h2>` "New note" (no skipped heading levels), the form, and the info text as two paragraphs.
- **Labels:** both fields have visible `<label>`s whose text is their accessible name ("Title", "Note"). No placeholder text is used as a label.
- **Focus on load:** Title. jsx-a11y's recommended `no-autofocus` rule is on, so the plan must focus programmatically after mount (or justify a single, commented exception); the lint config must not be loosened.
- **Keyboard:** Tab order Title → Note → Save note. Enter in Title moves to Note. Ctrl/Cmd+Enter saves from either field. Tab never gets trapped in the textarea (tabs can be pasted, not typed). The 2px accent `:focus-visible` outline shows on all three controls.
- **Descriptions:** each field's `aria-describedby` lists its error message (when shown) and its counter (when shown). The button's description is the shortcut hint.
- **Live regions (R34):** a polite `role="status"` for "Note saved." and a `role="alert"` for the both-empty and storage messages, both present and empty from the first render. A new attempt clears them first, so a repeated message is announced again. The counter is never live, to avoid an announcement per keystroke.
- **Focus after save:** success → Title. Both empty → Title. Too long → first invalid field (its message is read through `aria-describedby`). Storage failure → unchanged.
- **Saving state:** the button uses `aria-disabled`, not `disabled`, so focus isn't lost while saving.
- **Invalid fields:** `aria-invalid="true"` plus a visible text message (not colour alone). The invalid field's border becomes 2px `zinc-900`.
- **Contrast:** `zinc-900` and `zinc-600` text on `zinc-50` and white, and white on `blue-700` (about 6.7:1), all pass 4.5:1. Field borders `zinc-500` (`#71717a`) on white are about 4.8:1, passing 3:1.
- **Zoom and reflow:** 16px field text, no `maximum-scale`; reflow at 320px, 200% text and 1.4.12 text spacing with the form shown.
- **Motion:** none.
- **Manual pass:** VoiceOver on macOS Safari and iOS Safari, plus a keyboard-only pass (AC-57).

## Acceptance criteria
Test layers: **component** = Vitest + React Testing Library in jsdom
(`npm test`), with a repository supplied by the test (the in-memory double
from `src/test/`, or a stub whose `create` resolves, rejects with one of
the error classes imported from `src/storage/index.ts`, or stays pending);
how it is supplied is the plan's choice. **e2e** = Playwright against the
production build under `/quicknotes/`, loaded with `gotoApp` from
`e2e/app.ts`, each test in its own context (R28). **tooling** = Vitest
under `tests/tooling/`. **manual** = recorded in `review.md` or at ship.

Naming: this spec's own AC-33 is unrelated to `project-foundation` AC-33
("nothing stored on a fresh load"). The latter is always written with its
slug prefix, and is checked here by AC-38.

"Type" in a component test means `fireEvent.change` or
`@testing-library/user-event`; "paste" means setting the value in one
change event.

### Form and first load
- AC-1 (US-1, US-8, R1): Component: given `<App />` rendered, then `main` contains a heading level 2 named "New note", `getByRole('textbox', { name: 'Title' })` (an `<input type="text">`), `getByRole('textbox', { name: 'Note' })` (a `<textarea>`) and `getByRole('button', { name: 'Save note' })` with `type="submit"`, in that DOM order. There are exactly 2 textboxes and 1 button, no link, searchbox or checkbox, and exactly one heading level 1 ("QuickNotes", inside `banner`).
- AC-2 (US-1, R2): Component: given `<App />` rendered (nothing else done), then `document.activeElement` is the Title field.
- AC-3 (US-5, R4): Component: given `<App />`, then neither field has a `maxlength` or `required` attribute, and the form has `noValidate`.
- AC-4 (US-1, R2, R3): e2e: given a fresh page, when `gotoApp(page)` is called and the test waits (polling with `requestAnimationFrame` in the page) until `document.activeElement` is the Title field, then `performance.now()` read at that moment is below 1000. Then `page.keyboard.type('Hello')` with no click makes the Title field's value `"Hello"`.
- AC-5 (US-1, R2): tooling or component: given the source of the app's render path (`src/main.tsx`, `src/App.tsx` and the components they render), then it contains no `React.lazy`, `lazy(` or `<Suspense`.
- AC-6 (US-4, R33): Component: given `<App />`, then `main` contains the texts "Your notes are saved on this device" and "They stay in this browser and are never sent anywhere.", and contains neither "No notes yet" nor "Your notes will show up here.". After a successful save (AC-12), both info texts are unchanged. e2e: `pages-deploy` AC-16 passes with "No notes yet" replaced by "Your notes are saved on this device".

### Text and saving
- AC-7 (US-2, R9): Component: given an in-memory repository, when the user types "Shopping" in Title and paste "Milk\nEggs" in Note, then clicks "Save note", then the repository's `create` was called exactly once with an argument deep-equal to `{ title: "Shopping", body: "Milk\nEggs" }` (exactly those two keys), and `list()` resolves with one note with that title and body.
- AC-8 (US-3, R5, R9): Component: given each pair below pasted into Title / Note and saved, then `create` receives values `===` to the pasted ones: `"  lead and trail  "` / `"line1\nline2\n\n  indented\ttab  "`; `"👩‍💻 🇮🇳"` / `"日本語 العربية עברית हिन्दी"`; `"<b>not html</b>"` / `"é vs é"` (precomposed and decomposed).
- AC-9 (US-2, R7): Component: given "a" in Title, when `keyDown` `Enter` with `ctrlKey: true` fires on the Title field, then `create` is called once. The same holds for `metaKey: true`, and for both on the Note field. When `keyDown` `Enter` with `ctrlKey: true` and `isComposing: true` fires, `create` is not called.
- AC-10 (US-2, R6): Component: given "a" in Title and focus in Title, when plain `Enter` is pressed, then `create` is not called, the form is not submitted, and focus is in the Note field. Given focus in Note, plain `Enter` and `Shift+Enter` don't call `create`.
- AC-11 (US-2, US-8, R35): Component: given the platform source the plan picks (for example `navigator.platform`) stubbed to report macOS (`"MacIntel"`), then the text "Press Cmd+Enter to save." is shown; stubbed to report Windows (`"Win32"`), "Press Ctrl+Enter to save." is shown. In both cases the button has `aria-keyshortcuts="Control+Enter Meta+Enter"`, its accessible name is "Save note", and its accessible description is the hint text.
- AC-12 (US-4, R11, R34): Component: given "Title A" / "Body A" and `create` resolving, when "Save note" is clicked and the promise settles, then the `status` region's text is "Note saved.", both fields are empty, the Title field has focus, the `alert` region is empty, and the button reads "Save note" without `aria-disabled`.
- AC-13 (US-2, R10): Component: given `create` that stays pending, when "Save note" is clicked, then the button's name is "Saving…" and it has `aria-disabled="true"` and is not `disabled`, and both fields have `readOnly`. A second click and a Ctrl+Enter in Title don't call `create` again (still 1 call). After `create` resolves, the button reads "Save note" and the fields are editable.
- AC-14 (US-4, R13): Component: given the saved state from AC-12, when the user types "x" in Title, then the `status` region is empty. Given the saved state again, when "Save note" is clicked with both fields empty, then the `status` region is empty and the both-empty message shows.
- AC-15 (US-6, R12): Component: for `create` rejecting with each of `StorageUnavailableError`, `QuotaExceededError`, `NotFoundError`, `ValidationError` (any issue) and `new Error("x")`, when "Save note" is clicked, then "Note saved." never appears in the document, and both fields still hold their exact text.

### Validation and the counter
- AC-16 (US-5, R8, R15): Component: given both fields empty and an in-memory repository, when "Save note" is clicked, then the `alert` region's text is "Add a title or some text first.", focus is in Title, and `list()` resolves `[]`. The same holds when saving with Ctrl+Enter from the Note field.
- AC-17 (US-5, R8): Component: given Title `" "` and an empty Note, when saved, then `create` is called with `{ title: " ", body: "" }` and "Note saved." shows.
- AC-18 (US-5, R8, R16): Component: given 201 `"a"` in Title and "x" in Note, when saved, then no note is stored (`list()` resolves `[]`), the text "The title is too long. It has 201 characters and the limit is 200." is shown, Title has `aria-invalid="true"`, its `aria-describedby` includes that message's id, focus is in Title, and Title still holds 201 characters.
- AC-19 (US-5, R8, R16): Component: given "t" in Title and 100,001 `"a"` in Note, when saved, then no note is stored, "The note is too long. It has 100,001 characters and the limit is 100,000." is shown under Note, Note has `aria-invalid="true"`, and focus is in Note.
- AC-20 (US-5, R16): Component: given 201 characters in Title and 100,001 in Note, when saved, then both messages are shown, both fields have `aria-invalid="true"`, and focus is in Title.
- AC-21 (US-5, R8, R19): Component: given 200 `"😀"` in Title (400 UTF-16 code units), when saved, then `create` is called. Given 201 `"😀"`, the title message says "It has 201 characters".
- AC-22 (US-5, R14): Component: given 250 `"a"` typed into Title, before any save attempt, then no element contains "too long", Title has no `aria-invalid`, and the `alert` region is empty.
- AC-23 (US-5, R17): Component: given the AC-18 error state, when one character is deleted from Title, then the title message is gone and Title has no `aria-invalid`. Given the AC-16 state, when "a" is typed into Note, then the `alert` region is empty.
- AC-24 (US-5, R18): Component: given a repository stub whose `create` rejects with a `ValidationError` whose issues are, in turn, `[{ field: "note", rule: "empty" }]`, `[{ field: "title", rule: "too-long", limit: 200, actual: 250 }]` and `[{ field: "id", rule: "not-a-string" }]`, when "a" / "b" is saved, then the shown messages are, in turn, "Add a title or some text first.", "The title is too long. It has 250 characters and the limit is 200." and the generic failure message.
- AC-25 (US-5, R19): Component: given Title with 179 characters, then no counter is shown for Title. At 180 the text "180 of 200 characters" is shown, at 200 "200 of 200 characters", and at 205 "205 of 200 characters" (with the same classes as at 180). Back at 179 it is gone. While shown, its id is in Title's `aria-describedby`, and neither it nor any ancestor has `aria-live`, `role="status"` or `role="alert"`.
- AC-26 (US-5, R19): Component: given Note with 89,999 characters, then no Note counter is shown. At 90,000 the text "90,000 of 100,000 characters" is shown, and at 100,001 "100,001 of 100,000 characters".
- AC-27 (US-5, R19): Component: given 180 `"😀"` in Title, then "180 of 200 characters" is shown.
- AC-28 (US-5, R4, R19): e2e: given a fresh page, when 250 `"a"` are inserted into Title with `page.keyboard.insertText`, then Title's value has 250 characters (nothing truncated), "250 of 200 characters" is visible, and no error message is visible.

### Storage failures
- AC-29 (US-6, R20, R21): Component: given "Keep me" / "And me" and `create` rejecting with `new StorageUnavailableError()`, when "Save note" is clicked, then the `alert` region's text is exactly the "Storage unavailable" copy, both fields still hold "Keep me" / "And me" and are editable, the button reads "Save note" without `aria-disabled`, and focus is on the "Save note" button. When the same save is started with Ctrl+Enter from Note, focus stays in Note.
- AC-30 (US-6, R20): Component: as AC-29 with `new QuotaExceededError(...)`, then the `alert` text is exactly the "Storage full" copy.
- AC-31 (US-6, R20): Component: as AC-29 with `new NotFoundError()`, `new Error("boom")` and a rejected non-Error value `"boom"`, then each time the `alert` text is exactly the "Any other failure" copy, and "boom" doesn't appear in the document.
- AC-32 (US-6, R22): Component: given the AC-29 state, when "Save note" is clicked again and `create` now resolves, then the `alert` region is empty, "Note saved." shows, and both fields are empty. Given a second failure instead, the `alert` region was empty at the moment the new attempt started (checked by observing the region's text sequence) and then shows the message again.
- AC-33 (US-6, US-10, R12, R24, R25): Component: given `create` rejecting with `StorageUnavailableError` for the note "SECRET-T" / "SECRET-B", when saved, then `localStorage.length` and `sessionStorage.length` are 0, `document.cookie` is empty, and a spy on `console.log/info/warn/error/debug` recorded no call whose arguments contain "SECRET".
- AC-34 (US-6, R20, R21): e2e: given a fresh context with an init script that makes `indexedDB.open` throw a `SecurityError`, when "Keep me" is typed in Title and "Save note" is clicked, then the "Storage unavailable" copy is visible and Title still holds "Keep me".

### Leaving with unsaved text
- AC-35 (US-7, R25): Component: given both fields empty, when a cancelable `beforeunload` event is dispatched on `window`, then `defaultPrevented` is false. Given `" "` in Title, or "a" in Note only, it is true. After a successful save (fields cleared), it is false again.
- AC-36 (US-7, R25): e2e: given a fresh page with "unsaved" typed into Note via the keyboard, when `page.close({ runBeforeUnload: true })` is called, then a `dialog` event of type `beforeunload` fires (the test dismisses it). Given a fresh page where nothing was typed, no `dialog` event fires.

### Storage use and project-foundation AC-33
- AC-37 (US-10, R26, R27): Component: given a spy repository (every method a `vi.fn`), when `<App />` renders and the user types in both fields, then no repository method has been called. After a valid save, only `create` has been called, once. No test in this slug's suite observes a call to `list`, `get`, `update`, `delete` or `isPersisted`.
- AC-38 (US-10, R26, R28): e2e: `project-foundation` AC-33 ("no storage or cookies on fresh load", `e2e/privacy.spec.ts`) runs with its test code unchanged and passes.
- AC-39 (US-10, R25, R26): e2e: given a fresh context, when the app loads and "draft" is typed into both fields (no save) and the network goes idle, then `localStorage.length` and `sessionStorage.length` are 0, `document.cookie` is empty, `indexedDB.databases()` returns `[]`, and the page URL is unchanged.
- AC-40 (US-3, US-10, R9, R28): e2e: given a fresh context, when "E2E title" / "E2E body\nline 2" is saved, then "Note saved." is visible, and reading the `quicknotes` database's `notes` store directly in the page (`getAll`) returns exactly one record with that title and body. `indexedDB.databases()` now lists `quicknotes`.
- AC-41 (US-3, R28): e2e: given the AC-40 state in the same context, when the page is reloaded, then the `notes` store still holds that record with identical `id`, `title`, `body`, `createdAt` and `updatedAt`, and the form is empty with focus in Title. (Simulated survival; the real check is AC-58.)
- AC-42 (US-10, R28): tooling: given `playwright.config.ts` and every file under `e2e/`, then none contains `launchPersistentContext` or `storageState`. A fixture string containing either makes the check fail.

### Storage boundary
- AC-43 (US-9, R29): tooling: given every UI module (R29's definition, found by listing files, not a fixed list), when each one's direct imports are resolved, then every import that resolves under `src/notes/`, `src/storage/` or `src/test/` resolves to `src/storage/index.ts`, and none is `idb`, `fake-indexeddb` or a subpath of them. The test also asserts that at least one UI module does import `src/storage/index.ts` (the form wiring exists).
- AC-44 (US-9, R29): tooling: given fixture UI files, when the AC-43 check runs on them, then it fails for imports of `../storage/indexedDbNoteRepository`, `../storage/connection`, `../notes/validation`, `../notes/errors`, `../test/inMemoryNoteRepository` and `fake-indexeddb`, and passes for `../storage` and `../storage/index`.
- AC-45 (US-9, R30): tooling: given `src/storage/index.ts`, when its exported names are read (with the TypeScript compiler API, distinguishing type-only exports), then the value exports equal exactly the R30 list and the type exports equal exactly the R30 list. A fixture that adds `export { createIndexedDbNoteRepository } from "./indexedDbNoteRepository"` or any `export … from "../test/…"` makes it fail.
- AC-46 (US-9, US-10, R31): tooling: given every UI module's source, then none matches `/indexedDB|IDB[A-Z]|localStorage|sessionStorage|document\.cookie|caches\./`. A fixture containing each pattern makes the check fail. The `note-storage` AC-51 and AC-53 tests in `storage-boundary.test.ts` are present, unchanged in what they assert, and pass.

### Privacy and dependencies
- AC-47 (US-10, R39): e2e: given a fresh context with request logging, when the app has loaded and the network is idle, the log is cleared, and then a note is saved and "Note saved." is visible, then no request was recorded during the save. `project-foundation` AC-31 (all requests same-origin) still passes.
- AC-48 (US-10, R40): tooling: given `package.json`, then `dependencies` has exactly the keys `react` and `react-dom`. `tests/tooling/licences.test.ts` passes with its exception list unchanged.
- AC-49 (US-6, R23): Component: given the saved state and every failure state from AC-12 and AC-29 to AC-31, then the rendered text contains neither "persist" nor "permission" (case-insensitive).

### Accessibility and layout
- AC-50 (US-8, R34): Component: given `<App />` just rendered, then exactly one element with `role="status"` and one with `role="alert"` exist inside the form, and both have empty text.
- AC-51 (US-8, R37): e2e: given each state in turn (idle empty; idle with a 180-character title so the counter shows; title-too-long error; both-empty error; saved; storage unavailable via the AC-34 init script), when axe runs with the tags `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa`, then there are zero violations, `color-contrast` is not in `incomplete`, and `color-contrast` passes on at least 3 nodes. The "axe detects a contrast failure" check still fails as expected when the info text's secondary line is recoloured `#d4d4d8`.
- AC-52 (US-8, R36): e2e: given a fresh page with focus in Title, when Tab is pressed twice, then focus moves to Note, then to "Save note". On each of the three controls, focused by keyboard, the computed `outline-style` is not `none`, `outline-width` is at least 2px, and `outline-color` is `rgb(29, 78, 216)`.
- AC-53 (US-8, R37, R38): e2e: given viewports 360x740, 768x1024, 1280x800 and 1920x1080, then at each size `scrollWidth <= innerWidth`; the `<h1>`, the "New note" heading, both labels, both fields, the "Save note" button, the hint and both info lines are visible with non-zero size and lie fully within the viewport horizontally; the form's horizontal centre is within 2px of the viewport's; and the button is at least 44px tall.
- AC-54 (US-8, R37): e2e: given a 320x640 viewport, root font size 200%, and the title-too-long state with the counter showing, then there is no horizontal scroll and the labels, fields, button, hint, error message, counter and both info lines are visible.
- AC-55 (US-8, R37): e2e: given a 360px viewport in the title-too-long state, when the WCAG 1.4.12 text-spacing CSS is injected, then there is no horizontal scroll, and no `h1`, `h2`, `label`, `main p`, button or message element is clipped (`scrollWidth <= clientWidth` and `scrollHeight <= clientHeight`).
- AC-56 (US-8, R32): e2e: the `project-foundation` "no animations or transitions" check passes with the form rendered, in the idle state and in the saving state. tooling: `project-foundation` AC-25 (exactly one non-zinc colour token, `accent`) still passes.
- AC-57 (US-8, R1, R11, R15-R16, R20, R34): manual, recorded in `review.md`: with VoiceOver on macOS Safari and on iOS Safari, and in a keyboard-only pass in desktop Chrome:
  - on load, focus is announced as the "Title" text field;
  - a successful save announces "Note saved." and focus returns to Title;
  - an empty save announces "Add a title or some text first.";
  - a too-long save announces the field and its message on focus;
  - a storage failure (forced through the browser's dev tools, for example by blocking site data) announces its message, and a second failed attempt announces it again;
  - the counter is read when focusing the field and is not announced on every keystroke.

### Real-browser survival (ship check)
- AC-58 (US-3, R41): manual at ship, on the live URL, in current desktop Chrome and in current desktop Safari, each in turn:
  1. Save a note with a unique title, for example "A8 check Chrome 2026-10-07", and a two-line body containing an emoji.
  2. **Reload:** reload the page. In dev tools (Chrome: Application → IndexedDB → `quicknotes` → `notes`; Safari: Web Inspector → Storage → Indexed Databases → `quicknotes` → `notes`), the record is there with the same title and body.
  3. **Browser restart:** quit the browser completely (Cmd+Q) and reopen it on the live URL. The record is still there, unchanged.
  4. **New deploy:** after a new `Deploy` run on `main` completes (a later merge, or Actions → Deploy → Run workflow on `main`), reload the live URL. The record is still there, unchanged.

  The result for each browser and step is recorded at ship. A device restart is not part of this check (owner decision 11).

## Constraints
- **Charter:** React + Vite + TypeScript + Tailwind; no backend; notes never leave the device; WCAG 2.1 AA; $0; "ready to type in under 1 second".
- **Owner decisions 1-12 (intent, 2026-10-07)** are binding: form always visible with focus in Title, no "New note" button (1); Save button plus Cmd/Ctrl+Enter, no autosave (2); "Note saved." then clear, info text never untrue and not read from storage (3); inline errors only on save, text kept (4); type past limits, counter near the limit, blocked save names the field (5); Save stays enabled when empty (6); "Leave site?" only with unsaved text, no drafts (7); no up-front storage check (8); no persistence-prompt copy (9); no skip link (10); manual A8 in Chrome and Safari (11); storage boundary (12).
- **Storage layer is used as shipped.** Field limits, code-point counting, error kinds, lazy open and persistence-request timing come from `note-storage` and are not changed here. If one proves wrong for the UI, it goes back to `note-storage` as a spec change.
- **Design system:** `project-foundation`'s zinc greys plus the one `accent` (`blue-700`), the global focus outline, the system font, no animations. No new colour token (see Open questions, item 1).
- **Browsers and sizes:** inherited from `project-foundation`: last 2 versions of Chrome, Edge, Firefox, Safari and iOS Safari; 360px to 1920px, reflow at 320px. Automated browser tests run in Chromium only; Safari is covered by AC-57 and AC-58.
- **Dependencies:** no new runtime dependency (R40). Dev-only additions follow `project-foundation` R5.
- **Tests:** component tests with Vitest + React Testing Library in jsdom; e2e, layout and axe checks with Playwright in headless Chromium under `/quicknotes/` using `gotoApp`; storage-writing e2e tests in isolated contexts (R28). Every check runs in `npm run ci`, except the manual AC-57 and AC-58.
- **Lint:** `eslint-plugin-jsx-a11y` recommended stays on; focus on load must not be done by loosening `no-autofocus` globally.

## Non-goals
- Listing, opening, editing or deleting notes (`list-notes`, `edit-note`, `delete-note`). The app never reads notes back in this slug.
- Search (`search-notes`), light/dark mode (`theme-mode`), service worker, offline install and the full cold-start launch target (`pwa-offline`).
- Autosave, drafts or any storage of unsaved text (decision 7).
- Any QuickNotes copy about the browser's persistent-storage prompt (decision 9), and any notice about whether storage is persistent (`note-storage` decision 7).
- A skip link (decision 10, waits for `list-notes`).
- A "New note" button, a modal, or a separate route for the form (decision 1).
- Rich text, Markdown, attachments, tags, folders, pinning or any field beyond title and body.
- Export, import, backup, sync, accounts or any network call.
- Cross-tab notices.
- Changing any `note-storage` rule or the storage entry point's public surface.
- Automated Firefox or WebKit runs, and a device-restart check.
- Line breaks in titles (the title is a single-line field; see Open questions, item 4).

## Open questions / risks
The approver must accept or change each item before this spec can be
approved. Each item states the proposal this draft is written on.

1. **Error styling without a new colour (decision, needs acceptance).** `project-foundation` R25/AC-25 allows exactly one non-zinc colour (`accent`), so errors here are plain `zinc-900` text plus a 2px `zinc-900` field border and `aria-invalid`, with no red. That meets WCAG (the message text carries the meaning, not colour). The alternative is a `danger` token (for example `red-700`, `#b91c1c`, about 6.5:1 on white), which would need a `project-foundation` R25 revision and an AC-25 change. Accept no red, or ask for `danger`.
2. **"Note saved." has no timer (decision, needs acceptance).** Decision 3 says "brief". This draft keeps the message until the next edit or save attempt (R13), which in practice is as soon as the user starts the next note. A timer adds a timing-dependent state and can hide the message before a screen-reader user hears it. Accept, or set a timeout (for example 5 seconds).
3. **Enter in Title moves to Note (decision, needs acceptance).** Without handling, Enter in a single-line field would submit the form, a third save trigger beyond decision 2. R6 makes it move focus to Note instead. Accept, or make plain Enter in Title do nothing.
4. **Browser text normalisation (risk, needs acceptance).** "Kept exactly as typed" holds for everything the app controls, but the browser itself (HTML spec): (a) removes line breaks pasted into the single-line Title input, so a pasted multi-line title becomes one line before the app sees it; (b) stores Note line breaks as `\n`, so a pasted `\r\n` becomes `\n`. The note saved is still exactly what the user sees in the fields. Accept, or make Title a one-row `<textarea>` (which would allow line breaks in titles that later list views would have to handle).
5. **Both shortcuts on every platform (decision, needs acceptance).** R7 accepts Ctrl+Enter and Cmd+Enter everywhere (simpler, and harmless on either), while the hint names only the platform's usual one, detected from the browser's reported platform. Accept, or restrict each shortcut to its platform.
6. **Copy for approval.** The exact strings in the Copy table, including the visible "New note" heading, the "Note" label for the body, the hint ("Press Ctrl+Enter to save.", also shown on touch devices with no keyboard), the three storage messages and the new info text ("Your notes are saved on this device" / "They stay in this browser and are never sent anywhere."). Approve as written or reword.
7. **Mobile limits (risk).** iOS Safari doesn't open the on-screen keyboard for focus set without a tap, so on an iPhone the cursor is in Title but the user still taps once to type. iOS Safari also doesn't show `beforeunload` warnings, so US-7 holds on desktop browsers only. Neither can be fixed from a web page. Accept.
8. **What the 1-second check measures (risk).** AC-4 runs against the local production preview in CI's headless Chromium. It proves this slug doesn't slow first render, not the cold-start time on a real device over the network, which belongs to `pwa-offline`. CI timing can vary; 1,000 ms leaves a wide margin over today's shell. Accept.
9. **Superseding approved specs (owner housekeeping).** This spec changes `project-foundation` R20, R33 and several ACs, `pages-deploy` R16/AC-16 and `note-storage` R42/AC-56 (see "Changes to earlier specs"), and their existing tests are updated accordingly. Agents don't edit approved artifacts, so should the owner add a one-line cross-reference to each of those specs at ship? Recommended: yes.
10. **Boundary item named as AC-56, not AC-51/53 (confirm).** The rule that kept the UI away from storage is `note-storage` R42/AC-56. That is the one this spec narrows. AC-51 (domain modules are IndexedDB-free) and AC-53 (no production module reaches the in-memory double) stay exactly as they are and keep passing. Confirm this reading.
11. **A8 test notes stay in the database (minor).** With no delete UI yet, the notes saved for AC-40-style checks in real browsers (AC-58) stay in the live site's database and will appear once `list-notes` ships. Clearing them by hand in dev tools would delete every note. Accept, or do AC-58 before any real notes are saved and clear the database afterwards.
12. **First save may show a browser prompt (risk, accepted by decision 9).** In some browsers (for example Firefox) the first save of a launch may show the browser's own persistent-storage prompt. The save doesn't wait for it (`note-storage` R32). QuickNotes adds no copy. Recorded for visibility only.

## Approval
<!-- Who approved this spec, and when. A spec is not approved until a
     human signs off here — this is the primary judgment gate in the
     framework; do not skip it. -->
- Approved by: AITechie, 2026-10-07
