---
name: validate-change
description: "Validate that implemented changes work as expected from a user perspective. Use when the user wants to verify a feature after implementation, check if a change matches its spec, validate that their changes work as expected, or test a completed feature. Runs completeness checks, starts the app, and uses VS Code browser tools to verify expected behaviour with screenshots."
---

Validate that a change works as expected — from a user perspective, not just a code perspective.

**Two modes**: OpenSpec (artifacts exist) or Freeform (infer intent from chat context).

---

## Step 1: Determine Mode

Check if an OpenSpec change is in context:

- If a change name was mentioned, or `openspec list --json` shows an active change, use **OpenSpec mode**
- Otherwise, use **Freeform mode**

Announce which mode: "Validating in OpenSpec mode for change: `<name>`" or "Validating in freeform mode based on conversation context."

## Step 2: Gather Validation Criteria

### OpenSpec Mode

1. Read the change artifacts in order: `proposal.md`, `design.md`, `specs/` (if present), `tasks.md`
2. Derive the **intended user experience** — what should a user see, interact with, and expect

### Freeform Mode

1. Review conversation context to identify the **primary intent** — the initial, main, or most recent instruction describing what the user wanted
2. Summarise the intent in 2-3 sentences
3. Derive the **intended user experience** from the instruction

## Step 3: Detect the App

1. **OpenSpec mode**: Infer the app from the change path or files referenced in tasks
2. **Freeform mode**: Infer from files discussed in conversation or the user's current working directory
3. Read the app's `package.json` to determine the dev start command and port

## Step 4: Present the Test Plan

Before executing, present a readable test plan showing: app, mode, completeness checks planned, and a table of runtime tests with page and expected behaviour. Wait for the user to confirm or adjust.

## Step 5: Run Completeness Checks

Follow the procedure in [completeness checks reference](./references/completeness-checks.md).

## Step 6: Start the Dev Server and Run Runtime Validation

Follow the procedure in [runtime validation reference](./references/runtime-validation.md).

## Step 7: Write the Validation Report

Follow the format in [reporting reference](./references/reporting.md).
