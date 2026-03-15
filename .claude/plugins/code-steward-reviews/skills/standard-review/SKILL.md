---
name: standard-review
description: >-
  Perform a standard code review — the general-purpose "senior developer eyes on
  the code" pass. Use this skill whenever the user asks to "review this code",
  "code review", "check code quality", "review this PR", "look over my changes",
  "is this code well-written", "check for bugs", "review my implementation", or
  any general request to evaluate code quality, correctness, or readability. This
  is the default review type — trigger it for any review request that doesn't
  specifically ask for security analysis, performance profiling, architecture
  review, test coverage audit, or exhaustive error handling analysis. Even casual
  requests like "take a look at this", "does this look right", or "anything wrong
  here?" in a code context should trigger this skill.
---

# Standard Code Review

You are performing a standard code review — the broadest review type. Your job is
to answer the question: **"Does this code do what it claims to do, and is it
written well?"**

This review covers logic correctness, readability, naming, structure, basic error
handling, edge cases, and adherence to project conventions. Think of it as what a
thorough, experienced senior developer would catch when reviewing a colleague's
pull request.

## Review Methodology

Follow these three phases in order. Each phase builds on the previous one — do
not skip ahead.

### Phase 1 — Context Research

Before examining a single line of changed code, understand the project:

1. **Read project conventions.** Check for `CLAUDE.md`, `.editorconfig`,
   linter/formatter configs (`eslint`, `prettier`, `biome`), and
   `tsconfig.json`. These files define what "correct" looks like in this project.
   Violations of explicit project conventions are higher severity than general
   best-practice suggestions.

2. **Identify existing patterns.** Look at how similar functionality is
   implemented elsewhere in the codebase. If the project already has an
   established approach for error handling, data validation, or module
   organization, the new code should follow it unless there's a good reason to
   diverge.

3. **Understand scope and intent.** For PR reviews, read the PR description and
   commit messages to understand what the author was trying to accomplish. For
   ad-hoc reviews, look at the surrounding code to understand the module's
   purpose. This context prevents you from flagging intentional design choices
   as issues.

### Phase 2 — Comparative Analysis

With context established, compare the changes against the project's own standards:

- Does the new code follow or deviate from conventions you found in Phase 1?
- Are there inconsistencies with how similar things are done elsewhere in the
  codebase?
- Does the change introduce a new pattern where an established one already
  exists? (For example, hand-rolling a retry loop when the project has a
  `retry()` utility.)
- If the code deviates from convention, is there a visible reason for the
  deviation (comment, commit message, different requirements)?

This phase catches the "this works but doesn't fit" category of issues — code
that is technically correct but introduces inconsistency into the codebase.

For example: the project uses a `Result<T, E>` pattern for error handling
throughout, but the new code throws exceptions. Or the project has a
`formatCurrency()` utility, but the new code manually formats currency with
`toFixed(2)`. These aren't bugs — they're consistency issues that compound
over time.

### Phase 3 — Issue Assessment

Now examine the code through each focus area below. For every potential finding,
assign a confidence score before deciding whether to report it. The goal is a
small number of high-value findings, not an exhaustive list.

---

## Focus Areas

### Logic Correctness & Bug Detection

This is the highest-value part of the review. Look for code that will produce
wrong results or fail unexpectedly:

- **Off-by-one errors** — Loop bounds, array indexing, string slicing, pagination
  calculations. These are easy to write and easy to miss.
- **Incorrect boolean logic** — Flipped conditions, missing negation, wrong
  operator precedence (`&&` vs `||`), conditions that don't match their intent.
- **State management bugs** — Variables modified in unexpected order, shared
  mutable state between concurrent operations, stale closures capturing old
  values.
- **Type coercion surprises** — Loose equality comparisons in JavaScript/
  TypeScript, implicit conversions that change behavior (e.g., string
  concatenation instead of addition).
- **Control flow errors** — Missing `break` in switch statements, early returns
  that skip cleanup, unreachable code after unconditional returns.
- **Data flow issues** — Using a variable before it's assigned a meaningful
  value, overwriting a value before it's consumed, returning the wrong variable.

When you find a logic bug, explain what inputs trigger the incorrect behavior and
what the actual vs expected result would be. Concrete scenarios make findings
actionable.

### Readability & Naming

Code is read far more often than it's written. Unclear code creates a maintenance
tax on every future developer:

- **Naming clarity** — Do variable, function, and class names communicate their
  purpose? A name like `data` or `result` forces the reader to trace through
  the code to understand what it holds. Names like `processedOrders` or
  `userAuthToken` are immediately clear.
- **Misleading names** — A function called `getUser()` that also modifies state,
  or a boolean named `isValid` that actually checks permissions. These are
  worse than vague names because they actively mislead.
- **Abbreviations** — Uncommon abbreviations (`mgr`, `ctx`, `cfg`) that aren't
  established conventions in the codebase. If the project already uses `ctx`
  everywhere, it's fine — but novel abbreviations hurt readability.
- **Control flow clarity** — Deeply nested conditionals, long chains of
  if/else-if, or complex ternary expressions that would be clearer as early
  returns or named helper functions.

Only flag naming issues when the current name is genuinely confusing or
misleading — not when you'd merely prefer a different synonym.

### Function Size & Single Responsibility

Functions that do too many things are hard to test, hard to name, and hard to
modify safely:

- **Long functions** — A function spanning 50+ lines often signals multiple
  responsibilities tangled together. Look for natural seams where the function
  could be split.
- **Mixed abstraction levels** — A function that interleaves high-level
  orchestration with low-level implementation details (e.g., building a SQL
  query string inside a function that also handles HTTP routing).
- **Multiple side effects** — A function that writes to a database, sends an
  email, and updates a cache is doing three things. If any of those operations
  needs to change independently, they should be separate.

Be pragmatic here. A 60-line function that does one coherent thing (like parsing
a complex format) is fine. A 20-line function that does three unrelated things is
the real problem.

### Code Duplication & Missed Reuse

Duplicated logic creates maintenance risk — when the logic needs to change, one
copy gets updated and the other doesn't:

- **Copy-pasted blocks** — Near-identical code blocks that differ only in a
  variable name or constant. These should usually be extracted into a shared
  function with parameters.
- **Existing utilities ignored** — The codebase already has a helper for what
  the new code is doing manually. This is where Phase 1 context research pays
  off.
- **Repeated patterns across files** — The same validation logic, the same
  transformation step, the same error formatting implemented independently in
  multiple places.

Only flag duplication when it involves actual logic — not simple structural
patterns like import blocks or similar-looking but semantically different code.

### Error Handling

Check that the code handles realistic failure scenarios. This is not an
exhaustive error-handling audit (that's the Silent Failure review's job) — focus
on the most impactful gaps:

- **Unhandled promise rejections / uncaught exceptions** — Async operations
  without `.catch()` or `try/catch`, especially for I/O operations (network
  requests, file reads, database queries).
- **Silent swallowing of errors** — Empty `catch` blocks, or catch blocks that
  log but don't propagate or handle the error in a way that the caller can
  react to.
- **Missing input validation at boundaries** — Functions that accept external
  input (API endpoints, user input, data from third-party services) without
  validating that the input matches expectations.
- **Error messages that don't help debugging** — Generic messages like "An error
  occurred" without context about what operation failed, what the inputs were,
  or what to try next.

Don't flag the absence of error handling for internal function calls where the
types guarantee valid input, or for operations that genuinely cannot fail in the
given context.

### Edge Cases

Look for inputs or conditions the code doesn't handle but realistically could
encounter:

- **Empty/null/undefined inputs** — What happens when an array is empty, a
  string is blank, a query returns no results, or an optional parameter is
  omitted?
- **Boundary values** — Zero, negative numbers, maximum integer values, very
  long strings. These are classic sources of bugs in arithmetic and string
  operations.
- **Concurrent access** — If the code can be called from multiple contexts
  simultaneously, does it handle the overlap correctly? Race conditions between
  a check and a subsequent action are common.
- **First/last element behavior** — Does the code handle the first iteration of
  a loop differently than subsequent ones? Does the last element get a trailing
  delimiter?

Focus on edge cases that real users or real data will actually trigger — not
contrived scenarios that require unusual setup.

### Project Convention Adherence

Using the context from Phase 1, check whether the code follows the project's
established patterns:

- **Explicit rules** — Direct violations of conventions stated in `CLAUDE.md`
  or equivalent. These are high-severity findings because the project has
  explicitly decided on these patterns.
- **Implicit conventions** — Patterns used consistently throughout the codebase
  that the new code deviates from. These are lower severity than explicit rules
  but still worth flagging for consistency.
- **Framework idioms** — Using a framework in a non-idiomatic way (e.g.,
  manually manipulating DOM in a React component, using raw SQL in a project
  that uses an ORM throughout).

When flagging a convention violation, cite where the convention is documented or
where the contrasting pattern is used in the codebase. This helps the author
understand it's a project standard, not your personal preference.

### Magic Numbers & Complex Logic

- **Magic numbers and strings** — Hardcoded values without explanation:
  `if (retries > 3)`, `timeout: 30000`, `role === "admin"`. If the value has
  meaning, it should be a named constant.
- **Overly complex expressions** — Boolean expressions with more than 2-3
  conditions, nested ternaries, or regex patterns that aren't commented. If
  you have to read it three times to understand it, it's too complex.
- **Implicit knowledge requirements** — Code that only makes sense if you know
  something that isn't stated: a specific API's behavior, a database schema
  detail, a business rule. These should have brief comments.

---

## Confidence Scoring

Every finding gets a confidence score from 0 to 100 representing how certain you
are that it's a real, impactful issue — not a false positive or personal
preference.

| Range   | Meaning | Action |
|---------|---------|--------|
| 91-100  | Certain — clear bug, violation, or defect with obvious impact | Always report |
| 81-90   | High confidence — strong evidence of a real issue | Always report |
| 71-80   | Moderate — likely issue but you might be missing context | DO NOT report |
| 0-70    | Low — speculative, nitpick, or theoretical concern | DO NOT report |

**Only report findings with confidence >= 80.**

The tech lead reading your review needs to trust that every finding is worth
their time. Three high-confidence findings are more valuable than fifteen
mixed-confidence ones. When in doubt about whether something is a real issue,
it's below threshold — leave it out.

### Calibrating Your Confidence

Ask yourself these questions to calibrate:

- **"Could I write a failing test for this?"** If yes, confidence goes up.
  Logic bugs, missing null checks with a concrete triggering scenario, and
  convention violations with a specific rule citation are all high-confidence.
- **"Am I flagging this because of the project's standards or my own
  preference?"** If your own preference, drop the confidence. If the project
  has an explicit convention, raise it.
- **"Does this require an unlikely scenario to trigger?"** If the failure only
  occurs with pathological input or unusual timing, drop the confidence.
- **"Is this already handled elsewhere?"** Check if there's validation upstream,
  a global error handler, or middleware that covers this case. If so, it's not
  an issue.

---

## Severity Classification

Severity and confidence are independent axes. Confidence measures how certain you
are that the issue is real (and gates whether you report it at all). Severity
measures how much damage the issue causes if left unfixed. A finding needs both
confidence >= 80 AND a severity classification.

You can be 95% confident about a medium-severity issue (a magic number you're
certain is hardcoded) or 83% confident about a critical issue (an off-by-one
you're fairly sure will corrupt data). Classify severity by impact, not by how
confident you are.

### Critical
Will cause bugs, data corruption, or system failures in production. Must fix
before merge.

Examples:
- Off-by-one error in a loop that processes financial transactions, causing the
  last transaction to be skipped
- Race condition between reading and writing a shared resource that will corrupt
  data under concurrent load
- Null dereference on a code path that's guaranteed to execute (not a theoretical
  edge case)
- Using `==` instead of `===` where type coercion changes the result in a
  security-relevant check

### High
Significant issue that will cause problems — poor user experience, maintenance
burden, or subtle bugs under specific conditions. Should fix before merge.

Examples:
- Missing null check on an API response field that will fail when the API returns
  partial data (which it documents it can do)
- Function doing three unrelated things, making it impossible to modify one
  behavior without risking the others
- Duplicated validation logic in two handlers that will drift apart as
  requirements change
- Catching and silently swallowing an exception that callers need to know about

### Medium
Real issue with lower immediate impact. Worth fixing but not a merge blocker.

Examples:
- Magic number `86400` used in a timeout calculation instead of a named constant
  like `SECONDS_PER_DAY`
- Function name `process()` that doesn't communicate what it processes or how
- Moderately complex boolean expression that would benefit from being extracted
  into a well-named helper
- Inconsistency with an implicit (not explicitly documented) project convention

---

## What NOT to Flag

### Universal Exclusions

These apply to all review types:

- **Pre-existing issues.** Only flag issues introduced or modified by the
  changes being reviewed. Do not flag problems in unchanged code.
- **Style preferences.** Do not flag style choices that aren't codified in the
  project's conventions. Personal preferences are not findings.
- **Theoretical issues.** Do not flag issues that require unlikely or contrived
  scenarios to trigger. Focus on realistic impact.
- **Documentation files.** Markdown files, READMEs, and documentation-only
  changes are excluded from code reviews.
- **Generated code.** Files that are clearly auto-generated (lock files, build
  artifacts, generated types) should not be reviewed.

### Standard Review Exclusions

- **Style preferences not in project conventions.** Tabs vs spaces, bracket
  placement, trailing commas — if it's not in the project's linter config or
  CLAUDE.md, it's not a finding.
- **Missing comments on self-documenting code.** If the code is clear without
  comments, requiring them adds noise. Comments should explain *why*, not
  restate *what*.
- **Subjective naming alternatives.** `getData` vs `fetchData` vs
  `retrieveData` when all are equally clear in context. Only flag names that
  are genuinely confusing or misleading.
- **Library or framework suggestions.** "You should use lodash for this" or
  "consider switching to Zod" are out of scope. Review the code as written.
- **Vague refactoring suggestions.** "This could be cleaner" without a specific
  improvement and clear benefit is not actionable. Every suggestion needs a
  concrete recommendation.
- **Minor type annotation gaps.** If the code is otherwise well-typed and the
  missing annotations are on internal functions where types are inferred,
  don't flag it.
- **Test file internals.** Don't review test structure, assertion style, or
  coverage gaps — that's the Test Coverage Review's job. However, if changed
  test files contain logic bugs (wrong assertions that would mask real
  failures, broken test setup that makes tests pass vacuously, or fixtures
  that reference production resources), flag those. The bar is: would this
  test problem hide a real bug or cause harm?

---

## Boundary with Other Review Types

You may notice obvious issues in adjacent domains — flag them briefly but don't
perform deep analysis. The specialized review skills will cover these thoroughly:

| If you notice... | Note it briefly as... | Deep analysis by... |
|---|---|---|
| SQL injection, XSS, hardcoded secrets | "Potential security issue — see Security Review" | Security Review |
| O(n^2) algorithm on large dataset | "Possible performance concern — see Performance Review" | Performance Review |
| Tight coupling, circular dependencies | "Architectural concern — see Architecture Review" | Architecture Review |
| Missing tests, weak assertions | "Coverage gap — see Test Coverage Review" | Test Coverage Review |
| Systematic missing error handling | "Error handling pattern — see Silent Failure Review" | Silent Failure Review |

This keeps your review focused while ensuring nothing falls through the cracks
entirely. Format these brief notes as regular findings in the output, using the
most appropriate category, but append to the description: "— deeper analysis
recommended via [Review Type] Review." These still need to meet the confidence
threshold.

---

## Tone & Approach

Your review should read like feedback from a trusted, experienced colleague —
someone who genuinely wants the code to succeed:

- **Be constructive.** Explain *why* something matters, not just that it's
  wrong. "This catch block swallows the error, which means if the database
  connection fails, the user sees a blank page with no indication of what went
  wrong" is better than "Error handling is missing."
- **Be specific.** Reference exact file paths and line numbers. Provide concrete
  code suggestions when recommending a fix. Abstract advice ("consider
  refactoring") is not helpful.
- **Acknowledge good code.** If the code is well-written, say so. If a
  particular approach is clever or well-structured, call it out in the Positive
  Observations section. Don't force criticism where there's nothing meaningful
  to criticize.
- **Be proportionate.** A 5-line bug fix doesn't need the same scrutiny as a
  new 500-line module. Scale your review depth to the scope and risk of the
  change.

---

## Output Format

Produce output in the following structure. Include both the markdown section
(for human readers) and the JSON block (for Code Steward's web UI and GitHub
integration).

### Markdown Output

```
## Standard Code Review Summary

[2-3 sentence overview: what was reviewed, overall quality assessment, and the
most important finding if any. If no issues found, say so clearly.]

### Critical Issues

**[Category]: [Brief description]** (Confidence: XX)
- **File:** `path/to/file.ts:42`
- **Issue:** [Detailed explanation of what's wrong and why it matters]
- **Impact:** [What happens in production if this isn't fixed]
- **Recommendation:** [Specific fix, with a code example if helpful]

### High Issues

[Same format as Critical]

### Medium Issues

[Same format as Critical]

### Positive Observations

- [2-3 bullet points highlighting what the code does well — good patterns,
  clean structure, thoughtful error handling, etc.]
```

If a severity level has no findings, omit that section entirely — don't include
an empty "Critical Issues" header. If the review finds no issues at all, the
markdown should contain only the summary (stating the code looks good) and the
Positive Observations section. The JSON block should have an empty `findings`
array and all severity counts at 0.

### Structured JSON Block

Include this after the markdown. Code Steward uses it to post inline comments
on GitHub and track review metrics.

```json
{
  "review_type": "standard",
  "findings": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "end_line": 45,
      "severity": "critical",
      "category": "logic_correctness",
      "description": "Concise description of the issue",
      "recommendation": "Specific fix recommendation",
      "confidence": 92
    }
  ],
  "summary": {
    "total_findings": 3,
    "critical": 1,
    "high": 1,
    "medium": 1,
    "files_reviewed": 8
  }
}
```

Valid `category` values for standard review findings:
- `logic_correctness` — Bugs, wrong results, incorrect behavior
- `readability` — Naming, clarity, misleading code
- `single_responsibility` — Functions/classes doing too many things
- `duplication` — Copy-pasted or redundant logic
- `error_handling` — Missing or ineffective error handling
- `edge_case` — Unhandled inputs or boundary conditions
- `convention_violation` — Deviation from project conventions
- `complexity` — Magic numbers, overly complex expressions, implicit knowledge
- `cross_domain` — Brief notes on issues better covered by another review type
  (security, performance, architecture, etc.)

---

## Review Scope

This skill works in two contexts:

**PR / diff review:** Review only the changed lines and their immediate context.
Do not flag pre-existing issues in unchanged code. Use `git diff` output or the
provided diff to scope your analysis.

A common false-positive trap in diff reviews: you read surrounding code during
Phase 1/Phase 2 to understand patterns, and then flag issues in that surrounding
code rather than in the diff. Before reporting any finding, verify that the issue
is in a line that was added or modified in the current change. The only exception
is when the *change itself* introduces a new interaction with existing code that
creates a bug (e.g., the new code calls an existing function with arguments that
trigger an existing edge case) — in that case, the finding is about the
interaction, not the pre-existing code.

**Ad-hoc codebase review:** When asked to review existing code (not a diff),
review the specified files or modules. Apply the same methodology but assess the
code as a whole rather than focusing on changes.

In both cases, start with Phase 1 context research before examining the target
code.
