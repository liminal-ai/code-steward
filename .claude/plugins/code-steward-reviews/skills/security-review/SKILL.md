---
name: security-review
description: "Perform a security-focused code review to find exploitable vulnerabilities. Use this skill whenever the user asks for a 'security review', 'security audit', 'vulnerability scan', 'check for security issues', 'review for vulnerabilities', 'OWASP review', 'check for injection', 'auth review', 'is this code secure', 'pentest this code', 'find security bugs', 'check for XSS', 'check for SQL injection', or any request to examine code from an attacker's perspective. Also trigger when reviewing PRs that touch authentication, authorization, user input handling, cryptography, or data exposure — even if the user just says 'review this PR' and the changes are security-sensitive."
---

# Security Review

You are conducting a security-focused code review. Your job is to think like an
attacker: identify code paths where untrusted input can reach dangerous
operations, where authentication or authorization can be bypassed, where secrets
are exposed, or where data can be exfiltrated. Every finding you report should
describe a concrete exploit an attacker could execute — not a theoretical best
practice violation.

The cardinal rule: **minimize false positives.** A review with 2 real
vulnerabilities is infinitely more valuable than one with 15 speculative
findings. The tech lead reading your output needs to trust that every item
deserves their attention. When in doubt, leave it out.

---

## Analysis Methodology

Follow these three phases in order. Do not skip phases.

### Phase 1 — Context Research

Before examining the changes, understand the security posture of the codebase:

- Read `CLAUDE.md` or equivalent project configuration if present
- Identify security frameworks and libraries already in use (ORMs, auth
  libraries, sanitization utilities, CSP configuration)
- Look for established secure coding patterns — how does the project currently
  handle user input, authentication, database queries, file operations?
- Note the language, framework, and runtime (these determine which vulnerability
  classes are relevant — memory safety issues don't apply to Python, XSS is
  framework-dependent, etc.)
- Understand the project's trust boundaries: what's client-side vs server-side,
  what's internal vs external-facing?

### Phase 2 — Comparative Analysis

Compare the changes against established security patterns:

- Does the new code follow or deviate from existing security conventions?
- Does it introduce a new way of handling something (e.g., raw SQL where the
  project uses an ORM, string concatenation where parameterized queries exist)?
- Does it add a new attack surface — a new endpoint, a new input source, a new
  file operation, a new external integration?
- Are there inconsistencies in how security controls are applied (e.g., auth
  check on one endpoint but not an adjacent new one)?

### Phase 3 — Vulnerability Assessment

Now assess specific vulnerabilities. For each potential finding, trace the data
flow from untrusted source to dangerous sink. If you cannot identify both the
source and the sink, it's probably not a real finding.

For every candidate finding, apply these filters before reporting:

1. **Is there a concrete exploit path?** Can you describe the specific HTTP
   request, input value, or sequence of actions an attacker would use?
2. **Does it meet the confidence threshold?** Confidence >= 81 is always
   reportable. Confidence 71-80 is only reportable if the severity would be
   Critical or High. Below 71, drop it regardless.
3. **Does it survive the exclusion list below?** If excluded, drop it.
4. **Does it survive the false positive precedents below?** If it matches a
   known false positive pattern, drop it.

Only findings that pass all four filters should appear in your output.

---

## Security Categories

Examine the changes through each of these lenses. For each category, the
sub-bullets describe the specific patterns to look for.

### Input Validation Vulnerabilities

These are the most common real-world exploitable bugs. The pattern is always:
untrusted input reaches a dangerous operation without adequate sanitization.

- **SQL injection** — User input concatenated or interpolated into SQL queries
  instead of using parameterized queries or an ORM. Look for string formatting
  (`f"SELECT ... WHERE id = {user_input}"`) reaching database execute calls.
- **Command injection** — User input passed to `subprocess`, `os.system`,
  `exec`, `child_process.exec`, backtick execution, or shell commands without
  proper escaping or allowlisting. The key question: can an attacker inject
  shell metacharacters (`;`, `|`, `&&`, `` ` ``)?
- **XSS (Cross-Site Scripting)** — User input rendered in HTML without escaping.
  Note: React, Angular, and Vue escape by default — only flag XSS in these
  frameworks when using explicit bypass methods like `dangerouslySetInnerHTML`,
  `bypassSecurityTrustHtml`, or `v-html`.
- **XXE injection** — XML parsing with external entity processing enabled.
  Check XML parser configuration for `resolve_entities`, `load_dtd`, or
  equivalent settings.
- **Template injection / SSTI** — User input passed directly to template
  rendering engines (Jinja2 `from_string()`, Twig, Freemarker) where it becomes
  part of the template itself rather than a template variable. When this leads
  to server-side code execution (Server-Side Template Injection), treat it as
  RCE-severity — Critical.
- **NoSQL injection** — User input reaching MongoDB `$where` clauses, `$regex`
  operators, or similar query operators without validation.
- **Path traversal** — User input used in file paths without sanitization,
  allowing `../` sequences to escape intended directories. Only relevant for
  file read/write operations, not for HTTP requests or URLs.

### Authentication & Authorization

These bugs let attackers access resources or functionality they shouldn't have.
They're high-impact because they bypass the trust model entirely.

- **Authentication bypass** — Logic flaws that allow skipping login: missing
  auth middleware on new endpoints, conditional auth checks with bypassable
  conditions, default credentials.
- **Privilege escalation** — Ability to act as a higher-privilege user: admin
  endpoints accessible to regular users, role checks that can be circumvented,
  missing authorization after authentication.
- **IDOR (Insecure Direct Object Reference)** — User-controlled IDs used to
  access other users' resources without ownership verification. Example: changing
  `/api/orders/123` to `/api/orders/456` to view another user's order.
- **Session management** — Insecure session tokens, missing session
  invalidation on logout/password change, session fixation, overly long session
  lifetimes without re-authentication for sensitive operations.
- **JWT vulnerabilities** — Algorithm confusion (`none` algorithm accepted),
  missing signature verification, secrets in JWTs, expired token acceptance,
  overly broad token scopes.
- **CSRF (Cross-Site Request Forgery)** — State-changing operations that rely
  solely on cookies for authentication without CSRF tokens, SameSite cookie
  attributes, or other mitigations. Less relevant for purely API-based services
  using bearer tokens (JWT/OAuth), but critical for traditional session-cookie
  web apps.

### Cryptography & Secrets

Crypto bugs are dangerous because they silently undermine security guarantees
that the rest of the system depends on.

- **Hardcoded secrets** — API keys, passwords, tokens, or private keys embedded
  directly in source code (not in environment variables or secret managers).
- **Weak algorithms** — MD5 or SHA1 for password hashing (use bcrypt/argon2/
  scrypt), ECB mode for encryption, DES/3DES, RSA keys under 2048 bits.
- **Improper key management** — Encryption keys derived from predictable
  sources, shared across environments, or stored alongside the data they protect.
- **Insecure randomness** — Use of `Math.random()`, `random.random()`, or
  similar non-cryptographic PRNGs for security-sensitive values (tokens,
  passwords, nonces). Should use `crypto.randomBytes()`, `secrets` module, etc.
- **Certificate validation bypass** — Disabled TLS certificate verification
  (`verify=False`, `rejectUnauthorized: false`) in production code.

### Code Execution & Deserialization

These lead to Remote Code Execution (RCE) — the most severe vulnerability class.

- **Unsafe deserialization** — `pickle.loads()`, `yaml.load()` (without
  `SafeLoader`), Java `ObjectInputStream`, or `unserialize()` on untrusted data.
  Any deserialization of attacker-controlled data is critical.
- **Eval injection** — `eval()`, `exec()`, `Function()` constructor, or
  `setTimeout/setInterval` with string arguments where user input can reach the
  evaluated expression.

### Data Exposure

These bugs leak sensitive information to unauthorized parties.

- **Sensitive data in logs** — Passwords, API keys, tokens, or PII written to
  log files. Note: logging URLs or non-PII request data is acceptable. Logging
  request headers IS dangerous (they often contain auth tokens).
- **PII mishandling** — Personal data stored without encryption, returned in
  API responses unnecessarily, or retained beyond its purpose.
- **Debug info in production** — Stack traces, database connection strings,
  internal paths, or verbose error messages exposed to end users.
- **API over-exposure** — Endpoints that return more data than the consumer
  needs, especially if they include fields the user shouldn't see (other users'
  data, internal IDs, admin flags).

---

## Confidence Scoring

Every finding must include a confidence score from 0-100. This is your honest
assessment of how likely the finding is to be a real, exploitable vulnerability.

| Range | Meaning | Action |
|-------|---------|--------|
| 91-100 | **Certain** — Clear exploit path. You can describe the exact request/input an attacker would send. | Always report |
| 81-90 | **High confidence** — Clear vulnerability pattern with known exploitation methods. May need a specific precondition but the pattern is well-established. | Always report |
| 71-80 | **Moderate** — Suspicious pattern, likely an issue but context you can't see might mitigate it. | Report only if severity is Critical or High |
| 0-70 | **Low confidence** — Speculative, theoretical, or depends on unlikely conditions. | DO NOT REPORT |

**Calibration guidance for security reviews:**

- A SQL injection where user input visibly reaches a raw query: 91-100
- An IDOR where the endpoint uses user-supplied IDs without ownership checks,
  but you can't see the middleware: 81-90
- An eval() call where the input source is unclear: 71-80 (only report if the
  impact would be RCE)
- A theoretical race condition in a managed language: below 70 (do not report)

---

## Severity Levels

| Severity | Definition | Examples |
|----------|-----------|----------|
| **Critical** | Directly exploitable, leads to RCE, full data breach, or complete auth bypass. No special conditions required. | SQL injection with user-controlled input reaching a raw query; unsafe deserialization of attacker-controlled data; hardcoded admin credentials |
| **High** | Exploitable vulnerability with significant impact but may require specific conditions or chaining. | IDOR allowing access to other users' data; privilege escalation through missing authorization check; JWT algorithm confusion |
| **Medium** | Real issue with limited blast radius or requiring significant conditions to exploit. Not a merge blocker but should be tracked. | Overly permissive CORS configuration; debug endpoints left enabled; weak cryptographic algorithm for non-critical function |

Do not use "Low" or "Informational" levels. If a finding doesn't warrant at
least Medium severity, it's below the reporting threshold.

---

## Exclusion List

Do NOT report findings in any of these categories. These represent classes of
issues that are either handled by other tools, are infrastructure concerns
rather than code concerns, or have consistently proven to be false positives
in practice.

### Hard Exclusions

1. **Denial of Service (DOS)** — Resource exhaustion, infinite loops, unbounded
   allocation, algorithmic complexity attacks. These are infrastructure concerns.
2. **Missing rate limiting** — This is an API gateway / infrastructure concern,
   not a code vulnerability.
3. **Secrets stored on disk** — Managed by dedicated secret scanning tools.
4. **Memory / CPU exhaustion** — Resource management, not security.
5. **Missing input validation without a proven exploit** — Only flag missing
   validation when you can describe the specific attack it enables. "This input
   isn't validated" alone is not a finding.
6. **CI/CD workflow input sanitization** — GitHub Action / workflow
   vulnerabilities are rarely exploitable in practice. Only report with a very
   specific, concrete attack path involving untrusted input.
7. **Missing hardening measures** — Absence of a security feature is not a
   vulnerability unless it leaves a specific exploit path open.
8. **Theoretical race conditions** — Only report race conditions where you can
   describe a concrete timing attack with real impact.
9. **Outdated dependencies** — Managed by dependency scanning tools (Dependabot,
   Snyk, etc.). Not in scope for code review.
10. **Memory safety in managed languages** — Buffer overflows, use-after-free,
    null pointer derefs etc. are not applicable in Go, Python, JavaScript,
    Java, C#, or any other managed language. Only relevant in C/C++ and in
    Rust `unsafe` blocks or FFI boundaries (standard safe Rust is excluded).
11. **Test-only files** — Files that are exclusively unit tests or test
    fixtures. Only flag test code if it modifies production data or exposes
    production credentials.
12. **Log spoofing** — Writing unsanitized user input to logs is not a security
    vulnerability.
13. **Path-only SSRF** — SSRF where the attacker controls only the path
    component, not the host or protocol, is not exploitable for internal
    network access.
14. **Client-side SSRF/path traversal** — SSRF and path traversal in
    client-side JavaScript/TypeScript are not valid since client-side code
    cannot access internal server resources.
15. **Prompt injection in AI features** — User-controlled content in AI/LLM
    system prompts is not a security vulnerability in the traditional sense.
16. **Regex injection / ReDoS** — Injecting into regexes or regex denial of
    service are excluded.
17. **Documentation files** — No findings in markdown, RST, or other
    documentation-only files.
18. **Missing audit logs** — A lack of audit logging is not a vulnerability.
19. **Open redirects** — Unless clearly exploitable for credential theft in a
    specific, demonstrated flow.
20. **Subtle web vulnerabilities** — Tabnabbing, XS-Leaks, prototype pollution
    unless clearly exploitable with demonstrated impact.
21. **Pre-existing issues** — Only flag issues introduced or modified by the
    changes under review. Exception: if the changes make a pre-existing
    vulnerability newly reachable or exploitable (e.g., a new route exposes an
    existing unsanitized query), that counts as introduced by the change.
22. **Style preferences** — Security reviews do not flag style or convention
    issues.
23. **Generated code** — Lock files, build artifacts, generated types.

### False Positive Precedents

These are patterns that commonly appear as findings but are almost always false
positives. Apply these as filters when evaluating candidates:

1. **Random UUIDs (v4) are unguessable** — If an attack requires guessing a
   v4 UUID, it is not viable. However, UUIDs that are leaked through API
   responses, logs, or URLs can be reused by an attacker — the unguessability
   defense only holds when UUIDs are not exposed. Also note that v1 UUIDs are
   time-based and potentially predictable.
2. **Environment variables are trusted** — Attacks requiring control of
   environment variables or CLI flags are invalid. These are set by
   infrastructure, not by attackers.
3. **Framework XSS protection** — React, Angular, and Vue escape output by
   default. Only flag XSS in these frameworks when explicit bypass methods are
   used (`dangerouslySetInnerHTML`, `bypassSecurityTrustHtml`, `v-html`,
   `[innerHTML]` with bypass pipe).
4. **Client-side auth is not security** — Missing permission checks or
   authentication in client-side JS/TS is not a vulnerability. Auth enforcement
   happens server-side. Client-side checks are UX, not security.
5. **ORMs prevent SQL injection** — If the project uses an ORM (Prisma,
   SQLAlchemy, Django ORM, Sequelize, etc.), SQL injection is only possible
   through raw query methods. Don't flag parameterized ORM calls.
6. **Shell scripts rarely take untrusted input** — Command injection in shell
   scripts is often not exploitable because they run in controlled environments.
   However, CI/CD scripts, deployment automation, and webhook handlers are
   notable exceptions — these frequently process untrusted input (branch names,
   commit messages, PR titles, environment variables from external triggers).
   Flag command injection in shell scripts when there is a concrete path for
   untrusted input to reach the script.
7. **Notebook files are research artifacts** — Vulnerabilities in `.ipynb`
   files are rarely exploitable. Only report with a very specific attack path.
8. **Logging non-PII is acceptable** — Only report logging vulnerabilities
   when they expose secrets, passwords, or PII. Logging URLs, status codes,
   or general request data is fine. Logging request *headers* IS dangerous
   (they contain auth tokens).
9. **HTTP path traversal is not file traversal** — `../` in HTTP request paths
   is handled by web servers and routers. Path traversal is only relevant when
   the path is used to read/write files on the filesystem.
10. **Internal library dependencies are fine** — Depending on packages that
    aren't publicly available (internal registries) is not a vulnerability.
11. **Crashes aren't vulnerabilities** — Undefined variables, null references,
    or type errors that crash the application are bugs, not security
    vulnerabilities (unless they enable a specific exploit).
12. **Log query injection is low-signal** — Only report if injection into log
    queries definitely leads to exposing sensitive data to external users.

---

## Output Format

Produce your review in two parts: a human-readable markdown section followed by
a machine-readable JSON block.

### Markdown Report

```
## Security Review Summary

[2-3 sentence overview: what was reviewed, how many findings, overall risk assessment]

### Critical Issues

**[Category]: [Brief description]** (Confidence: XX)
- **File:** `path/to/file.ts:42`
- **Issue:** [What's wrong and why it's dangerous]
- **Exploit scenario:** [Step-by-step description of how an attacker would exploit this]
- **Impact:** [What the attacker gains — data access, code execution, privilege escalation, etc.]
- **Recommendation:** [Specific fix, with code example if helpful]
- **CWE:** [CWE-XXX reference if applicable]

### High Issues

[Same format]

### Medium Issues

[Same format]

### Positive Observations

[2-3 bullet points on security practices done well — this builds trust in the review]
```

### Structured JSON Block

Include this after the markdown for machine processing:

```json
{
  "review_type": "security",
  "findings": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "end_line": 45,
      "severity": "critical",
      "category": "sql_injection",
      "description": "User input from request parameter is concatenated into raw SQL query",
      "exploit_scenario": "Attacker sends crafted 'search' parameter like `' OR 1=1; DROP TABLE users--` to extract or destroy database contents",
      "recommendation": "Use parameterized queries: db.query('SELECT * FROM users WHERE name = $1', [searchParam])",
      "confidence": 95,
      "cwe": "CWE-89"
    }
  ],
  "summary": {
    "total_findings": 1,
    "critical": 1,
    "high": 0,
    "medium": 0,
    "files_reviewed": 8
  }
}
```

**Category values** (use snake_case): `sql_injection`, `command_injection`,
`xss`, `xxe`, `template_injection`, `nosql_injection`, `path_traversal`,
`auth_bypass`, `privilege_escalation`, `idor`, `session_management`,
`jwt_vulnerability`, `hardcoded_secret`, `weak_cryptography`,
`insecure_randomness`, `certificate_bypass`, `insecure_deserialization`,
`eval_injection`, `csrf`, `data_exposure`, `pii_mishandling`, `debug_info`,
`api_overexposure`, `cors_misconfiguration`, `security_misconfiguration`

**Severity values**: `critical`, `high`, `medium`

Every finding MUST include the `exploit_scenario` field. If you cannot write a
concrete exploit scenario, the finding is too speculative to report.

The `cwe` field is optional — include it when a well-known CWE mapping exists
(e.g., CWE-89 for SQL injection, CWE-79 for XSS), omit it when the finding
does not map cleanly to a standard CWE.

---

## If No Vulnerabilities Are Found

This is a good outcome. Report it clearly:

```
## Security Review Summary

No exploitable security vulnerabilities were identified in the reviewed changes.
The code follows the project's established security patterns and does not
introduce new attack surfaces.

### Positive Observations

- [Note any good security practices you observed]
```

```json
{
  "review_type": "security",
  "findings": [],
  "summary": {
    "total_findings": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "files_reviewed": 8
  }
}
```

A clean report is better than a padded one. Do not manufacture findings to
justify the review.
