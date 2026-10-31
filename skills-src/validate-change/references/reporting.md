# Validation Reporting

## Where to Write

- **OpenSpec mode**: Write to `openspec/changes/<name>/validation-report-<YYYY-MM-DD-HHmm>.md` (using the current date/time) AND present summary in chat
- **Freeform mode**: Present in chat only (no persistent file location)

## Report Format

```markdown
## Validation Report: <change-name or "Freeform">

### Completeness

- Tasks: N/M complete
- Files: all verified present (or list missing)
- Spec consistency: N issues found
  - <description of each deviation with file paths>

### Runtime Validation

**Browser automation**: <run_playwright_code — full browser execution, JS and interactions validated | HTTP fetch only — server-rendered HTML only, client-side unverified | None — validation limited to dev server output>

| #   | Test               | Status | Evidence                         |
| --- | ------------------ | ------ | -------------------------------- |
| 1   | <test description> | PASS   | [screenshot]                     |
| 2   | <test description> | FAIL   | [screenshot] — <what went wrong> |
| 3   | <test description> | SKIP   | Blocked by #2                    |

### Verdict: <PASS | PARTIAL PASS | FAIL>

<Brief summary of the proposal — what the change set out to achieve, derived from `proposal.md` (OpenSpec mode) or the user's stated intent (Freeform mode). Then state whether the implementation meets that intent, partially meets it, or fails to meet it.>

### Suggested Next Steps

1. <concrete action for each issue>
```

## Verdict Logic

- **PASS**: All completeness checks pass, all runtime tests pass
- **PARTIAL PASS**: Some issues found but core functionality works
- **FAIL**: Critical failures — incomplete tasks, app won't start, or primary feature doesn't work

Always include a proposal summary paragraph under the verdict line. This should:

1. Summarise what the change aimed to deliver (1-2 sentences from `proposal.md` or conversation context)
2. State whether the implementation meets, partially meets, or fails to meet that intent
3. Call out the key reasons if not a full PASS

## Suggested Next Steps

For every issue found, suggest a concrete next action:

- Which file to check or fix
- Which task to re-open (OpenSpec mode)
- What the likely root cause is (if inferable)
- Whether to re-run validation after fixes
