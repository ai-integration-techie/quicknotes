# Intent: Edit and delete a note

- Status: Approved
- Slug: edit-delete-note
- Jira: none
- Owner: AITechie
- Date: 2026-10-09

## Problem
Once `list-notes` ships, the user can see every saved note and open
one, but only to read it. A note can't be changed after it is saved.
A typo, a list that needs another item, or a note that is out of date
stays exactly as first saved. A note that is no longer wanted can't be
removed: it stays in the list for good. That includes the real-browser
check notes saved at `create-note` ship (`create-note` AC-58), which
`create-note` accepted would sit in the live database until a delete
existed (its open question 11).

The person who feels this is AITechie, the only user. Everyday notes
change constantly, and the notes tool they use today lets them edit
and delete. Without both, QuickNotes can capture and read notes but
can't keep them current or tidy. It can't replace the current tool,
so the charter's adoption goal (daily use for 4 weeks) can't be met.

## Why now
- It is next in the charter's feature breakdown, straight after
  `list-notes` and before `search-notes`. The charter's v1 scope
  includes "Create, edit and delete notes".
- The charter's Revision 2026-10-09 merged the former `edit-note` and
  `delete-note` slugs into this one slug, with no change in scope, to
  save a delivery cycle. Earlier specs still name `edit-note` and
  `delete-note` (for example `note-storage`: "undo is decided in
  `delete-note`"). Those references now mean this slug.
- The storage layer is ready: `note-storage` already ships `update`
  and `delete`, with their rules, errors and two-tab behaviour settled.
  Only the screens and flows are missing.
- Every day without delete adds test and throwaway notes that can only
  be removed by clearing the whole database in dev tools, which would
  also delete every real note.

**Dependency on `list-notes`.** This slug adds Edit and Delete to the
read-only note view that `list-notes` is specifying now (opened through
`#note/<id>`, with "Back to notes"). That spec may still be a draft. This
intent builds on the `list-notes` intent's owner decisions. The spec for
this slug must wait for the approved `list-notes` spec, or reconcile with
it if the two are written in parallel. Where they disagree, the approved
`list-notes` spec wins, and this slug's spec records the difference.

## Desired outcome
Described as behaviour, not implementation.

### Editing
- **From the opened note.** On the read-only note view from `list-notes`,
  the user can choose to edit the note. They then edit its title and body
  in fields that work like the "New note" form: the same labels, field
  rules, counters near the limit, messages and keyboard shortcuts (per
  `create-note`).
- **Starts from what is saved.** The fields start with the note's
  current title and body, exactly as saved (line breaks, spaces, emoji,
  any script). Nothing is trimmed or changed by the app.
- **Saved only when the user says so.** Changes are saved only when the
  user saves them, with a button or Cmd/Ctrl+Enter. There is no
  autosave and no draft of an edit is stored anywhere (per
  product/decisions.md §2.1).
- **A save replaces the note.** A successful save replaces both the
  title and the body, and the note moves to the top of the list, because
  it is now the most recently updated (per `note-storage` R14, R17). The
  user is told clearly that the changes were saved, and sees the note as
  saved.
- **Nothing changed, nothing saved.** If the user saves without having
  changed anything, the note is not rewritten and does not jump to the
  top of the list (`note-storage` left this to the caller, its open
  question 5).
- **Same rules as creating.** Title up to 200 characters, body up to
  100,000, counted the same way, and not both empty. A save that breaks
  a rule is blocked and names the problem, only when the user saves,
  never while typing. Emptying both fields is not a way to delete a note.
- **Typed text is never lost.** If a save fails (storage unavailable,
  full, or any other error), the user is told plainly and the edited
  text stays on screen so they can try again (per product/decisions.md
  §2.2, §2.3). Leaving an edit with unsaved changes, whether by
  cancelling, going back to the list, using the browser's Back button,
  reloading or closing the tab, never throws the changes away without a
  warning. The spec sets how each route is handled within what a web
  page can do (§2.6).
- **The note was deleted elsewhere.** If another tab deleted the note
  while it was being edited, saving tells the user the note no longer
  exists. It is not silently recreated (`note-storage` R14, R34), and the
  edited text stays on screen so the user can copy it.
- **Two tabs.** If the same note is saved in two tabs, the last save
  wins in full (`note-storage` R34). No conflict warning in v1.

### Deleting
- **Deliberate and safe.** The user can delete the note they have
  opened. Because a delete in QuickNotes is permanent (no trash, no
  soft delete, `note-storage` R15), a single slip must not remove a
  note. Nothing is deleted until the user confirms in an in-page
  confirmation step (Owner decisions, item 1).
- **Afterwards.** Once a note is deleted, the user is back at the list,
  the note is gone from it, "Note deleted." is announced, and focus is
  on the "Your notes" heading (Owner decisions, item 2). If it was the
  last note, the user sees
  the `list-notes` empty state. The note's old `#note/<id>` address,
  reached by Back or a reload, shows the `list-notes` "not found" state,
  not stale text.
- **Honest failures.** If the delete fails, the user is told plainly and
  the note is still there. If another tab already deleted it, the user
  is told it no longer exists and is taken back to the list.

### For both
- **List stays true.** After an edit or a delete, the list in the same
  tab updates straight away, without a reload. Other tabs update when
  they reload (`note-storage` R35).
- **Same quality bar.** WCAG 2.1 AA, fully usable by keyboard and screen
  reader, focus moved and changes announced at every step, 360px phone
  to desktop, the existing look (zinc greys, one `blue-700` accent, the
  visible focus outline, no animations) and the existing copy tone.
- **Privacy holds.** Editing and deleting make no network request and
  store nothing outside the `quicknotes` database. Note text never goes
  into the URL, the console or an error message.

## Non-goals
- Undo after a delete, a trash, an archive, soft delete or tombstones
  (Owner decisions, item 1). No change to `note-storage` R15 (real
  delete).
- Deleting several notes at once, or "delete all".
- Editing or deleting straight from the list. Both start from the
  opened note (Owner decisions, item 2).
- A separate address or history entry for editing, such as
  `#note/<id>/edit` (Owner decisions, item 2).
- Autosave, drafts of edits, or edit history and versions.
- Conflict detection, merging or a warning when another tab changed the
  same note (`note-storage` R34, R35).
- Changing the storage layer: its field rules, sort order, error kinds,
  update semantics or public entry point. If one turns out wrong, it
  goes back to `note-storage` as a spec change.
- Changing the "New note" form's behaviour, beyond what sharing its
  patterns needs.
- Search (`search-notes`), light/dark mode (`theme-mode`), service
  worker and offline install (`pwa-offline`).
- Tags, folders, pinning, rich text, Markdown, attachments, export,
  import, sync or accounts (charter).
- A notice about persistent storage, or copy about the browser's
  persistent-storage prompt (§2.7, `create-note` decision 9).
- New runtime dependencies (§3.2).

## Decisions applied from product/decisions.md
These are not open questions. They are recorded so the spec carries them.

1. **Explicit save, no autosave, no drafts (§2.1).** Editing uses a
   save action, as creating does.
2. **Errors inline, on save, text kept (§2.2).** Edit validation and
   failure messages follow `create-note`'s patterns: shown when the
   user saves, never while typing, with the text kept. Reuse
   `create-note`'s copy where the meaning is the same. The spec writes
   new copy only where it differs (for example "changes saved" and
   "note deleted").
3. **No silent fallbacks (§2.3).** A failed update or delete is always
   reported. Nothing is stored anywhere else.
4. **Skip saves that change nothing (§1.1).** Proposed above under
   "Nothing changed, nothing saved", following `note-storage`'s open
   question 5. Accepted as proposed.
5. **No red, including for Delete (§2.4).** The Delete action and any
   confirmation are styled with the zinc greys and the one accent. The
   danger is carried by wording and structure, not colour.
6. **Accessibility first (§2.5).** Moving between viewing, editing,
   confirming and the list moves focus predictably and announces
   outcomes ("saved", "deleted", failures) through live regions. Keyboard
   shortcuts are additions, never the only way.
7. **Platform limits accepted (§2.6).** The browser's own "Leave site?"
   warning covers reload and close, as in `create-note` R25. Known limits
   (for example iOS Safari not showing it, and the browser's Back button
   not being fully stoppable by a page) are recorded as risks in the
   spec, not worked around with extra features.
8. **Guards changed deliberately (§3.4).** The UI will now call the
   repository's `update` and `delete`, besides `create`, `list` and
   `get`. The guards in `create-note` (R27, AC-37) and whatever
   `list-notes` sets for repository calls are revised in this spec's
   "Changes to earlier specs" table, not loosened silently. The storage
   boundary (UI imports only `src/storage/index.ts`, with its pinned
   export list) stays as it is.
9. **Storage behaviour as shipped (§1.1).** An edit's first save in a
   launch may trigger the browser's persistent-storage request, as a
   create does (`note-storage` R30). A delete never does (R31). No new
   copy for it (§2.7).
10. **No new dependencies (§3.2).** React and the platform only.
11. **Manual ship checks (§4.1).** Editing and deleting on the live site
    in desktop Chrome and Safari, and a VoiceOver pass, are manual ship
    checks. Agents never mark them as passed. The owner may also use the
    new delete to remove the A8 check notes after ship.
12. **Release (§4.2, §4.3) and privacy in the repo (§5.1).** Branch and
    PR into `main`, merge only when CI is green. The owner appears only
    as "AITechie".

## Rough shape (optional)
Hunches only. The spec and plan will confirm or replace them.

- The read-only note view from `list-notes` gains two actions, Edit and
  Delete. Edit switches the same view into an edit form in place, with
  "Save changes" and "Cancel". Saving returns to the read-only view of
  the saved note.
- The edit form could share components with the "New note" form
  (fields, counters, validation and error mapping) so both stay in step.
- Saving calls `update(id, { title, body })` only when the text differs
  from what was loaded. Deleting calls `delete(id)`. `NotFoundError`
  from either gets its own plain message.
- Undo was not chosen (Owner decisions, item 1). A real delete plus
  re-create would have given the note a new id and creation time
  (`note-storage` R2, R12), and a delayed delete risks the note
  surviving if the tab closes. The confirmation step needs no storage
  change.

## Owner decisions (AITechie, 2026-10-09)
Both questions raised under product/decisions.md §1.2 were answered with
the recommended option.

1. **Delete is protected by an in-page confirmation step. There is no
   undo.**
   - Choosing Delete asks "Delete this note?" and shows the note's
     title, with two clear choices: delete, or keep the note.
   - Focus starts on the safe choice (keep the note).
   - Nothing is deleted until the user confirms.
   - The step is built in the page, not with the browser's `confirm()`
     box, so it matches the look and can be tested.
   - This fits `note-storage`'s permanent delete as shipped, with no
     storage change.
2. **Where Edit and Delete live, and how editing flows.**
   - Edit and Delete appear only on the opened note view, next to "Back
     to notes". They are not in the list rows.
   - Edit switches that view into an edit form in place. Editing gets
     no new URL and no history entry.
   - Reloading or closing the tab while editing with unsaved changes
     shows the browser's "Leave site?" warning. If the user leaves
     anyway, the note reopens read-only.
   - With unsaved changes, Cancel, "Back to notes" or the browser's Back
     button asks before discarding them, using the same in-page
     confirmation pattern as delete.
   - After a delete, the user returns to the list, "Note deleted." is
     announced, and focus goes to the "Your notes" heading.

## Open questions
None. Both owner questions were answered on 2026-10-09 (see Owner
decisions above).
