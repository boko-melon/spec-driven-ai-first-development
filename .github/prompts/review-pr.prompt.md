---
name: review-pr
description: Perform a thorough senior-level code review of the current pull request.
argument-hint: "private | post (optional — omit to be asked after review)"
---

# /review-pr

Perform a thorough senior-level code review of the current pull request.

## Context

You are reviewing a pull request as an experienced software engineer responsible for maintaining high code quality.

Focus only on **the changes introduced in this PR** (the diff), not the entire repository.

Use the GitHub CLI to check if there is an existing pull request open in GitHub for the current branch. If so, take note of any comments already on the pull request.

Ensure to take note of the standards and guidance set out in the Context Registry (`docs/docs/context-registry/`). This is the primary source of truth for how things should be done. If the change has an OpenSpec change or archived spec (`openspec/changes/`, `openspec/specs/`), review against it too.

## Review Process

1. Check that the GitHub CLI is available

```
gh --version
```

If the command fails, install it using the appropriate method for the current platform:

- **macOS**: `brew install gh`
- **Windows**: `winget install --id GitHub.cli`
- **Linux (Debian/Ubuntu)**: follow https://cli.github.com/manual/installation

After installing, verify the install succeeded by running `gh --version` again. Then authenticate if needed:

```
gh auth login
```

2. Understand the intent of the change.
3. Analyse the diff file-by-file.
4. Run the **security review in parallel** — invoke `/review-security` on the same diff while performing the steps below. Merge the security findings into the final output under a **Security** section before posting comments.
5. Evaluate the changes across the following areas.
6. Present all findings in chat.
7. Post findings to GitHub based on the argument:
   - **`private`** (or invoked from another prompt with this flag) — do not post. Stop here.
   - **`post`** — post without asking.
   - **no argument** — ask: **"Would you like these comments posted to the PR on GitHub?"** Only post if the user confirms.

   When posting, add comments to the appropriate lines in the relevant pull request in GitHub. Ensure the comments start with [AI Generated comment by {model}] with the model used in the placeholder.

## Review Criteria

### Correctness

- Does the code behave as set out in the spec (if one exists for this change)?
- Does the code impact or change behaviour specified in archived specs?
- Are there edge cases or failure scenarios not handled?
- Are error paths covered?

### Architecture & Design

- Does this change fit the architecture of the project?
- Are responsibilities placed in the correct modules?
- Is the design unnecessarily complex?
- Does this change adhere to the standards set out in the context registry?

### Maintainability

- Is the code readable and understandable?
- Are functions/classes too large or doing multiple things?
- Are naming conventions clear and consistent?

### Type Safety

- Are types accurate and meaningful?
- Are unsafe casts or `any` used unnecessarily?
- Could generics or stricter types improve safety?

### Performance

- Any unnecessary allocations, loops, or repeated work?
- Any potential N+1 patterns or expensive operations?

### Security

Delegated to `/review-security` (run in parallel — see Review Process step 4). Include the full security report in the output.

### Observability

- Is logging sufficient for debugging in production?
- Are errors logged with enough context (content type, locale, operation)?
- Are metrics or tracing hooks needed for this change?

### Tests

- Are tests needed or missing?
- Do tests meaningfully cover new behaviour?

### Developer Experience

- Could this change make debugging harder?
- Are logs, comments, or documentation missing?

## Output Format

Provide feedback using this structure:

### Summary

Brief overall assessment of the PR.

### Major Issues

Problems that should be fixed before merging.

### Minor Suggestions

Improvements that would make the code better but are not blockers.

### Nitpicks

Small style or readability suggestions.

## Rules

- Be concise but specific.
- Only comment on issues visible in the diff.
- Do not invent problems.
- Prioritise correctness and maintainability over style.
