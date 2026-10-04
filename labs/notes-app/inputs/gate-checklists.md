# Gate checklists

At each gate the factory stops and waits for you. Read the document it
wrote, tick every box below, and only then change `Status: draft` to
`Status: approved` and fill in the `## Approval` line. If a box can't be
ticked, don't approve. Tell Claude what's wrong (for example "the spec is
missing the 404 for an unknown id"), and the agent will revise the
document.

## Charter gate: `product/charter.md`
- [ ] The tech stack says Python 3.10+, standard library only, with no
      packages to install.
- [ ] The frontend is one HTML page with plain JavaScript (no framework,
      no build step).
- [ ] The v1 scope is add, list and delete notes, and the out-of-scope
      list includes editing, search and accounts.
- [ ] The feature breakdown contains `notes-basic`. It may also list a few
      small follow-up slugs; this lab only builds `notes-basic`.

## Spec gate: `specs/notes-basic/spec.md`
- [ ] It has user stories (`US-1`, `US-2`, …), at least: add a note, see
      notes newest first, delete a note.
- [ ] **Every** rule in the fixed interface (`feature-idea.md`) appears
      as a requirement *and* an acceptance criterion:
      - `PORT` and `NOTES_DB`;
      - the four element ids;
      - the response codes 200, 201, 204, 400 and 404;
      - the exact error messages;
      - trimming;
      - the 280-character limit.
- [ ] The User experience section covers each of these states: empty
      ("No notes yet."), adding (button disabled), error (shown in
      `id="error"`), and success.
- [ ] The Open questions section is empty, or each remaining question is
      one you're happy to accept as is.

## Plan gate: `specs/notes-basic/plan.md`
- [ ] The **API contract** section matches the fixed interface exactly:
      the same paths, status codes and error strings.
- [ ] The Data model is one SQLite table, with the database path taken from
      `NOTES_DB`.
- [ ] The Backend layer lives in `app/server.py`; the Frontend layer
      is the HTML page (and an optional JS file) served by that server.
- [ ] No third-party packages appear anywhere in the plan.
- [ ] The steps are tagged `[DATA] [API] [BE] [FE] [TEST]` and run
      contract-first.
- [ ] The test strategy table has a row for **every** acceptance
      criterion.

## Ship gate: "Commit and push?"
- [ ] `python3 labs/notes-app/verify.py` printed `PASS 14/14`. Run it
      yourself before saying yes.
- [ ] `review.md` says **approve**. Non-blocking findings are fine; note
      any you want to fix later.
- [ ] Every manual check the review couldn't do itself is either done by
      you now, or noted in `review.md`'s Sign-off as not applicable. For
      example: "Ctrl+C on Windows not checked: Linux machine".
- [ ] The commit only contains files under `app/`, `tests/`,
      `specs/notes-basic/`, `factory/` and `product/`.
