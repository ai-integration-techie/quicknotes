# Spec: Focus-outline guard catches every kind of clipping

- Status: Approved
- Slug: focus-outline-guard
- Intent: [intent.md](./intent.md)
- Jira: none
- Owner: AITechie
- Reviewers: AITechie (Product Owner, Tech Lead)
- Date: 2026-10-10

<!-- Status values: draft -> approved -> superseded.
     Do not move to "approved" without a human sign-off in the Approval
     section below. A spec with open questions cannot be approved. -->

## Summary
The e2e guard behind `list-notes` AC-48 only checks `overflow` on
ancestors, so `content-visibility: auto` or `contain: paint` can hide a
focus outline and CI stays green. This slug adds one shared guard that also
catches paint containment, proves it with self-check fixtures, and applies
it to every control whose spec promises an "unclipped" outline. It is a
test-only change: no runtime code, CSS or dependency changes.

## Changes to earlier specs
Once this spec is approved, the rows below take precedence over the items
they name. This slug does not edit those slugs' artifacts; only the e2e
tests change (per product/decisions.md §3.4). Every row adds checks;
nothing is removed or loosened.

| Revised test | Was | Now | Why (stricter, never looser) |
|---|---|---|---|
| `list-notes` AC-48 (`e2e/notes-layout.spec.ts`), note link and "Back to notes" | Note link: no ancestor has `overflow` other than `visible`. "Back to notes": outline style/width/colour only, no clipping check. | Both run the full guard (R2): `content-visibility` and `contain` on the element and every ancestor, and `overflow` on every ancestor. The existing outline style/width/colour and animation checks are unchanged. | Adds paint-containment checks to the note link and a clipping check to "Back to notes", which R30 already promises. The `overflow` check is kept as is. |
| `edit-delete-note` AC-50 (`e2e/edit-delete-layout.spec.ts`), "Edit", "Delete", "Save changes", "Cancel" and the dialog buttons "Keep note", "Delete note", "Keep editing", "Discard changes" | Outline style/width/colour only, no clipping check. | "Edit", "Delete", "Save changes", "Cancel": full guard (R2). Dialog buttons: the guard with the dialog exemption (R3): `content-visibility` and `contain` on the element and every ancestor, no `overflow` check. All other AC-50 checks unchanged. | Adds the clipping check R36 promises ("unclipped"). The dialog exemption narrows a new check; nothing checked clipping on dialogs before, and AC-49 lets the dialog box scroll. |
| `search-notes` AC-24 (`e2e/search-layout.spec.ts`), "Search notes" field and "Clear search" | Outline style/width/colour, 44px, 16px text; no clipping check. | Both run the full guard (R2). All other AC-24 checks unchanged. | Adds the clipping check R21 promises ("unclipped"). |

## User stories
- US-1: As a keyboard user, I want the focus outline on every guarded control to stay visible, so that I always know where focus is.
- US-2: As the owner, I want CI to fail with a clear reason when any change clips a guarded focus outline, so that a perf tweak like `content-visibility` can't ship a broken focus ring.

## Requirements
- R1: There MUST be one shared e2e helper (the "guard") that, given a Playwright locator, returns a list of clipping reasons for that element. Every guarded test in "Changes to earlier specs" MUST use it; no guarded test keeps its own copy of the walk.
- R2: The guard MUST walk from the element itself up through every ancestor to `<html>` (inclusive) and report, from computed styles:
  - `content-visibility` with any value other than `visible` (element and ancestors);
  - `contain` whose value includes the keyword `paint`, or is `strict` or `content` (element and ancestors);
  - `overflow-x` or `overflow-y` other than `visible` (ancestors only, not the element itself, as today), one reason per axis.
- R3: **Dialog exemption.** For the dialog buttons ("Keep note", "Delete note", "Keep editing", "Discard changes") the guard MUST run with the `overflow` check off, and still apply both R2 containment checks to the element and every ancestor. The exemption MUST be an explicit option of the guard (for example `{ overflow: false }`), used only by the dialog-button checks, with a comment citing this spec and `edit-delete-note` AC-49. This is the owner's answer A (intent, open question 1).
- R4: Each reported reason MUST name the element and the property and value, as a string `<element> <property>: <value>`, where `<element>` is the lower-case tag name, plus `#id` if the element has an id, plus ` (self)` for the guarded element itself, e.g. `li content-visibility: auto` or `button (self) contain: paint`. Tests assert the list `toEqual([])`, so a failure prints every reason.
- R5: A self-check e2e test MUST prove the guard bites, using the fixtures in AC-3 to AC-6, and MUST restore the page after each injection.
- R6: No file under `src/`, no CSS, no `package.json` dependency and no config other than e2e test files MAY change.
- R7: If any revised test fails on the app as shipped, work MUST stop and the owner MUST be asked. The app MUST NOT be changed to make a guard pass, and the guard MUST NOT be loosened to make it pass.

## User experience
N/A — test-only change; the app's screens, copy and behaviour are unchanged. The "UX" is the CI failure message, defined in R4.

## Acceptance criteria
- AC-1 (US-2, R1): Tooling/review: the guard is defined once in a shared e2e helper module, and `notes-layout.spec.ts`, `edit-delete-layout.spec.ts` and `search-layout.spec.ts` import it. The old inline `clippingAncestors` walk in `notes-layout.spec.ts` is gone (replaced by the guard, which still runs the same `overflow` check).
- AC-2 (US-2, R2, R4): e2e self-check: on the list view with notes, the guard on a note link returns `[]`.
- AC-3 (US-2, R2, R4, R5): e2e self-check: given `content-visibility: auto` set inline on a note link's `<li>`, the guard on that link returns exactly one reason, matching `li` and `content-visibility: auto`. After the style is removed, it returns `[]`.
- AC-4 (US-2, R2, R4, R5): e2e self-check: given `contain: paint` set inline on the same `<li>`, the guard returns exactly one reason, matching `li` and `contain: paint`. After removal, `[]`.
- AC-5 (US-2, R2, R4, R5): e2e self-check: given `contain: strict`, then separately `contain: content`, on the `<li>`, the guard reports `li` with that `contain` value each time; given `contain: layout` alone, it returns `[]`.
- AC-6 (US-2, R2, R4, R5): e2e self-check: given `content-visibility: auto` on the note link itself, the guard reports `a (self) content-visibility: auto`; given `overflow: hidden` on the `<li>`, it reports exactly `li overflow-x: hidden` and `li overflow-y: hidden` (one reason per axis); given `overflow: hidden` on the link itself, it returns `[]` (self overflow not checked).
- AC-7 (US-2, R3): e2e self-check: with a delete dialog open, the guard with the dialog option on "Keep note" returns `[]`; given `contain: paint` set inline on the dialog box (`role="alertdialog"`), it reports that element with `contain: paint`. The full guard (overflow on) on "Keep note" returns reasons that include the dialog box's `overflow-y: auto`, proving the exemption is what lets it pass.
- AC-8 (US-1, US-2, R2): e2e (revised `list-notes` AC-48): a note link and "Back to notes" each get `[]` from the full guard; all existing AC-48 checks still pass.
- AC-9 (US-1, US-2, R2, R3): e2e (revised `edit-delete-note` AC-50): "Edit" and "Delete" in reading mode and "Save changes" and "Cancel" in edit mode each get `[]` from the full guard; "Keep note" and "Delete note" (delete dialog) and "Keep editing" and "Discard changes" (discard dialog) each get `[]` from the guard with the dialog option; all existing AC-50 checks still pass.
- AC-10 (US-1, US-2, R2): e2e (revised `search-notes` AC-24): "Search notes" and "Clear search" (shown after typing a query) each get `[]` from the full guard; all existing AC-24 checks still pass.
- AC-11 (R6): Review: `git diff main` touches only files under `e2e/` (plus this slug's artifacts and the factory ledger); no `src/`, CSS, `package.json` or lockfile change.
- AC-12 (R7): The full e2e suite passes on the app as shipped, in CI. If any guarded check fails, the build stops and the failing reasons are reported to the owner; no app or guard change is made to get past it.

## Constraints
- Test-only. Playwright e2e, existing tooling, no new dependencies (product/decisions.md §3.2).
- Revisions are named in the table above and only add checks (§3.4).
- Computed styles only: the guard reads `getComputedStyle`; it does not measure pixels or screenshots.

## Non-goals
- No runtime, CSS or component change; no `content-visibility` or perf work.
- No loosening or removal of any existing check, including today's `overflow` check.
- No guard for controls whose spec doesn't promise "unclipped" (`project-foundation` AC-26, `create-note` AC-52).
- No checks for other properties that can hide an outline (`clip-path`, `mask`, `opacity`, `filter`, z-order overlap). See risk 2.
- No geometric check that the dialog box's padding leaves room for the outline. See risk 3.

## Open questions / risks
1. **Dialog backdrop also scrolls (open question).** The shipped dialog has two scrolling ancestors of its buttons: the dialog box (`role="alertdialog"`, `overflow-y-auto`) and the backdrop (`data-dialog-backdrop`, also `overflow-y-auto`), both in `src/components/ConfirmDialog.tsx`. This spec applies answer A as written: dialog buttons get no `overflow` check at all, so the backdrop is not checked either. **Recommended:** keep R3 as written. Alternative: run the `overflow` check on dialog-button ancestors except the dialog box and the backdrop (stricter, needs the exemption to name two elements instead of one).
2. **Other ways to hide an outline.** `clip-path`, `mask`, `opacity: 0`, `filter` or an overlapping sibling could still hide an outline without failing this guard. Out of scope per the intent; recorded so a later slug can extend R2 if needed.
3. **Overflow-exempt dialog boxes can still clip.** A scrolling box clips at its padding edge. Today's `p-6` (24px) leaves room for a 2px outline, but a padding change could clip a dialog button's outline without failing any test. Accepted with answer A; recorded here.
4. **Shipped app might fail a tightened guard.** Not expected (nothing in `src/` sets `content-visibility` or `contain`), but if any revised test fails on today's app, R7 applies: stop and ask.

## Approval
<!-- Who approved this spec, and when. A spec is not approved until a
     human signs off here — this is the primary judgment gate in the
     framework; do not skip it. -->
- Approved by: AITechie, 2026-10-10
