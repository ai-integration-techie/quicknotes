"""Run the QuickNotes acceptance kit and write verify-report.txt.

Usage (from the project root):  python3 labs/notes-app/verify.py
Exit code 0 = every check passed, 1 = a check failed, 2 = nothing to test.

The report is designed to be compared across machines: the same kit
fingerprint plus the same PASS lines means the same product behaviour,
whatever the generated code looks like.
"""

import hashlib
import platform
import subprocess
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

KIT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = KIT_DIR.parents[1]
TEST_FILE = KIT_DIR / "acceptance" / "test_acceptance.py"
REPORT = PROJECT_ROOT / "verify-report.txt"


def git_commit():
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=PROJECT_ROOT, capture_output=True, text=True, check=True,
        )
        dirty = subprocess.run(
            ["git", "status", "--porcelain", "--", "app"],
            cwd=PROJECT_ROOT, capture_output=True, text=True,
        ).stdout.strip()
        return out.stdout.strip() + (" (+ uncommitted changes in app/)" if dirty else "")
    except (OSError, subprocess.CalledProcessError):
        return "unknown (not a git repository)"


def main():
    if sys.version_info < (3, 10):
        print(f"Python 3.10 or newer is required (this is {platform.python_version()}).")
        return 2
    if not (PROJECT_ROOT / "app" / "server.py").exists():
        print("app/server.py not found: nothing to test yet.")
        print("Build the app first (Lab A step 5, or Lab B's /implement), then run this again.")
        return 2

    sys.path.insert(0, str(TEST_FILE.parent))
    suite = unittest.defaultTestLoader.loadTestsFromName("test_acceptance")
    result = unittest.TestResult()
    tests = list(_flatten(suite))
    lines = []
    failed = 0
    for test in tests:
        before = len(result.failures) + len(result.errors)
        test.run(result)
        ok = len(result.failures) + len(result.errors) == before
        failed += not ok
        description = (test.shortDescription() or test.id()).strip()
        lines.append(f"{'PASS' if ok else 'FAIL'}  {test.id().rsplit('.', 1)[-1]}  {description}")

    total = len(tests)
    summary = f"{'PASS' if failed == 0 else 'FAIL'} {total - failed}/{total}"
    kit_hash = hashlib.sha256(TEST_FILE.read_bytes()).hexdigest()[:16]
    header = [
        "QuickNotes acceptance report",
        f"date (UTC):      {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}",
        f"machine:         {platform.node()} ({platform.system()} {platform.release()})",
        f"python:          {platform.python_version()}",
        f"project commit:  {git_commit()}",
        f"kit fingerprint: {kit_hash}  (must match on every machine)",
        "",
    ]
    details = []
    for test, trace in result.failures + result.errors:
        details += ["", f"--- {test.id().rsplit('.', 1)[-1]} ---", trace.strip()]

    REPORT.write_text("\n".join(header + lines + ["", summary] + details) + "\n", encoding="utf-8")
    print("\n".join(lines))
    print()
    print(summary)
    if failed:
        print("Failure details are at the end of verify-report.txt.")
    print(f"Report written to {REPORT.name} (kit fingerprint {kit_hash}).")
    return 0 if failed == 0 else 1


def _flatten(suite):
    for item in suite:
        if isinstance(item, unittest.TestSuite):
            yield from _flatten(item)
        else:
            yield item


if __name__ == "__main__":
    sys.exit(main())
