---
name: address-pr-comments
description: After human or AI code review, incrementally action selected feedback.
argument-hint: "Link to Dev Guide or Implementation Plan"
---

## Instructions

1. **Understand implementation context**: We have recently implemented a new feature. Please read the relevant documentation from the user's argument / attached files, usually in a spec related to the change. Be aware of the context registry and design/architecture and coding standards from the docs folder.

2. **Understand workflow**: Using the current branch, use the GitHub CLI to find the relevant PR on GitHub. Get all the unresolved comments on the PR. Look at all the comments on the whole PR including the ones from github-actions bot, not only the inline comments. You must work through comments **one at a time** — never batch or address multiple comments together. For each comment:

- First: Present the single comment to the user, explain your understanding of the feedback, and state what you propose to do (or why you disagree). **Stop and wait for the user to confirm** before making any changes.
- Second: Only after explicit confirmation, make the change, run all tests and linters, then move on to the next comment.

**Do not proceed to the next comment until the current one is fully resolved and confirmed.**

3. **Reply to resolved comments**: After successfully addressing a review comment (code changes made, tests passing), reply to that comment on the PR with:
   - A short summary of what was changed to address the feedback
   - Ensure the comments start with [AI Generated comment by {model}] with the model used in the placeholder.

4. **Confirm understanding**: After reading the plan and understanding the instructions let the user know you are ready to address the first piece of feedback or ask clarifying questions. Work through all the feedback on the pull request in this way.
