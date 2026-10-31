# Completeness Checks

## OpenSpec Mode

### 1. Task Checkboxes

Parse `tasks.md`:

- Count `- [ ]` (incomplete) vs `- [x]` (complete)
- List any incomplete tasks by name
- Report: "Tasks: N/M complete"

### 2. File Existence

For each task that references a file or component:

- **Explicit paths**: If the task mentions a file path (e.g. `app/components/LocaleSwitcher/`), check it directly
- **Implicit references**: If the task mentions a component or module by name (e.g. "Create `LocaleSwitcher` component"), infer the path from the conventions in `design.md` first, then from where similar files already live in the codebase
- Verify each inferred file exists in the filesystem
- Report any missing files as issues with expected path

### 3. Spec Consistency

Perform a structured comparison of design intent vs actual implementation:

**Step 1 — Extract claims from design artifacts**

Read `design.md` and `proposal.md`. Extract concrete, verifiable claims. Examples:

- "LocaleSwitcher goes in `app/components/`"
- "Styled with Tailwind utility classes"
- "Server Component by default, Client Component wrapper for interactivity"
- "Exports from parent index.ts"

**Step 2 — Verify each claim against the codebase**

For each claim, search the codebase to confirm or deny:

- **File location claims**: Use `file_search` to check the file is where the design says
- **Pattern claims** (styling approach, Server/Client Component): Read the relevant file and grep for the expected pattern (e.g. `'use client'`, a stylesheet import, a token or utility class)
- **Structural claims** (exports, component hierarchy): Read `index.ts` files to verify export chains

**Step 3 — Report deviations**

For each claim that doesn't match:

- State the claim (from which artifact, which section)
- State what was found instead (with file path and line if possible)
- Classify as deviation (not necessarily a bug — the implementation may have improved on the design)

## Freeform Mode

1. **Identify changed files** using `git diff --name-only HEAD~N` (where N is estimated from conversation length) or `git diff --name-only main` to see all uncommitted/branched changes
2. Cross-reference the changed files against the user's stated intent — do the modified files make sense for what was requested?
3. Check for **missing files**: Based on the intent, are there files that _should_ have been created or modified but weren't? (e.g. user asked for a new component but no test file exists)
4. Check for **unexpected files**: Were files modified that don't seem related to the intent? Flag for the user's attention.
5. Note any discrepancies between expected and actual file state
