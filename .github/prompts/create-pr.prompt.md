---
name: create-pr
description: Create a pull request with a Conventional Commit title derived from the branch changes
---

# /create-pr

Create a pull request for the current branch with a title following Conventional Commits.

## Goal

Analyse the commits on the current branch (compared to the default branch) and open a pull request with a well-structured conventional commit title and a descriptive body.

## Process

1. Ensure working tree is clean

```
git status
```

If uncommitted changes exist, stop and instruct the user to run /commit first.

2. Determine the current branch and default branch

```
git branch --show-current
git remote show origin | Select-String "HEAD branch"
```

If the current branch is the default branch, stop and inform the user.

3. Ensure the branch is pushed to origin

```
git log origin/<current-branch>..<current-branch> --oneline
```

If there are unpushed commits, stop and instruct the user to run /ship first.

4. Check no PR already exists for this branch

```
gh pr list --head <current-branch> --state open
```

If a PR already exists, show the URL and stop.

5. Analyse the branch changes

```
git log <default-branch>..<current-branch> --oneline
git diff <default-branch>...<current-branch> --stat
```

Understand the scope and nature of the changes to determine the appropriate type and scope.

6. Generate the PR title

Use Conventional Commits format:

```
type(scope): concise summary
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

- Present tense
- ≤ 72 characters
- Clear and descriptive
- Include a scope if obvious. If the branch name contains a ticket key (e.g. `feature/ABC-123-some-description` → `ABC-123`), use it as the scope.
- If the branch contains a single commit, base the title on that commit message
- If the branch contains multiple commits, synthesise a title that captures the overall change
- If the changes include a breaking change, add `!` after the scope: `type(scope)!: summary`

7. Generate the PR body

Structure the body as:

```markdown
## What

Brief description of what this PR does (1–3 sentences).

## Why

Motivation or context for the change.

## Changes

- Bullet list of notable changes
```

If an openspec change exists for this work (check `openspec/changes/` for active changes), reference it in the body.

8. Open the pull request

```
gh pr create --title "<title>" --body "<body>"
```

9. Show the result

Display:

- PR title
- PR URL
- Target branch

## Safety checks

- Never open a PR if the working tree is dirty.
- Never open a PR if there are unpushed commits.
- Never open a PR if one already exists for this branch.
- Confirm the title with the user before creating the PR.

## Troubleshooting: GitHub CLI or API errors

If any `gh` command fails (e.g. 404, authentication error, permission denied):

1. Check the active GitHub account and available accounts:

```
gh auth status
```

2. Check the SSH key being used for the remote:

```
git remote -v
ssh -T git@github.com
```

3. Present the user with options:
   - Switch `gh` account: `gh auth switch --user <username>`
   - Re-authenticate: `gh auth login`
   - Change SSH key configuration in `~/.ssh/config`

4. After switching, retry the failed command.
