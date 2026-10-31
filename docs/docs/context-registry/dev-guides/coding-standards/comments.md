---
title: Comments
registry_id: comments-standards
sidebar_position: 5
---

# Comments

**Default to no comments.** We favour readable code over documentation volume: names and types carry the meaning, and a comment is the exception that explains something the code cannot. If you are unsure whether a comment is needed, leave it out.

## Never comment

Do not write any of the following, whether by hand or via AI:

- Comments that restate or narrate what the code does (`// Set loading to true`)
- JSDoc that mirrors the function signature, props or types (`@param id - the id`)
- JSDoc or header blocks on components, hooks, props interfaces, tests, stories or file tops
- Section dividers or labels (`// Props`, `// Render`, `// ---- Helpers ----`)
- Comments describing the change or its history (`// added for REV-123`, `// now uses X`, `// fixed bug`)
- Commented-out code
- Comments that duplicate a nearby test name, type name or ADR

## When a comment is allowed

Add a comment only when **all** of these hold: the code cannot be made clearer through naming, types or structure, and a competent developer reading it cold would be misled or confused without the comment.

| Situation                                          | Example                                                                 |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| **A hidden constraint or workaround**              | "We fetch here instead of in the parent because of RSC streaming order" |
| **Domain knowledge that cannot be inferred**       | Business rules, CMS field naming conventions, regulatory rules          |
| **Intent of a non-trivial regex or algorithm**     | A regex that encodes a business rule                                    |
| **The public contract of a shared package export** | A function exported from a shared package consumed by other teams       |
| **Justifying a lint or type suppression**          | The reason next to `eslint-disable` or `@ts-expect-error`               |

Write the _why_, not the _what_, in one or two lines.

## Our Rules

1. **Fix the code first.** Rename, extract a function or tighten a type before reaching for a comment.
2. **Keep comments accurate.** A wrong or stale comment is worse than none. Update or remove it in the same change that makes it stale.
3. **Do not touch unrelated comments.** Leave existing comments alone unless your change makes them wrong.

## AI Guidance

- **Review your own diff before finishing.** Delete auto-generated JSDoc, narration and any comment that is not a non-obvious _why_, and verify the ones you keep against the code.
- **Ask for a comment explicitly when intent is non-obvious.** _"Add a comment explaining why we do X here"_ produces better results than blanket documentation.

## Quick Examples

### ✅ Good — explains _why_

```ts
// The CMS returns UTC but the UI expects the venue's local time; convert here so components stay timezone-agnostic.
function toLocalStartTime(utcDate: string, venueTz: string): string {
  ...
}
```

### ✅ Good — justifies a suppression

```ts
// eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; routeId is read from the initial URL only
useEffect(() => {
  trackRouteView(routeId);
}, []);
```

### ❌ Bad — see [Never comment](#never-comment)

```tsx
// Set the loading state to true
setIsLoading(true);

/**
 * FlightCard component.
 * @param props.price - The price of the flight
 */
export const FlightCard = ({ price }: FlightCardProps) => { ... };

// ---- Helpers ----
// Updated to use the new fetcher (REV-123)
const getFlights = () => fetchFlights();
```
