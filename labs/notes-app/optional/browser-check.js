// Optional: an automated version of Lab A step 7 (the browser walkthrough).
//
// It needs Node.js and Playwright, which the rest of the lab doesn't:
//   npm install --no-save playwright && npx playwright install chromium
// Run it from the project root:
//   node labs/notes-app/optional/browser-check.js
//
// It starts app/server.py on a spare port with a throwaway database, then
// works through the page in a headless browser, the way a person would.
// If you don't have Node, do step 7 by hand instead: it checks the same
// things.

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright isn't installed. Run: npm install --no-save playwright && npx playwright install chromium");
  process.exit(2);
}

const root = path.resolve(__dirname, "..", "..", "..");
const python = process.env.PYTHON || (process.platform === "win32" ? "py" : "python3");
const port = String(8100 + Math.floor(Math.random() * 800));
const db = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "quicknotes-")), "notes.db");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startServer() {
  return spawn(python, [path.join("app", "server.py")], {
    cwd: root,
    env: { ...process.env, PORT: port, NOTES_DB: db },
    stdio: "ignore",
  });
}

async function waitForServer(page, url) {
  for (let i = 0; i < 50; i++) {
    try {
      await page.goto(url);
      return;
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`app/server.py did not answer on ${url}`);
}

(async () => {
  let failed = 0;
  const check = (name, ok) => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
    if (!ok) failed++;
  };

  let server = startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const url = `http://127.0.0.1:${port}/`;
  const items = () => page.locator("#notes-list li");
  const settle = () => page.waitForTimeout(400);

  try {
    await waitForServer(page, url);
    await settle();
    check('1 empty list shows "No notes yet."', (await page.textContent("body")).includes("No notes yet."));

    await page.fill("#note-text", "Buy milk");
    await page.press("#note-text", "Enter");
    await settle();
    check("2 Enter adds the note", (await items().count()) >= 1 && (await items().first().textContent()).includes("Buy milk"));
    check("2 the input is cleared", (await page.inputValue("#note-text")) === "");

    await page.click("#add-note");
    await settle();
    check('3 an empty Add shows "text is required"', (await page.textContent("#error")).includes("text is required"));
    check('3 the error element has role="alert"', (await page.getAttribute("#error", "role")) === "alert");

    await page.fill("#note-text", "Call Sam");
    await page.click("#add-note");
    await settle();
    check("4 the newest note is first", (await items().first().textContent()).includes("Call Sam"));
    check("4 the error clears after a success", ((await page.textContent("#error")) || "").trim() === "");

    await items().filter({ hasText: "Buy milk" }).getByRole("button", { name: "Delete" }).click();
    await settle();
    check("5 Delete removes the note", (await items().count()) === 1);

    server.kill();
    await sleep(500);
    server = startServer();
    await waitForServer(page, url);
    await settle();
    check("6 notes survive a server restart", (await items().count()) === 1 && (await items().first().textContent()).includes("Call Sam"));

    await page.focus("#note-text");
    await page.keyboard.type("Keyboard only");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement.id);
    await page.keyboard.press("Enter");
    await settle();
    check("7 Tab reaches Add, and Enter activates it", focused === "add-note" && (await items().first().textContent()).includes("Keyboard only"));
  } finally {
    await browser.close();
    server.kill();
  }

  console.log(failed ? `\nFAIL: ${failed} browser check(s) failed` : "\nPASS: all browser checks");
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
