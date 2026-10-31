---
name: write-evals
description: >
  Write eval cases and trigger eval queries for agent skills. Generates realistic,
  varied eval prompts that use natural human language — not skill names or description
  keywords. Also produces trigger eval query sets (should-trigger and should-not-trigger)
  to test whether a skill's description activates reliably. Use when writing evals,
  creating eval cases, adding test prompts for a skill, designing trigger queries,
  testing skill activation, or when the user mentions "write evals", "eval prompts",
  "trigger queries", or "activation testing".
---

# Write Evals

Write eval cases and trigger eval queries for agent skills.

---

## Process

1. **Identify target skill** — read the skill's `SKILL.md` (frontmatter + body) to understand scope, triggers, and workflow. If the skill contains references, assets or scripts, read those too.
2. **Determine what to write** — check what already exists in `{skill_dir}/evals/`. Write what's missing. If all three files exist, ask the user what to add or improve.
3. **Draft** — generate content following the rules below.
4. **Present draft** — show the full JSON to the user before writing any file. Ask if coverage is sufficient.
5. **Save** — write to disk only after user confirms.

### Minimum viable eval suite

| Artifact             | Minimum                               | When to add                                              |
| -------------------- | ------------------------------------- | -------------------------------------------------------- |
| `evals.json`         | 3 cases                               | Always — first thing to write                            |
| `trigger-evals.json` | 16 queries (8+ positive, 8+ negative) | Always — write alongside or immediately after eval cases |

---

## Writing Eval Cases

Eval cases test whether a skill produces better output than an unaided agent. Save to `{skill_dir}/evals/evals.json`.

### Core rules

- Prompts MUST read like a real human typed them — varied tone, length, context
- Never parrot the skill name or description verbatim
- Target 3–5 cases covering different scenario axes (happy path, edge case, complex, minimal, boundary)
- 5–8 specific, gradeable assertions per case — no vague "follows best practices"

See [EVAL-CASES.md](EVAL-CASES.md) for the prompt writing rules table, scenario selection guide, anti-patterns, and variation techniques.

### Schema

```json
{
  "skill_name": "the-skill-name",
  "description": "What this eval suite measures",
  "evals": [
    {
      "id": 1,
      "name": "kebab-case-name",
      "prompt": "Natural human prompt",
      "expected_output": "Description of ideal output",
      "files": ["evals/files/input.md"],
      "assertions": ["Specific verifiable claim"]
    }
  ]
}
```

---

## Writing Trigger Eval Queries

Trigger queries test whether a skill's `description` activates on relevant prompts and stays silent on irrelevant ones. Save to `{skill_dir}/evals/trigger-evals.json`.

### Core rules

- ~20 queries: 8–12 should-trigger, 8–12 should-not-trigger
- Should-trigger: vary phrasing, explicitness, detail, complexity. Most valuable = skill would help but connection isn't obvious
- Should-not-trigger: write **near-misses** that share keywords but need a different capability
- Include realistic context: file paths, personal backstory, casual language, typos

See [TRIGGER-EVALS.md](TRIGGER-EVALS.md) for detailed rules, full worked examples, and realism tips.

### Schema

```json
[
  { "query": "realistic user prompt", "should_trigger": true },
  { "query": "realistic near-miss prompt", "should_trigger": false }
]
```

---

## Checklist

After drafting, run the checklist for the relevant eval type:

- [Eval cases checklist](EVAL-CASES.md#checklist)
- [Trigger queries checklist](TRIGGER-EVALS.md#checklist)
