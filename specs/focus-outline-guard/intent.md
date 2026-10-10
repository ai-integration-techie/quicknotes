# Intent: Focus-outline guard catches every kind of clipping

- Status: Approved
- Slug: focus-outline-guard
- Jira: none
- Owner: AITechie
- Date: 2026-10-10

## Problem
`list-notes` R30 says no ancestor may clip a note link's 2px blue focus
outline. Its test (AC-48, `e2e/notes-layout.spec.ts`, "clippingAncestors")
only looks at `overflow` on ancestors. During `search-notes` (plan build
note B2) the build agent found that `content-visibility: auto` on the
`<li>` hid the outline entirely, and the test still passed. The cause is
the paint containment that `content-visibility` brings. A keyboard user
would lose the focus indicator, and CI would not notice. Nothing in the
shipped app is broken today; B2 was not shipped. The gap is in the guard.

## Why now
`content-visibility` is already named as the next perf lever if
`search-notes` AC-27 gets flaky (search-notes plan R2). The next agent to
reach for it would get a green build and a broken focus ring. The owner
said yes on 2026-10-10.

## Desired outcome
- The AC-48 guard fails when the note link itself, or any ancestor, has
  any of these computed values:
  - `overflow` other than `visible` (ancestors only, as today);
  - `content-visibility` other than `visible`;
  - `contain` that includes `paint`, or is `strict` or `content`.
- The guard's failure message names the element and the property that
  clips, so the cause is obvious.
- A deliberate check shows the guard bites: with `content-visibility: auto`
  (or `contain: paint`) on the `<li>`, it fails. With the app as shipped,
  it passes.
- Other places whose spec promises an "unclipped" outline get the same
  guard. Today only list-notes AC-48 actually checks clipping:
  1. list-notes AC-48, the note link. Tightened as above.
  2. list-notes AC-48 / R30, "Back to notes". The outline is checked but
     clipping isn't. Proposed: add the guard.
  3. edit-delete-note R36 / AC-50, "Edit" and "Delete" in reading mode, and
     "Save changes" and "Cancel" in edit mode. R36 says "unclipped", but
     AC-50 only checks outline style. Proposed: add the guard.
  4. edit-delete-note AC-50, the dialog buttons ("Keep note", "Delete note",
     "Keep editing", "Discard changes"). See open question 1.
  5. search-notes R21 / AC-24, "Search notes" field and "Clear search". R21
     says "unclipped", but AC-24 only checks outline style. Proposed: add
     the guard.
  6. project-foundation AC-26 and create-note AC-52 (Title, Note, Save
     note, injected button). Their specs don't promise "unclipped". Not
     in scope.
- Each revised test is named in a "Changes to earlier specs" table, and
  the affected ACs' wording is revised, per product/decisions.md §3.4.
  The revisions only add checks; nothing is loosened.

## Non-goals
- No product or UI change, and no runtime code change (no CSS or
  component edits). If a tightened guard fails on today's app, stop and
  raise it. Don't change the app to make it pass.
- No loosening, removal or weakening of any existing check, including the
  current `overflow` check.
- No new dependencies. No adding `content-visibility` or any perf change.
- No new outline checks where no spec promises "unclipped" (item 6).

## Rough shape (optional)
One shared e2e helper (for example, "clipping reasons for this element")
that walks from the element itself up to the root, used by every guarded
test. A self-check that injects `content-visibility: auto` and then
`contain: paint` into the page and expects the helper to report them.
Extending to items 2, 3 and 5 is a stricter, test-only change that fits
product/decisions.md §1.1 and §3.4, so it is accepted as proposed.

## Open questions
1. Dialog buttons (item 4). edit-delete-note AC-49 lets the dialog box
   scroll vertically, so a blanket `overflow` ancestor check would fail
   there by design. **Recommended:** apply only the new
   `content-visibility`/`contain` checks to dialog buttons. Exempt the
   dialog box's own `overflow` and record the exemption in the spec. This
   is a narrower guard there, not a looser one, since nothing checks
   clipping on dialogs today. Alternative: leave dialogs out of scope.
   **Answer (
    
   ): A, the recommended option.** Dialog
   buttons get only the new `content-visibility`/`contain` checks. The
   dialog box's own `overflow` (the scrolling allowed by edit-delete-note
   AC-49) is exempt, and the spec records the exemption.
