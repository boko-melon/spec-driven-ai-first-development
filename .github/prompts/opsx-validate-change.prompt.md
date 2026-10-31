---
description: "Validate that an implemented OpenSpec change works as expected from a user perspective"
argument-hint: "change name (optional)"
---

Validate an implemented change using the `validate-change` skill.

**Input**: Optionally a change name (e.g. `/opsx-validate-change add-auth`). If omitted, infer it from conversation context, or auto-select if `openspec list --json` shows exactly one active change. If still ambiguous, ask the user to pick one. With no OpenSpec change at all, validate in freeform mode.

**Steps**

1. Run `node scripts/skill-check.js validate-change --model <your-model-id>` and act on its `STATUS:` line as described in AGENTS.md.
2. Read `.github/skills/validate-change/SKILL.md` in full, plus every reference file it links to.
3. Follow the skill exactly: determine mode, gather criteria, detect the app, present the test plan and wait for confirmation, run completeness checks, run runtime validation, then write the report.
4. In OpenSpec mode, also run `openspec validate "<name>" --json` and include any errors under Completeness.

**Output**

The validation report from the skill, a verdict (PASS / PARTIAL PASS / FAIL), and suggested next steps. On PASS, suggest `/opsx-archive`.
