# Feature idea: notes-basic

Use this in Lab A, step 3. Paste the **idea** block after the command:

```
/factory notes-basic "<paste the idea block here>"
```

If an agent asks a question, the answer is almost always in **Answers to
common questions** below. Paste the matching answer. If you're asked
something that isn't covered, answer in the spirit of "smallest thing that
satisfies the fixed interface", and write down what you answered, because
another machine has to give the same answer.

## The idea

```
QuickNotes, feature notes-basic: a web page where I can type a short note,
click Add, and see it appear at the top of my list straight away. Each note
has a Delete button. Notes are saved on the server in a SQLite file, so
they're still there after the server restarts. It must follow this fixed
interface exactly, because an existing acceptance test kit
(labs/notes-app/acceptance/test_acceptance.py) checks it:

START
- Started with: python3 app/server.py   (Python standard library only)
- Port from the PORT environment variable (default 8000); bind 127.0.0.1.
- Database file path from the NOTES_DB environment variable (default
  notes.db). Create the table if it doesn't exist.

PAGE
- GET / returns 200 with Content-Type text/html: one page containing an
  input with id="note-text", a button with id="add-note", a list with
  id="notes-list", and an element with id="error" for error messages.
- The page's JavaScript (inline or a linked .js file served by the same
  server) calls /api/notes to load, add and delete notes.

API (JSON)
- GET /api/notes -> 200, a JSON list of {"id": int, "text": str,
  "created_at": ISO-8601 UTC string}, newest first (highest id first).
- POST /api/notes with body {"text": "..."} -> 201 and the created note
  (same shape). The text is trimmed of leading/trailing whitespace before
  it is checked and saved.
  - empty or whitespace-only text -> 400 {"error": "text is required"}
  - more than 280 characters (after trimming) -> 400
    {"error": "text must be at most 280 characters"}
  - body that isn't valid JSON, or has no "text" string -> 400 with a
    JSON body {"error": "<any message>"}
- DELETE /api/notes/<id> -> 204 with no body; an id that doesn't exist ->
  404 {"error": "note not found"}.
- All error responses are JSON objects with an "error" key.
```

## Answers to common questions

**Why now?**
It's the first feature of a new product, and it's the lab exercise for
learning the SpecFabric factory.

**Who is it for?**
One person on their own computer. No accounts, no login.

**What does "solved" look like?**
The acceptance kit passes 14/14, and in the browser I can add, see and delete notes, which are still
there after a restart.

**What happens in the page while a request is in flight?**
Disable the Add button until the request finishes, so a double click
can't add a note twice.

**What does the page show when there are no notes?**
The text "No notes yet." in the list area.

**How are errors shown in the page?**
In the `error` element, which has `role="alert"`. Use the server's error
message, or "Couldn't reach the server." on a network failure. Clear the
error on the next successful action.

**How should dates be displayed?**
In the browser's locale, using `toLocaleString()`.

**Is there a confirmation before deleting?**
No. It deletes straight away.

**What about pagination, editing, search, or authentication?**
All out of scope for v1.

**What about concurrency?**
It's a single local user. Each request uses its own SQLite connection,
which is enough.

**After a successful add?**
Clear the input and keep the focus in it.

**Does Enter add the note?**
Yes. The input and the Add button are in a `<form>`, and submitting the
form adds the note.

**What are the label and page title?**
The input's label is "New note". The page title and the `<h1>` are both
"QuickNotes".

**How does Delete behave while a request is in flight, or if the note is
already gone?**
Disable that note's Delete button until the request finishes. On a 404,
show "note not found" and remove the note from the list.

**What does the page show while loading, and when an error response has
no message?**
No spinner. The list area stays empty until the first load returns. If an
error response has no `error` text, show "Something went wrong."

**Should the page check the text before sending it?**
No. The server is the only checker, so there's no `maxlength` or
`required` on the input.

**What does the server print when it starts?**
One line: `QuickNotes running on http://127.0.0.1:<PORT>`. Ctrl+C stops it
cleanly, without a traceback.

**What exact format is `created_at`?**
`YYYY-MM-DDTHH:MM:SSZ`: UTC, in whole seconds, with a `Z` at the end.

**What about cases outside the fixed interface?**
- An `<id>` that isn't a number → 404 `{"error": "note not found"}`.
- Unknown paths → 404, and unsupported methods → 405, each with a JSON
  `{"error": ...}` body.
- The 280-character limit counts Unicode characters (Python `len()` after
  trimming).

**What do screen readers hear for the Delete buttons?**
Just "Delete", in line with the charter's plain labels.

**Who are the reviewers or approvers?**
You, the learner. You hold every role in this lab.

**What test layers should be used?**
- Backend: unit tests with `unittest` in `tests/`.
- API: covered end to end by the acceptance kit.
- Frontend: checked by hand in the browser (Lab A, step 7). The kit also
  checks the page structure.
