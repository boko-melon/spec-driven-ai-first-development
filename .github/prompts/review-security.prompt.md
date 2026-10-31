---
name: review-security
description: Security review of a change against the context registry security principles and OWASP Top 10.
---

# /review-security

Perform a security review of the specified code, endpoint, or change against our digital security principles and common vulnerability patterns.

## Context

You are reviewing code as an engineer responsible for security quality. Your goal is to identify violations of our security principles, common vulnerability patterns (OWASP Top 10), and gaps in our non-functional requirements.

If no specific file or area is given, focus on **the current working changes** — any modified files compared to the main branch.

## Required Reading

Before reviewing, read these documents:

1. **`docs/docs/context-registry/security/digital-security-principles.md`** — our core security principles. These are the primary benchmark for the review.
2. **`docs/docs/context-registry/dev-guides/coding-standards/design-principles.md`** — see "Security Hygiene".

## Review Checklist

Evaluate the code against each of the following. For each issue found, record the file, line reference, severity, and a concrete recommendation.

### Access Control

- [ ] ACLs enforced server-side — no reliance on client-side checks to protect data or routes
- [ ] Least privilege applied — access granted only to what is needed
- [ ] Authentication state verified before any protected operation

### Input Handling

- [ ] All inputs validated and sanitised at system boundaries using Zod (or equivalent)
- [ ] No raw user input passed to queries, file paths, or shell commands
- [ ] File uploads (if any) validated for type, size, and content

### Output & Encoding

- [ ] All output encoded appropriately to prevent XSS
- [ ] Error responses do not leak internal details, stack traces, or system paths
- [ ] Sensitive data (tokens, PII) not logged or included in error payloads

### Secrets & Configuration

- [ ] No secrets, API keys, or credentials hardcoded in source code or config files
- [ ] No sensitive values present in client bundles
- [ ] Environment variables used for all external credentials

### Data in Transit & At Rest

- [ ] HTTPS enforced for all external calls — no plain HTTP
- [ ] Sensitive data encrypted at rest where required by NFRs
- [ ] No sensitive data stored in localStorage, sessionStorage, or cookies without appropriate flags

### Session Management

- [ ] Logout destroys the session fully — no residual tokens or state
- [ ] Session tokens not exposed in URLs or logs

### Dependency & Supply Chain

- [ ] No new dependencies introduced without discussion
- [ ] No use of deprecated or known-vulnerable library versions in the changed code

## Output Format

Produce a structured report with the following sections:

### Summary

One paragraph describing the overall security posture of the code reviewed.

### Issues Found

For each issue:

```
**[SEVERITY]** Short title
- File: path/to/file.ts (line N)
- Principle violated: <which checklist item>
- Detail: <what the problem is>
- Recommendation: <specific fix>
```

Severity levels: `CRITICAL` | `HIGH` | `MEDIUM` | `LOW` | `INFO`

### Passed Checks

List the checklist items that were reviewed and found to be compliant.

### Recommendations

Any broader observations or patterns to address beyond individual issues.
