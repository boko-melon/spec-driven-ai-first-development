# Runtime Validation

## Starting the Dev Server

1. **Detect existing server**: Try `fetch('http://localhost:3000')` or navigate with `open_browser_page`. If it loads, reuse it.
2. If not running, start in async terminal mode:
   ```bash
   cd <app-dir> && pnpm dev
   ```
3. Wait for the "ready" signal in terminal output (e.g. "Ready on localhost:3000", "compiled successfully", or "Local: http://localhost")
4. **If the server fails to start**: report as a blocking failure and stop.

## Preferred: Run validation with run_playwright_code

Once the dev server is running, execute all tests in a **single** `run_playwright_code` tool call. This runs a real browser with full JavaScript execution — hydration, state, and interactions all work.

### Step 1 — Load the tool

Use `tool_search` with query `"run playwright code browser automation"` to load `run_playwright_code`.

### Step 2 — Write the Playwright script

Generate a script that covers every test in the plan. Structure it to return a compact results array — do not `console.log` large DOM dumps. Example:

```javascript
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage();
const results = [];

// Test 1 — Homepage loads with hero banner
await page.goto("http://localhost:3000");
await page.waitForLoadState("networkidle");
const t1Pass = (await page.locator("h1").count()) > 0;
results.push({
  id: 1,
  description: "Homepage loads with hero banner",
  status: t1Pass ? "PASS" : "FAIL",
  issues: t1Pass ? [] : ["h1 not found"],
  screenshot: await page.screenshot({ encoding: "base64" }),
});

// Test 2 — CTA button present and labelled
const cta = page.getByRole("button", { name: /search flights/i });
const t2Pass = (await cta.count()) > 0;
results.push({
  id: 2,
  description: "CTA button present",
  status: t2Pass ? "PASS" : "FAIL",
  issues: t2Pass ? [] : ['"Search flights" button not found'],
});

await browser.close();
return {
  results,
  summary: {
    pass: results.filter((r) => r.status === "PASS").length,
    fail: results.filter((r) => r.status === "FAIL").length,
  },
};
```

**Rules for the script:**

- Use `getByRole`, `getByText`, or `locator` — not CSS classes
- Use `waitForLoadState('networkidle')` before assertions to let hydration complete
- Capture a `screenshot` (base64) only for tests that are `FAIL`, or for a final spot-check — not every test
- Return a plain object, not a string

### Step 3 — Interpret the results

The tool response contains the returned object. Use `summary` to populate the report, and embed any `FAIL` screenshots as visual evidence.

---

## Fallback: HTTP fetch pre-check (lightweight, SSR only)

If `run_playwright_code` is unavailable, fetch each page under test and assert against the server-rendered HTML. This cannot see post-hydration client-side content, so report client-side behaviour as unverified.

## Edge Cases

- **No navigable pages** (e.g. shared package with no UI): Skip runtime validation entirely. Report completeness checks only and note that no runtime validation was applicable.
- **Multiple apps affected**: Validate the primary app. Note other affected apps in the report and let the user decide whether to validate those separately.
- **Dev server takes too long**: Use async terminal mode with a reasonable timeout. If the ready signal doesn't appear, report as a blocker.
