# Eval Cases Reference

## Prompt Writing Rules

Prompts MUST read like a real human typed them. Follow these principles:

| Principle | Do | Don't |
|---|---|---|
| Vary formality | Mix casual ("hey can you…"), direct ("Do X"), contextual ("my manager asked me to…") | All prompts same tone |
| Avoid skill keywords | Don't parrot the skill name or description verbatim | "Use the write-tests skill to write tests" |
| Include context | Add file paths, team names, deadlines, backstory | Bare abstract requests |
| Vary length | Mix terse one-liners with multi-sentence context-heavy prompts | All same length |
| Show intent not method | Describe what the user wants to achieve, not how | "Follow the skill workflow to…" |
| Include typos/abbreviations sparingly | "whats the best way to…", "pls", "auth" | Every prompt is grammatically perfect |

---

## Choosing Eval Scenarios

Target 3–5 eval cases minimum. Cover these axes:

| Axis | Example |
|---|---|
| Happy path | Straightforward task the skill is designed for |
| Edge case | Degenerate input, empty file, ambiguous prompt |
| Complex multi-step | Task requiring multiple skill workflow steps in sequence |
| Minimal input | Terse prompt with little context — tests skill's ability to ask or infer |
| Scope boundary | Task at the edge of what the skill should handle — tests it doesn't over-reach |

Don't cover all axes in every suite — pick the 3–5 most relevant for the skill's domain.

---

## Assertion Writing Rules

- Each assertion must be specific enough that two independent graders agree on pass/fail
- Mix string-checkable assertions (grep-able patterns) with judgement assertions (comprehension)
- Never write vague assertions like "output is good" or "follows best practices"
- Target 5–8 assertions per eval case
- Cover both presence (thing exists) and absence (bad pattern not present)

---

## Anti-Patterns

### Bad: Parroting the skill description

```json
// ❌ If skill description says "validate PR titles against conventional commit format"
{ "prompt": "Validate this PR title against conventional commit format" }

// ✅ Instead
{ "prompt": "hey our CI is rejecting my PR but the error message just says 'title invalid'. Title is 'added new login page'. whats wrong?" }
```

### Bad: Uniform tone

```json
// ❌ All prompts sound the same
{ "prompt": "Please write comprehensive tests for the authentication module." }
{ "prompt": "Please write comprehensive tests for the payment module." }
{ "prompt": "Please write comprehensive tests for the user profile module." }

// ✅ Varied
{ "prompt": "the auth module has zero test coverage and we're shipping monday. help" }
{ "prompt": "I refactored the payment flow to use Stripe's new SDK — need to make sure the discount code logic still works with all the edge cases (expired codes, stacking, minimum spend)" }
{ "prompt": "Can you add test coverage for UserProfile? Focus on the avatar upload — it has weird behaviour when the file is over 5MB" }
```

### Bad: Vague assertions

```json
// ❌
{ "assertions": ["Tests are well-structured", "Good coverage", "Follows best practices"] }

// ✅
{ "assertions": [
  "Creates at least one test for the expired discount code path",
  "Does not mock the Stripe SDK internals — only mocks HTTP responses",
  "Test file is co-located with source in a __tests__/ directory",
  "Each test has a descriptive name that states the expected behaviour"
]}
```

---

## Prompt Variation Techniques

When writing eval prompts for a skill, systematically vary across these dimensions:

| Dimension | Examples |
|---|---|
| **Who** | Junior dev, tech lead, PM asking dev question, external contributor |
| **Urgency** | "shipping friday", "no rush just curious", "prod is down" |
| **Specificity** | Exact file paths vs vague "that component", named functions vs "the auth thing" |
| **Knowledge level** | Uses correct terminology vs describes the concept without jargon |
| **Channel** | Sounds like Slack message, formal ticket, stream of consciousness |
| **Scope** | Single focused task, multi-step workflow, ambiguous open-ended request |

Combine 2–3 dimensions per prompt to create realistic variety without making every prompt a novel.

---

## Checklist

- [ ] ≥ 3 eval cases covering different scenario axes
- [ ] Prompts don't use the skill name or parrot its description
- [ ] Prompts vary in tone, length, explicitness, and complexity
- [ ] At least one prompt includes realistic context (file paths, team names, deadlines)
- [ ] Assertions are specific and independently gradeable (5–8 per case)
