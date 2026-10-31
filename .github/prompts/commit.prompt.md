---
name: commit
description: Create a well-structured Conventional Commit from the currently staged changes
---

# /commit

Create a well-structured Conventional Commit from the currently staged changes.

## Goal

Analyse the staged changes and create a clean commit following the Conventional Commits specification. Only staged files are considered — unstaged and untracked changes are ignored.

## Process

1. Inspect the staged changes

Run:

```
git diff --cached --stat
git diff --cached
```

Understand **only the staged changes** before committing. Ignore unstaged and untracked files entirely.

If nothing is staged, inform the user and stop.

2. Generate a Conventional Commit message

Use the format:

```
type(scope): concise summary

optional body explaining the reasoning
```

Allowed types:

- feat
- fix
- refactor
- perf
- docs
- style
- test
- chore
- build
- ci

Rules:

- present tense
- ≤ 72 character title
- clear and descriptive
- include scope if obvious (api, auth, cli, build, ui, etc.)

Example:

```
feat(auth): add session token validation

Add middleware that validates JWT tokens on incoming requests.
```

3. Create the commit

```
git commit -m "<message>"
```

4. Check the result

After committing, check the exit code and command output. If the commit failed (e.g. due to a pre-commit hook, lint error, or format check), **stop and report the error clearly to the user**. Do not retry or attempt to fix the issue automatically.

## Error handling

- If `git commit` fails, show the full error output and explain what went wrong.
- Common failures include: lint-staged errors, ESLint violations, TypeScript type errors, Prettier formatting issues, and pre-commit hook failures.
- Do NOT silently ignore errors, retry the commit, or suppress output.
- Let the user decide how to proceed.

## Safety rules

- Do NOT commit if merge conflicts exist.
- Do NOT commit .env files, secrets, or build artifacts.
- If nothing is staged, inform the user and stop.

## Final output

On success, show a summary of recent commits:

```
git log -n 5 --oneline
```
