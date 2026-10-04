# QuickNotes lab kit

The materials for [`docs/LAB.md`](../../docs/LAB.md): a hands-on lab that
builds a small full-stack app (an HTML/JavaScript page plus a Python API
with SQLite) with the SpecFabric factory. Running it again on another
machine has to produce the same behaviour.

You copy this folder into your lab project in Part 0 of the guide.

| File | What it's for |
|---|---|
| `inputs/charter-answers.md` | The product answers you give the charter agent, identical on every machine |
| `inputs/feature-idea.md` | The `notes-basic` idea, including the **fixed interface**, and answers to the questions agents usually ask |
| `inputs/gate-checklists.md` | What to check before you approve the charter, spec, plan, and ship |
| `acceptance/test_acceptance.py` | The **acceptance kit**: 14 black-box checks that start `app/server.py` and test it over HTTP. This file defines "the same product" |
| `verify.py` | Runs the kit, prints `PASS 14/14`, and writes `verify-report.txt` for comparing machines |
| `optional/browser-check.js` | Optional: an automated browser walkthrough of the page (needs Node.js and Playwright) |

Only Python 3.10+ is needed; there's nothing to install. Run the kit from
the project root:

```bash
python3 labs/notes-app/verify.py      # Windows: py labs\notes-app\verify.py
```

Don't edit the acceptance kit to make a build pass. The kit is the yardstick
every machine is measured with, and its fingerprint in the report shows
that every machine used the same version.
