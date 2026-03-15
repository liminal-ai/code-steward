---
name: silent-failure-review
description: >-
  Perform an exhaustive silent failure audit — systematically trace every error
  handling path to ensure nothing fails silently. Use this skill whenever the
  user asks to "check for silent failures", "review error handling", "are errors
  being swallowed", "error handling audit", "check for empty catch blocks",
  "review error messages", "catch block review", "are failures visible", "error
  propagation review", "check error logging", "find swallowed errors", "audit
  catch blocks", "review fallback behavior", or any request to verify that
  errors are properly surfaced, logged, and actionable. Also trigger when
  reviewing code that contains significant error handling logic (try-catch
  blocks, error callbacks, fallback patterns, retry mechanisms) even if the user
  only says "review this" — silent failure analysis is warranted anytime error
  handling is a meaningful part of the changes.
---

# Silent Failure Review

You are performing a silent failure audit — the most exhaustive error handling
review in the toolkit. Your job is to answer the question: **"When something
goes wrong in this code, does anyone know about it?"**

This is not a sampling exercise. You will locate *every* error handling
mechanism in the changed code and evaluate each one individually. A single
swallowed error can mean hours of debugging for a developer staring at a blank
screen with no logs, or a user silently receiving wrong data with no indication
that anything failed. That's the outcome you're here to prevent.

The distinction between this review and the Standard Review's error handling
check: Standard Review asks "does this code handle errors?" You trace every
error handler and ask "what happens when *this specific error* occurs? Does the
user know? Can a developer debug it? Or does it disappear into the void?"

---

## Analysis Methodology

Follow these three phases in order. Each phase builds on the previous one.

### Phase 1 — Context Research

Before judging any error handler, understand how this project handles errors:

1. **Read project conventions.** Check `CLAUDE.md` or equivalent for documented
   error handling patterns. Some projects have specific logging functions,
   error ID systems, or error boundary conventions. These are the standard you
   evaluate against — not your own preferences.

2. **Identify the error handling infrastructure.** Look for:
   - Logging libraries and their severity levels (e.g., `logError` vs `logWarning`
     vs `console.error`)
   - Error tracking systems (Sentry, DataDog, etc.) and how they're integrated
   - Error boundary patterns (React error boundaries, Express error middleware,
     global exception handlers)
   - Custom error classes or error code systems
   - User-facing error display patterns (toast notifications, error pages, status
     codes)

3. **Map the error propagation architecture.** Understand where errors are
   expected to be caught. Some projects have a top-level handler that catches
   everything — in that context, a lower-level catch-and-rethrow is correct
   behavior. Without this understanding, you'll misdiagnose intentional
   propagation as swallowed errors.

### Phase 2 — Comparative Analysis

With the project's error handling patterns understood, compare the changes:

- Does the new code follow the project's established error handling conventions,
  or does it introduce a different approach?
- If the project uses structured logging with error IDs, does the new code use
  them too?
- Are there similar operations elsewhere in the codebase that handle errors
  differently (better or worse) than this code?
- Does the change introduce new failure modes that the existing error handling
  infrastructure doesn't cover?

### Phase 3 — Exhaustive Error Handler Audit

This is the core of the review. Follow these five steps systematically.

---

## Step 1: Identify All Error Handling Code

Scan the changed code and locate every error handling mechanism. Be thorough —
the value of this review depends on completeness:

- **try-catch blocks** (or language equivalents: try-except, `Result` types,
  `if err != nil`, etc.)
- **Error callbacks and error event handlers** (`.catch()`, `on('error')`,
  error-first callbacks)
- **Conditional branches handling error states** (`if (response.status >= 400)`,
  `if (!result.ok)`, `if (error)`)
- **Fallback logic and default values used on failure** — anywhere a default
  value substitutes for a failed operation
- **Catch-and-continue patterns** — errors logged but execution continues as if
  nothing happened
- **Optional chaining (`?.`) and null coalescing (`??`)** that might mask
  operation failures
- **Promise `.catch()` handlers** and potential unhandled rejection paths
- **Async operations without error handlers** — promises or async calls that
  have no `.catch()` or surrounding `try-catch`
- **Event listeners** that could throw without a surrounding handler

Create a mental inventory. Every item in this list gets evaluated in Step 2.

## Step 2: Scrutinize Each Error Handler

For *every* error handling location found in Step 1, evaluate it across the
applicable dimensions below. Each dimension is a lens — a handler might score
well on one and fail on another.

Not all five dimensions apply to every mechanism. For instance, "Catch Block
Specificity" doesn't apply to optional chaining or unhandled async calls, and
"User Feedback" may not apply to internal library code with no end user.
Evaluate only the dimensions that are relevant to the specific mechanism —
skip dimensions that don't apply rather than forcing an assessment.

### Logging Quality

- Is the error logged at all? An unlogged error is a strong signal — but
  check Phase 1 context first. Some projects use typed result flows (e.g.,
  `Result<T, E>`) or expected domain errors (validation failures, "not found"
  responses) where logging every occurrence would be noise. The question is
  whether this specific unlogged error could silently mask a real problem.
- Is the severity level appropriate? (`error` for things that indicate a real
  problem, `warn` for recoverable situations, not `info` or `debug` for actual
  errors.)
- Does the log include enough context to debug the issue without reproducing it?
  At minimum: what operation failed, relevant identifiers (user ID, request ID,
  resource name), and the error itself.
- Would this log help a developer debug the issue months from now, without the
  original author available to explain? This is the bar.
- Is the actual error object logged, or just a string message? Logging
  `catch (e) { log("failed") }` instead of `catch (e) { log("failed", e) }`
  discards the stack trace.

### User Feedback

Not all code has an end user. For libraries, the "user" is the calling code —
evaluate whether errors are communicated to the caller via return values,
exceptions, or error callbacks. For background services, the "user" is the
operations team — evaluate whether errors surface through monitoring, alerts,
or dashboards. Adapt this dimension to the code's actual audience.

- Does the user (or caller, or operator) receive any feedback that something
  went wrong? Or does the operation silently return nothing / show a blank
  state?
- Is the feedback specific enough to be useful? "Something went wrong" is
  barely better than nothing. "Could not load your recent orders — please try
  again or contact support if this persists" is actionable.
- Does the message explain what the user can do? Even if the answer is "try
  again later" or "contact support", that's better than nothing.
- Are technical details appropriately handled? End users shouldn't see stack
  traces; developers using a CLI tool probably should.

### Catch Block Specificity

- Does the catch block catch everything, or only the expected error types?
- A broad `catch (error)` on a block containing multiple operations will catch
  the expected failure *and* every unexpected failure — type errors,
  reference errors, assertion failures, out-of-memory errors. These unrelated
  errors get the same handling as the expected one, which usually means they're
  silenced.
- Identify the specific unexpected errors that could be hidden. For example: a
  try block that does a network request and then parses the result — a broad
  catch will handle both network errors AND parse errors identically, masking
  bugs in the parsing logic.
- Could this catch block be split into separate handlers for different error
  types?

### Fallback Behavior

- Is fallback logic present? If so, is it explicitly justified (documented,
  commented, or following a project convention)?
- Does the fallback mask the underlying problem? If a database query fails and
  the code silently returns an empty array, the user sees "no results" when
  they should see "could not connect to database." The user might waste time
  thinking their search query was wrong.
- Would the user be confused about why they're seeing fallback behavior instead
  of the real thing? If so, the fallback needs to be visible.
- Is the code falling back to a mock, stub, or hardcoded value outside of test
  code? This almost always indicates an architectural problem.

### Error Propagation

- Should this error bubble up to a caller rather than being caught here? Some
  errors are local concerns (retry a network request); others are caller
  concerns (the database is unreachable — the whole operation should fail).
- Is the error being swallowed when it should propagate? Catching an error and
  returning a default value prevents callers from knowing the operation failed.
- Does catching here prevent proper cleanup? If a higher-level handler would
  release resources or roll back a transaction, catching too early bypasses
  that.

## Step 3: Examine Error Messages

For every user-facing error message in the changed code:

- Is it written in clear language appropriate to the audience?
- Does it provide actionable next steps?
- Is it specific enough to distinguish from similar errors? ("File not found:
  config.yaml" vs "An error occurred")
- Does it include relevant context (operation names, file paths, resource
  identifiers)?
- Does it avoid leaking sensitive internals to end users?

## Step 4: Check for Hidden Failure Patterns

Actively search for these patterns — they are the most common sources of
silent failures. This checklist is one of the most valuable parts of this
review. Go through each item deliberately:

- **Empty catch blocks** — A catch block with no body is never acceptable. If
  an error is intentionally ignored, the catch block should contain a comment
  explaining why and ideally a debug-level log. (See the "Intentionally ignored
  specific errors" exclusion — a documented, type-checked ignore with a comment
  is acceptable; a bare empty catch is not.)
- **Catch blocks that only log and continue** — Logging is not handling. If the
  operation failed, something downstream depends on its result. What happens to
  that dependent code when it receives undefined/null instead of real data?
- **Returning null/undefined/default values on error without logging** — The
  caller has no way to distinguish "the operation returned no results" from
  "the operation failed."
- **Optional chaining (`?.`) silently skipping operations** — `user?.settings?.save()`
  will silently skip the save if `settings` is undefined. If `settings` should
  exist, this hides a bug.
- **Fallback chains without visibility** — Code that tries approach A, then B,
  then C, without explaining why each failed. The user gets a result but has no
  idea it came from the third fallback, not the primary source.
- **Retry logic that exhausts attempts silently** — Retrying 3 times and then
  returning null. The user sees nothing; the developer sees nothing in logs.
- **Async operations with no error handler** — An unhandled promise rejection
  is a silent failure. In modern Node.js it crashes the process; in browsers it
  logs to console but the user sees nothing.
- **Event listeners that swallow errors** — An `on('error')` handler that does
  nothing, or event handlers inside try-catch blocks that catch and discard.
- **HTTP endpoints returning success status on failure** — An API endpoint that
  catches an internal error and returns `200 OK` with an empty body or default
  data instead of a proper error status code.
- **Boolean return values hiding failure details** — A function that returns
  `false` on failure instead of throwing or returning an error object. The
  caller knows it failed but not why.

## Step 5: Validate Against Project Standards

This step formalizes what you discovered in Phase 1 and Phase 2. Take the
project's error handling conventions and check whether the changed code
complies. Specifically:

- If the project uses specific logging functions or error ID systems (found in
  Phase 1), does the new code use them consistently?
- If the project has established error propagation patterns (found in Phase 2),
  does the new code follow them?
- Are there any deviations from explicit project conventions that should become
  findings? Deviations from documented standards are higher severity than
  deviations from general best practices.

If the project has no documented error handling conventions, evaluate against
language and framework best practices, but note in your findings that the
project would benefit from establishing explicit error handling standards.

---

## Confidence Scoring

Every finding gets a confidence score from 0 to 100.

| Range | Meaning | Action |
|-------|---------|--------|
| 91-100 | Certain — clear silent failure with obvious impact | Always report |
| 81-90 | High confidence — strong evidence of a swallowed or poorly handled error | Always report |
| 71-80 | Moderate — the handler looks suspicious but project context might justify it | Report only if severity is Critical |
| 0-70 | Low — speculative or depends on unknown context | DO NOT report |

The reporting threshold is **80** for most findings. The one exception: a
finding in the 71-80 range may be reported if its severity is Critical — a
completely silenced error with data loss potential is worth flagging even at
moderate confidence, because the cost of missing it outweighs the risk of a
false positive.

### Calibration for Silent Failure Reviews

Error handling decisions are often intentional. Score your confidence that the
handler is actually problematic, not just unfamiliar:

- **Empty catch block around a database write**: 95+ (clearly critical — data
  could silently fail to persist)
- **Broad catch around a complex try block with multiple operation types**: 85-90
  (likely hiding unrelated errors, but the developer might be aware)
- **Catch that logs the error but returns null to the caller**: 82-87 (the
  error is recorded, but the caller can't distinguish "no data" from "failed
  to fetch data" — this is a real problem in code paths where callers make
  decisions based on the return value)
- **Optional chaining on a data access path**: 70-80 (depends on whether the
  field is genuinely optional — check the data model before scoring high)
- **Catch-log-continue in a background job with no user to notify**: below 70
  (if it logs at error level, this may be the correct pattern)
- **Fallback to default value for a configuration option**: below 70 (likely
  intentional if the default is documented)

Ask yourself: "If I showed this to the developer, would they say 'good catch,
that's a real problem' or 'no, that's intentional because...'?" If you think
there's a good chance of the latter, lower your confidence.

---

## Severity Levels

| Severity | In the context of silent failures | Examples |
|----------|----------------------------------|----------|
| **Critical** | An error is completely silenced — no log, no user feedback, no propagation. Data could be lost or corrupted without anyone knowing. | Empty catch block around a database write; API endpoint returning 200 OK when the underlying operation failed and data wasn't saved; async operation with no error handler that silently drops results |
| **High** | The error is partially handled but insufficiently — users receive unhelpful feedback, logging lacks context needed to debug, or a broad catch hides unrelated errors. | Generic "Something went wrong" message with no specifics or next steps; catch block around 50 lines of mixed operations catching all error types identically; fallback to empty data without logging why the primary source failed |
| **Medium** | The error is handled but could be improved — missing context in logs, error message could be more specific, or fallback behavior could be more transparent. | Error logged without relevant identifiers (user ID, request ID); error message that's accurate but doesn't suggest next steps; catch block that's broader than necessary but logs appropriately |

---

## What NOT to Flag

In addition to the universal exclusions (pre-existing issues, generated code,
documentation files, test files, style preferences, theoretical issues), do
not flag these patterns:

- **Catch-log-rethrow** — Catching an error, logging it with context, then
  rethrowing is a valid pattern for adding diagnostic information at each level.
  The error still propagates.
- **Legitimately optional data access** — Optional chaining on nullable database
  fields, optional API response fields, or user-configurable properties that
  have documented optional semantics. Only flag optional chaining when the
  data *should* exist and its absence indicates a bug.
- **Documented default configuration values** — If a config option has a
  documented default, falling back to it on missing/invalid input is correct
  behavior, not a silent failure.
- **Error handling in test utilities and test helpers** — Tests have different
  error handling requirements.
- **Top-level error boundaries** — React error boundaries, Express error
  middleware, and global exception handlers are *supposed* to catch broadly.
  They are the final safety net. Evaluate whether they log and display
  appropriately, but don't flag them for being broad.
- **Logging-only handlers in background operations** — Batch jobs, cron tasks,
  queue consumers, and other background processes with no interactive user may
  correctly handle errors by logging at error level and continuing to the next
  item. The requirements: they must log at error level (not warn or info), and
  the failed item must not be silently dropped — check whether the system has
  a mechanism to track or retry failed items (dead letter queue, failure count,
  alerting threshold). If an error is logged but the failed work item is
  permanently lost with no way to detect or recover it, that's still a silent
  failure worth flagging.
- **Framework-mandated error handling patterns** — `error.tsx` in Next.js,
  `ErrorBoundary` components, middleware error handlers. These follow framework
  conventions and are expected to be broad.
- **Intentionally ignored specific errors** — If a catch block explicitly
  checks the error type and ignores only a specific, documented case (e.g.,
  "file not found" when checking if an optional config file exists), this is
  acceptable when documented with a comment explaining why. A debug-level log
  is ideal but not required if the comment clearly explains the intent. The
  key distinction: the catch must be type-specific and documented — not a bare
  empty catch that silently swallows everything.

---

## Output Format

Produce your review in two parts: a human-readable markdown section followed
by a machine-readable JSON block.

### Markdown Report

```
## Silent Failure Review Summary

[2-3 sentence overview: how many error handlers were examined, how many
findings, and the most critical pattern observed. If no issues found, say so.]

### Critical Issues

**[Category]: [Brief description]** (Confidence: XX)
- **File:** `path/to/file.ts:42`
- **Issue:** [What's wrong — which error is being silenced and why that matters]
- **Hidden errors:** [List specific unexpected error types this handler could
  suppress — e.g., "TypeError from malformed response, RangeError from invalid
  index, plus any error thrown by parseConfig()"]
- **User impact:** [What the user experiences when this error occurs — blank
  screen? stale data? no feedback at all?]
- **Debugging impact:** [What a developer sees when trying to diagnose this —
  nothing in logs? misleading log? wrong severity?]
- **Recommendation:** [Specific fix with code example if helpful]

### High Issues

[Same format]

### Medium Issues

[Same format]

### Positive Observations

[2-3 bullet points on error handling done well — specific examples of good
logging, helpful error messages, or properly scoped catch blocks]
```

If a severity level has no findings, omit that section entirely.

### If No Issues Are Found

This is a valid outcome — well-written error handling exists. Report it:

```
## Silent Failure Review Summary

Examined [N] error handling locations across [N] files. No silent failure
patterns were identified — errors are properly logged, surfaced to users
where appropriate, and propagated through the call stack.

### Positive Observations

- [Specific examples of good error handling]
```

```json
{
  "review_type": "silent-failure",
  "findings": [],
  "summary": {
    "total_findings": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "error_handlers_examined": 12,
    "files_reviewed": 5
  }
}
```

### Structured JSON Block

Include this after the markdown for Code Steward's web UI and GitHub
integration:

```json
{
  "review_type": "silent-failure",
  "findings": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "end_line": 48,
      "severity": "critical",
      "category": "empty_catch",
      "description": "Empty catch block around database write — if the insert fails, no log is written and the caller receives undefined",
      "hidden_errors": "TypeError, ConnectionError, ValidationError, ConstraintViolation",
      "recommendation": "Log the error with operation context and either rethrow or return a typed error result",
      "confidence": 96
    }
  ],
  "summary": {
    "total_findings": 3,
    "critical": 1,
    "high": 1,
    "medium": 1,
    "error_handlers_examined": 12,
    "files_reviewed": 5
  }
}
```

The `hidden_errors` field is optional — include it for categories where a
handler could suppress unrelated errors (`empty_catch`, `broad_catch`,
`swallowed_error`). Omit it for categories like `generic_error_message` or
`missing_user_feedback` where hidden error types aren't relevant.

**Category values** for silent failure findings:
- `empty_catch` — Catch block with no body or only a comment
- `broad_catch` — Catch block that catches all error types across multiple
  operations, hiding unrelated errors
- `missing_log` — Error handled (caught, fallback used) but never logged
- `missing_user_feedback` — Error occurs but the user receives no indication
- `silent_fallback` — Fallback to default/empty data without logging or user
  notification
- `swallowed_error` — Error caught and not propagated when it should bubble up
- `unhandled_async` — Async operation with no error handler
- `hidden_by_optional_chain` — Optional chaining silently skipping an operation
  that should fail visibly
- `success_on_failure` — API/function returns success status when the underlying
  operation failed
- `generic_error_message` — Error message too vague to be actionable
- `exhausted_retry` — Retry logic that exhausts all attempts without logging
  or notifying the user of the final failure
- `boolean_failure` — Function returns boolean/null on failure, hiding the
  error details from the caller

---

## Review Scope

This skill works in two contexts:

**PR / diff review:** Examine error handling in the changed code. Trace error
propagation paths that cross file boundaries if the changed code introduces new
catch blocks, fallbacks, or error handlers. Do not audit error handling in
unchanged code.

**Ad-hoc codebase review:** When asked to review existing code, audit every
error handler in the specified files or modules. Apply the same methodology
but assess the code as a whole.

In both cases, start with Phase 1 context research before auditing handlers.

---

## Tone

Be uncompromising about silent failures but constructive in your feedback.
Every finding should explain *why* it matters — the debugging nightmare it
creates, the user confusion it causes, or the data integrity risk it
introduces. Phrases like "This catch block could hide...", "When this fails,
the user sees...", and "A developer debugging this will find..." help
communicate impact without being adversarial.

When error handling is done well, acknowledge it. Good error handling is
underappreciated work that makes the entire system more reliable and
debuggable. Calling it out encourages more of it.
