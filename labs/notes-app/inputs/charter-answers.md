# Charter answers: QuickNotes

Paste this whole block when you run `/factory charter quicknotes` (Lab A,
step 1), and use it to answer any follow-up questions the charter agent
asks. Every machine uses the same answers, which is one of the reasons the
runs come out the same.

```
Product: QuickNotes

Vision: A tiny web app for jotting down short notes. You type a note in the
browser, it is saved on the server, and it is still there tomorrow.

Target users: One person using it on their own computer (a learner doing
the SpecFabric lab). Today they use sticky notes or a text file.

Success metrics: The acceptance kit in labs/notes-app passes 14/14 on every
machine that runs the lab, and a person can add, see and delete a note in
the browser in under a minute.

Scope for v1: Add a note, list notes (newest first), delete a note. Notes
are saved in a SQLite file and survive a server restart. One feature only:
notes-basic.

Out of scope for v1: Editing notes, search, user accounts or login,
sharing, tags, mobile apps, deployment to the internet.

Tech stack & architecture:
- Python 3.10 or newer, standard library only. No third-party packages,
  no pip install, no npm.
- Backend: http.server (ThreadingHTTPServer) + sqlite3, in app/server.py.
- Frontend: one HTML page with plain JavaScript (no framework, no build
  step), served by the same server.
- API style: JSON over HTTP (REST-style), no authentication (local use).
- Hosting: runs locally with `python3 app/server.py`; no deployment.

Design system:
- Plain HTML with a small amount of inline CSS; system font.
- Short, plain labels ("Add", "Delete").
- Accessibility: WCAG 2.1 AA basics: every input has a label, buttons are
  real <button> elements, errors are announced (role="alert"), the whole
  flow works with the keyboard.
- Supported: current Chrome, Firefox, Safari and Edge on desktop.

Constraints: Must run identically on macOS, Linux and Windows with only
Python installed. The fixed interface in labs/notes-app/inputs/
feature-idea.md must not change, because the acceptance kit tests it.
```
