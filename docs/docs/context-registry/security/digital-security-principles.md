---
sidebar_position: 2
---

# Digital Security Principles

Core security principles and practices that must be followed to protect applications, data, and users from common security vulnerabilities and attacks.

---

## Apply ACLs Server-Side

:::info[OWASP Category]
A01:2021 — Broken Access Control
:::

**Purpose**: To prevent unauthorized access by ensuring access controls are enforced on the server side.

Access controls must be enforced on the server side. Client-side checks are for user experience only and can be bypassed.

---

## Secure ACLs

:::info[OWASP Category]
A01:2021 — Broken Access Control
:::

**Purpose**: To prevent unauthorized access.

Verify that clients can only access secured URLs/functions/files or services for which they possess specific authorisation, and verify directory browsing is disabled unless deliberately desired. Clients should only be given the smallest set of roles required to function (principle of least privilege).

---

## Validate Forwards and Redirects

:::info[OWASP Category]
A01:2021 — Broken Access Control
:::

**Purpose**: To prevent phishing attacks.

Verify that URL redirects and forwards do not include unvalidated data ([OWASP: Unvalidated Redirects and Forwards Cheat Sheet](https://www.owasp.org/index.php/Unvalidated_Redirects_and_Forwards_Cheat_Sheet)).

- Avoid redirects/forwards altogether if possible
- If you need to use them, have a list of trusted URLs and sanitize incoming data according to that list
- Consider letting users know that a redirect is happening

---

## Use CSRF Tokens

:::info[OWASP Category]
A01:2021 — Broken Access Control
:::

**Purpose**: To prevent cross-site-request forgery attacks ([Cross Site Request Forgery (CSRF)](https://www.owasp.org/index.php/Cross-Site_Request_Forgery_%28CSRF%29)).

Verify that the application or framework generates strong random anti-CSRF tokens unique to the user, and that the application verifies the presence of this token with the proper value for the current user when processing these requests. Also ensure anti-CSRF tokens are used for all requests that:

- Change the state of data on the server side
- Are part of high value transactions
- Access sensitive data

---

## Protect Data In-Transit / At Rest

:::info[OWASP Category]
A02:2021 — Cryptographic Failures
:::

**Purpose**: To prevent unauthorized access to sensitive data.

Sensitive data (e.g. encryption keys, tokens, client secrets, passwords and any PII):

- Should always be encrypted at rest using strong, current algorithms (AES-256 for symmetric, RSA-2048+ or ECC for asymmetric). Avoid deprecated ciphers such as DES, 3DES, RC4, or MD5 for any cryptographic purpose
- Does not traverse unencrypted links (use TLS 1.2 or higher; disable TLS 1.0/1.1 and SSLv3)
- Is not logged
- Encryption keys must be rotated on a defined schedule and stored separately from the data they protect (e.g. in a key vault or HSM)
- Avoid hard-coding secrets or keys in source code — use environment variables or secret management services

---

## Validate Input

:::info[OWASP Category]
A03:2021 — Injection
:::

**Purpose**: To reduce the chance of a successful injection or DoS attack.

Verify all user supplied input is validated, all input validation failures result in input rejection and that all input validation or encoding routines are performed and enforced on the server side.

**Important**: Client side validation is for user assistance only, not security.

---

## Encode Output

:::info[OWASP Category]
A03:2021 — Injection
:::

**Purpose**: To prevent many types of XSS (Cross-Site Scripting) attacks.

Verify that all untrusted data output to HTML (including HTML elements, HTML attributes, JavaScript data values, CSS blocks, and URI attributes) is properly escaped for the applicable context.

---

## Apply Secure Design Principles

:::info[OWASP Category]
A04:2021 — Insecure Design
:::

**Purpose**: To ensure security is considered from the design phase, not bolted on after implementation.

Security must be embedded into the design process, not treated as an afterthought. Verify the following practices are in place:

- Perform threat modelling for new features and significant changes — identify assets, trust boundaries, and potential attack vectors before writing code
- Document abuse cases alongside use cases (e.g. "what happens if a user attempts to access another user's booking?")
- Apply secure design patterns: fail securely (deny by default), defence in depth (multiple layers of controls), and separation of privilege
- Review designs for business logic flaws that input validation alone cannot catch (e.g. price manipulation, race conditions in booking flows)
- Use established, well-tested security libraries and frameworks rather than implementing custom cryptography or authentication

---

## Set HttpOnly and Secure on Cookies Where Possible

:::info[OWASP Category]
A05:2021 — Security Misconfiguration
:::

**Purpose**: To prevent stealing of cookies which might contain session ids or to prevent cookies being sent to any server ([OWASP: Testing for cookies attributes](https://www.owasp.org/index.php/Testing_for_cookies_attributes_%28OTG-SESS-002%29)).

Verify the following:

- Ensure all cookies that are not read by your client side scripts have the `HttpOnly` cookie attribute set. The `HttpOnly` attribute means that a cookie can not be read by a potentially malicious client side script
- If a cookie is intended for transmission over HTTPS only, verify that the `secure` cookie attribute is set. The `Secure` attribute means that the cookie will only be sent over a HTTPS connection, never HTTP. As you should be using HTTPS, secure needs to be set on all cookies
- In particular ensure that session cookies are protected with both the `Secure` attribute and the `HttpOnly` attribute. They should also have the `expires` attribute set to a date in the past
- Ensure cookie `domain` and `path` attributes have been set and not too loosely
- Also verify that cookies don't contain any sensitive data/PII

### Implementation Note

As part of WEB-15923: Update first party Cookies to properly set the SameSite and Secure attributes, we have modified some cookies we set and manage to have the "secure" attribute set and to have the samesite property marked as "lax" - these changes have been reflected on the confluence page listing various cookies and their attributes - WEB-11971 - COOKIES - PART 1 - Get a list of cookies and sizes. This has been done largely by modifying any JS that interacts with the cookies and by using IIS Rewrite Rules to set these properties on the cookies (as otherwise, to set the samesite property server side we would have had to perform a .NET version upgrade which we wanted to avoid).

---

## Use HSTS

:::info[OWASP Category]
A05:2021 — Security Misconfiguration
:::

**Purpose**: To prevent the connection from being downgraded from HTTPS to HTTP.

Verify that strict transport security headers ([HTTP Strict Transport Security](http://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security)) should be present.

---

## Disable Browser Side Cache for Sensitive Data Input

:::info[OWASP Category]
A05:2021 — Security Misconfiguration
:::

**Purpose**: To prevent stealing of sensitive data from the client side browser cache ([OWASP Application Security FAQ](https://www.owasp.org/index.php/OWASP_Application_Security_FAQ#How_can_the_browser_cache_be_used_in_attacks.3F)).

Verify that:

- Forms with sensitive data, such as credit card credentials or PII, should disable autocompletion. This can be done with the attribute `autocomplete=off`
- Pages and forms containing sensitive data should have client side caching disabled. For this the headers `Cache-Control: no-cache, no-store` and `Expires: 0`, as well as `Pragma: no-cache` should be used

---

## Configure CORS

:::info[OWASP Category]
A05:2021 — Security Misconfiguration
:::

**Purpose**: To prevent data leakage when using Cross Origin Resource Sharing (CORS) ([Cross-domain requests with CORS](http://www.staticapps.org/articles/cross-domain-requests-with-cors)).

Verify that:

- Whenever possible a whitelist approach for the `Access-Control-Allow-Origin` header should be used. The list of allowed origins should be as restrictive as possible
- Verify that URLs which respond with `Access-Control-Allow-Origin: *` do not include sensitive data. Use `*` only when absolutely necessary
- Remember that the `Origin` header is supplied by the client and may therefore be spoofed, so do not rely on it
- Keep in mind that as you are using CORS, all services that you call from the client side will also need to be exposed over the Internet, which leads to a bigger attack surface

---

## Prevent Click-Jacking

:::info[OWASP Category]
A05:2021 — Security Misconfiguration
:::

**Purpose**: To prevent clickjacking attacks and ensure your site is not embedded into other sites ([Clickjacking Defense Cheat Sheet](https://www.owasp.org/index.php/Clickjacking_Defense_Cheat_Sheet)).

Ensure that the HTTP header `X-Frame-Options: DENY` is used.

---

## Manage Dependencies and Outdated Components

:::info[OWASP Category]
A06:2021 — Vulnerable and Outdated Components
:::

**Purpose**: To prevent exploitation of known vulnerabilities in third-party libraries and frameworks.

Applications rely on numerous third-party packages. Any one of these may contain known vulnerabilities that attackers can exploit. Verify the following:

- Maintain a complete inventory of all direct and transitive dependencies (lockfiles must be committed and reviewed)
- Run automated vulnerability scanning (e.g. `pnpm audit`, Snyk, Dependabot) on every CI build and fail the pipeline on critical/high severity CVEs
- Establish a policy for patching: critical vulnerabilities must be addressed within 48 hours; high within one sprint
- Remove unused dependencies — every package in `node_modules` is attack surface
- Pin dependency versions and review changelogs before upgrading
- Subscribe to security advisories for key dependencies (e.g. Next.js, React, Node.js)

---

## Verify Logout Functionality

:::info[OWASP Category]
A07:2021 — Identification and Authentication Failures
:::

**Purpose**: To prevent escalation of privileges and session fixation.

Verify that all pages that require authentication also have a logout link, and that sessions are invalidated when the user logs out.

Additionally:

- Enforce multi-factor authentication (MFA) for high-privilege accounts and sensitive operations
- Implement protections against credential stuffing — rate limiting, account lockout policies, and CAPTCHA after repeated failures
- Passwords must meet minimum complexity requirements and be checked against known-breached password lists (e.g. Have I Been Pwned)
- Store passwords using strong adaptive hashing algorithms (bcrypt, scrypt, or Argon2) — never use plain MD5 or SHA-1 for password storage

---

## Use Standard Session Management

:::info[OWASP Category]
A07:2021 — Identification and Authentication Failures
:::

**Purpose**: To prevent session hijacking.

- All sessions should timeout after a specified period of inactivity
- Verify that the session id is never disclosed other than in cookie headers; particularly in URLs, error messages, or logs
- This includes verifying that the application does not support URL rewriting of session cookies. URL rewriting means that the session ID is included in the URL

---

## Do Not Echo Passwords

:::info[OWASP Category]
A07:2021 — Identification and Authentication Failures
:::

**Purpose**: To prevent password theft.

Verify all password fields do not echo the user's password when it is entered.

---

## Ensure Software and Data Integrity

:::info[OWASP Category]
A08:2021 — Software and Data Integrity Failures
:::

**Purpose**: To prevent tampering with code, dependencies, or data during build, deployment, and runtime.

Attacks on software supply chains and data pipelines can introduce malicious code without modifying our source. Verify the following:

- Use lockfiles (`pnpm-lock.yaml`) and verify dependency integrity via checksums on every install
- Only pull packages from trusted registries; configure scoped registries for internal packages
- Protect CI/CD pipelines — restrict who can modify build configurations, require code review for pipeline changes, and sign build artefacts where possible
- Avoid unsafe deserialization of untrusted data. If deserializing is necessary, validate the structure and type of incoming data before processing (e.g. using Zod schemas)
- Use Subresource Integrity (SRI) hashes for any externally hosted scripts or stylesheets
- Verify that auto-update mechanisms (if used) validate signatures before applying updates

---

## Implement Security Logging and Monitoring

:::info[OWASP Category]
A09:2021 — Security Logging and Monitoring Failures
:::

**Purpose**: To detect, alert on, and respond to security incidents in a timely manner.

Without adequate logging and monitoring, breaches go undetected and incident response is delayed. Verify the following:

- Log all authentication events (login successes and failures, password resets, MFA challenges)
- Log all access control failures (e.g. denied requests, privilege escalation attempts)
- Log all input validation failures that may indicate an injection or fuzzing attack
- Ensure logs include sufficient context: timestamp, user identity, IP address, action attempted, and outcome — but never include sensitive data such as passwords, tokens, or full card numbers
- Store logs in a tamper-resistant, centralised logging system (e.g. Splunk, Datadog, Cloudwatch) separate from the application servers
- Configure real-time alerting for suspicious patterns: multiple failed logins, unusual geographic access, spikes in 4xx/5xx responses
- Establish and test an incident response plan — ensure the team knows how to triage alerts and escalate
- Retain logs for an appropriate period as required by compliance and operational needs

---

## Prevent Server-Side Request Forgery (SSRF)

:::info[OWASP Category]
A10:2021 — Server-Side Request Forgery
:::

**Purpose**: To prevent attackers from abusing server-side functionality to make requests to unintended destinations.

SSRF vulnerabilities allow an attacker to force the server to make HTTP requests to arbitrary internal or external resources, potentially accessing internal services, metadata endpoints, or sensitive data. Verify the following:

- Never pass raw user-supplied URLs directly to server-side HTTP clients (e.g. `fetch`, `axios`, `http.get`)
- Maintain an allowlist of permitted remote hosts/URLs that the server may contact. Deny all others by default
- Block requests to internal/private IP ranges (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.169.254) from server-side HTTP calls
- Validate and sanitize any URL parameters — reject schemes other than `https://` (and `http://` only where explicitly required)
- If the application must fetch user-supplied URLs (e.g. webhook callbacks), isolate that functionality in a sandboxed service with restricted network access
- Monitor and alert on unexpected outbound network connections from application servers
