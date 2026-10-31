---
name: ship
description: Push the current branch to origin.
---

# /ship

Push the current branch to origin.

## Process

1. Ensure working tree is clean

Run:

git status

If uncommitted changes exist, stop and instruct the user to run /commit first.

2. Determine the current branch

git branch --show-current

3. Ensure the branch has at least one commit

git log -1

4. Push the branch

git push origin <current-branch>

If the branch does not exist on the remote, use:

git push -u origin <current-branch>

5. Show the result of the push.

## Safety checks

- Never force push unless explicitly requested.
- Do not push if there are unresolved merge conflicts.
- Confirm the branch name before pushing.

## Troubleshooting: GitHub CLI or SSH errors

If `git push` or any `gh` command fails (e.g. permission denied, authentication error, 404):

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

## Final output

Display:

- branch pushed
- latest commit message
- remote tracking status
