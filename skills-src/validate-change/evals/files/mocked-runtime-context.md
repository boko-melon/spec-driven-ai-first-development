# Mocked Runtime Validation Context

## Scenario

The locale-switcher change has passed completeness checks. The dev server is confirmed running at `http://localhost:3000`. Below is the mocked output from Playwright MCP browser tools for each test step. Use this to produce the Runtime Validation section of the validation report.

---

## Test 1: Locale switcher is visible in the header on the homepage

**Navigate**: `browser_navigate` to `http://localhost:3000/`  
**Wait**: `browser_wait_for` — `[role="main"]` found

**Snapshot** (`browser_snapshot`):

```
landmark [role="banner"]
  nav [role="navigation"]
    link "easyJet"
    button [role="button"] name="EN" aria-expanded="false" aria-haspopup="listbox"
landmark [role="main"]
  heading "Find cheap flights"
```

**Console** (`browser_console_messages`): No errors or warnings.

**Screenshot**: Page loads correctly, button labelled "EN" visible in header.

**Result**: PASS — locale switcher button present in header, correct accessible name and ARIA attributes.

---

## Test 2: Dropdown opens on click and shows locale options

**Interact**: `browser_click` on `button[name="EN"]`  
**Wait**: `browser_wait_for` — `[role="listbox"]` found

**Snapshot** (`browser_snapshot`):

```
landmark [role="banner"]
  nav [role="navigation"]
    button [role="button"] name="EN" aria-expanded="true" aria-haspopup="listbox"
    listbox [role="listbox"]
      option "English (EN)" selected
      option "Français (FR)"
      option "Deutsch (DE)"
      option "Español (ES)"
```

**Console** (`browser_console_messages`): No errors or warnings.

**Screenshot**: Dropdown open, four locale options visible, English currently selected.

**Result**: PASS — dropdown opens, all expected locale options present, aria-expanded updates correctly.

---

## Test 3: Pressing Escape closes the dropdown

**Interact**: `browser_key_press` `Escape`  
**Wait**: `browser_wait_for` — `[role="listbox"]` gone

**Snapshot** (`browser_snapshot`):

```
landmark [role="banner"]
  nav [role="navigation"]
    button [role="button"] name="EN" aria-expanded="false" aria-haspopup="listbox"
```

**Console** (`browser_console_messages`): No errors or warnings.

**Screenshot**: Dropdown closed, button returns to collapsed state.

**Result**: PASS — Escape key closes dropdown, aria-expanded resets to false, focus returns to trigger button.

---

## Test 4: Selecting a locale updates the button label and reloads in the new locale

**Interact**: `browser_click` on `button[name="EN"]` to reopen, then `browser_click` on `option[name="Français (FR)"]`  
**Wait**: `browser_wait_for` — page navigation complete, `[role="main"]` found

**Snapshot** (`browser_snapshot`):

```
landmark [role="banner"]
  nav [role="navigation"]
    button [role="button"] name="FR" aria-expanded="false" aria-haspopup="listbox"
landmark [role="main"]
  heading "Trouvez des vols pas chers"
```

**Console** (`browser_console_messages`):

```
[error] Failed to load resource: the server responded with a status of 404 (Not Found) — /_next/static/chunks/fr-locale-strings.js
```

**Screenshot**: Button label updates to "FR", page heading translated to French, but console error present.

**Result**: FAIL — locale selection works and UI updates correctly, but a 404 console error for the French locale strings chunk suggests the locale bundle was not built or is missing from the Next.js output.
