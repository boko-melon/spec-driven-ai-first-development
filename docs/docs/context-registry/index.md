---
slug: /context-registry
---

# Context Registry

The context registry is the shared, structured source of truth for how we build things. Humans and AI agents read the same pages, so decisions, standards and good examples do not live only in people's heads or in one-off prompts.

## How it is used

- **Skills** in `skills-src/` link to registry pages with relative markdown links. `pnpm build:skills` resolves the links, and each skill's `context_hash` covers the pages it links to. Editing a linked page marks every skill that links to it as stale until its evals are re-run and re-stamped.
- **OpenSpec** design and tasks rules point agents here when making decisions.
- **Reviews** (`/review-pr`, `/review-security`) check changes against these pages.

Links from a skill that leave the skill folder must point to files under `docs/docs/`, or the build fails.

## Content types

| Type      | Answers                     | Example                       |
| --------- | --------------------------- | ----------------------------- |
| Approach  | How we work in this space   | Component-driven, API-first   |
| Standard  | What must be true           | Comments, security principles |
| Pattern   | A reusable solution shape   | Composition over inheritance  |
| Playbook  | How to do a task            | How to write an ADR           |
| Reference | Facts to look up            | Glossary, folder structure    |
| Decision  | Why we chose this           | ADRs                          |
| Template  | A starting artifact         | ADR template                  |
| Example   | What good looks like        | A well-built component        |

## What belongs here

A page belongs here when it is reusable beyond one change, canonical (one source, not one of many), current, specific enough to act on, and clear about where it applies. Change-specific plans stay in `openspec/changes/`.

## Pages

- [Design principles](./dev-guides/coding-standards/design-principles.md)
- [Comments](./dev-guides/coding-standards/comments.md)
- [Digital security principles](./security/digital-security-principles.md)

## Defaults, not dogma

These are defaults. A deviation is fine when it is documented, scoped and linked to the decision that justifies it.
