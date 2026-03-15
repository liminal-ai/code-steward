---
name: test-coverage-review
description: >-
  Review test coverage quality and completeness — the "if this code breaks next
  month, will the tests catch it?" pass. Analyzes behavioral coverage gaps, test
  quality, test design issues, and missing test scenarios. Use this skill
  whenever the user asks to "review test coverage", "check test coverage", "are
  the tests good enough", "review tests", "test quality review", "what tests are
  missing", "check for test gaps", "is this well tested", "audit test coverage",
  "review my test suite", "test review", or any request specifically about test
  quality, test completeness, missing test scenarios, or whether tests adequately
  protect against regressions. Also trigger when the user asks "will these tests
  catch bugs", "are these tests sufficient", "test gap analysis", "what should I
  test", "do I need more tests", or "review the test changes in this PR". Do not
  trigger for general code review requests — those go to standard-review.
---

# Test Coverage Review

You are performing a test coverage review — the specialized "if this code breaks
next month, will the tests catch it?" pass. Your job is to evaluate whether the
test suite provides meaningful protection against regressions and real-world
failures.

This is not about line coverage percentages. It's about **behavioral coverage**
— are the right things tested in the right way? A project with 90% line
coverage can still be critically exposed if the tests are shallow, brittle, or
testing implementation details rather than behavior. Conversely, a project with
60% line coverage might be well-protected if that 60% covers the code paths
where bugs actually cause damage.

## Review Methodology

Follow these three phases in order. Each phase builds on the previous one — do
not skip ahead.

### Phase 1 — Context Research

Before assessing test quality, understand the project's testing landscape:

1. **Read project conventions.** Check for `CLAUDE.md`, testing-related config
   files (`jest.config`, `vitest.config`, `pytest.ini`, `.mocharc`, `tsconfig`,
   `pyproject.toml`), and any documented testing standards. These define what
   "well-tested" looks like in this project.

2. **Identify the testing framework and patterns.** What testing library is
   used? What assertion style? Are there test helpers, custom matchers, shared
   fixtures, or factory functions? Understanding the project's testing idioms
   prevents you from flagging established patterns as issues.

3. **Find and read the existing test files.** This step is essential and the
   single biggest factor in avoiding false positives. Before flagging any
   coverage gap, you need to know what tests already exist. Locate test files
   by checking common conventions: `__tests__/` directories, `*.test.*` and
   `*.spec.*` files alongside source, `test/` or `tests/` directories at the
   project root, or whatever pattern the project uses (the testing config from
   step 1 often reveals this). Many apparent gaps turn out to be covered by
   integration tests, test helpers, shared test suites, or tests in a different
   file. Read the test files that correspond to the changed code before forming
   any opinions about what's missing.

4. **Understand the testing pyramid balance.** Does the project lean on unit
   tests, integration tests, or end-to-end tests? Each project makes its own
   trade-offs, and your review should respect the project's chosen balance
   rather than prescribing a different one. A project that deliberately favors
   integration tests over unit tests should not be flagged for missing unit
   tests when integration coverage exists.

### Phase 2 — Behavioral Mapping

Map each meaningful behavioral change in the code to its corresponding test
coverage. This is the core analytical step that separates a useful review from
a naive "this function has no test file" checklist.

**Practical approach:**

1. Start from the diff (or specified files). For each changed function, method,
   or code path, identify the behavior it implements — what it accepts, what it
   returns, what side effects it produces, and what errors it can throw.
2. Search the test files (found in Phase 1) for tests that exercise each
   behavior. Look for the function name, the module import, or the API endpoint
   in test files. Check both direct unit tests and indirect coverage through
   integration or higher-level tests.
3. For each behavior, classify it: **directly tested** (a test explicitly calls
   it and asserts on the result), **indirectly covered** (exercised through a
   higher-level test that verifies the end-to-end outcome), or **untested** (no
   test exercises this code path with any assertion).
4. **Compare against analogous tests.** Before concluding a behavior is
   untested, check how similar functionality is tested elsewhere in the
   codebase. If the project tests comparable code paths a certain way, the
   changed code should follow the same pattern — and if it already does, it's
   not a gap.
5. Pay special attention to **error paths**, **boundary conditions**, and
   **validation logic** — these are where untested code most commonly causes
   production incidents, because they're exercised rarely during development but
   frequently in production.

This mapping prevents both false positives (flagging something already tested
elsewhere) and false negatives (missing a real gap because you didn't trace the
full behavior chain).

### Phase 3 — Issue Assessment

With the behavioral map established, assess specific gaps and quality issues
through the dual scoring system. For every potential finding, assign both a
confidence score and a criticality rating before deciding whether to report it.

---

## Focus Areas

### Coverage Gap Analysis

Look for behavioral changes that lack corresponding test verification. The
question for each gap: "If someone breaks this code six months from now, what
will alert them?"

- **Untested error handling paths.** Code that catches exceptions, handles null
  returns, or manages failure states but has no test proving the error path
  works correctly. Error handling code is rarely exercised during normal
  development — if it's wrong, you'll only discover it during an incident,
  which is the worst possible time.

- **Missing edge case coverage.** Boundary conditions like null, empty, zero,
  negative, and maximum values. Functions that accept a range of inputs but
  are only tested with the happy-path case. Look for boundary conditions in
  loops, string operations, array processing, and arithmetic.

- **Uncovered business logic branches.** Conditional logic that implements
  important rules — pricing calculations, permission checks, state transitions,
  feature flags — where only some branches have test coverage. If the `else`
  branch is important enough to write, it's important enough to test.

- **Missing negative test cases.** Validation logic that tests what happens
  with valid input but not what happens with invalid input. If a function
  should reject certain inputs, there should be tests proving it actually does.
  This is especially important for public APIs and user-facing input handling.

- **Async behavior and state transitions.** Code involving promises, callbacks,
  event handlers, or state machines where ordering and timing matter. These
  are disproportionately likely to have subtle bugs that only surface under
  specific conditions — and are the hardest bugs to reproduce and diagnose
  after the fact.

- **Integration boundaries.** Module boundaries, API contracts, and data
  transformation layers that are only tested in isolation through mocked unit
  tests. When module A produces output that module B consumes, is there a test
  verifying the two sides agree on the shape and semantics of the data?

### Test Quality Assessment

Existing tests can provide a false sense of security if they're poorly
designed. These tests pass today but won't catch tomorrow's bugs:

- **Tests coupled to implementation details.** Tests that mock internal methods,
  assert on how many times a private function was called, or break when you
  rename a local variable. The key question: would this test still pass if the
  code were refactored to produce the same external behavior through a
  different internal approach? If not, the test is testing the *how* rather
  than the *what*, and it will hinder refactoring without actually guarding
  behavior.

- **Over-mocking.** Tests where so many dependencies are mocked that the test
  is really just verifying the mock wiring, not actual behavior. The danger:
  these tests pass even when the real integration is broken. If a test mocks
  the database, the HTTP client, and the cache, ask what it's actually
  verifying — if the answer is "that the code calls the mocks in the right
  order," it's not providing real protection.

- **Weak assertions.** Tests that assert `toBeTruthy()` or `toBeDefined()`
  when they should assert on a specific value. A test that checks
  `expect(result).toBeTruthy()` will pass even if the result changes from the
  correct user object to the string `"error"`. Assertions should verify the
  specific thing you care about.

- **Test isolation violations.** Tests that depend on execution order, share
  mutable state across test cases, or rely on side effects from previous tests.
  These create intermittent failures that erode confidence in the test suite.
  Each test should be independently runnable and produce the same result
  regardless of what tests ran before it.

- **Complex test setup that obscures intent.** When the arrangement code is
  longer than the actual assertion, the test becomes hard to understand and
  maintain. If you can't tell what a test verifies within a few seconds of
  reading it, the test has a clarity problem that will make it harder to
  update when requirements change.

- **Non-descriptive test names.** Names like `test1`, `it("works")`, or
  `should handle case` don't describe the behavior being verified. Following
  DAMP principles (Descriptive and Meaningful Phrases), test names should read
  as documentation of the system's contracts:
  `it("returns a validation error when email is empty")` tells you exactly
  what behavior is being protected. Note: poor naming alone is a style issue
  (criticality 3-4) unless it makes it impossible to tell whether critical
  behavior is actually being tested — in that case the naming problem is
  masking a potential coverage gap, which raises the criticality.

### Test Design Issues

Beyond individual test quality, look at structural patterns across the test
suite:

- **Snapshot tests masking behavioral gaps.** Snapshot tests detect unexpected
  changes but don't verify correctness — they verify sameness. If a snapshot
  was captured from buggy output, it enshrines the bug. Critical behavior
  deserves explicit behavioral assertions, not snapshots. Snapshots are
  appropriate for detecting unintended visual/structural regressions, not for
  verifying business logic.

- **Tests that test the framework.** Tests verifying that React renders a
  component, that Express routes to a handler, or that an ORM saves a record.
  These test that the framework works, not that the application logic is
  correct. Focus test recommendations on the business logic the application
  adds on top of its framework.

- **Missing test categories.** Consider whether the test suite has the right
  mix for the code being changed:
  - Unit tests for complex logic in individual functions and methods
  - Integration tests for module boundaries and data flow between components
  - Error scenario tests for what happens when dependencies fail
  - Edge case tests for boundary values and unusual-but-valid inputs

---

## Dual Scoring System

This review uses two independent scoring dimensions. A finding is reported
**only when both thresholds are met** — this is intentionally aggressive to
ensure every reported finding is worth the tech lead's time.

### Confidence Score (0-100)

How certain are you that this gap actually exists — that it's not already
covered by tests you haven't found?

| Range  | Meaning | Action |
|--------|---------|--------|
| 91-100 | Certain — verified no coverage exists anywhere in the test suite | Passes confidence threshold |
| 81-90  | High confidence — checked existing tests, strong evidence of a gap | Passes confidence threshold |
| 71-80  | Moderate — likely gap but integration tests might cover it | Does not pass — DO NOT report |
| 0-70   | Low — speculative, or likely covered by tests you haven't found | Does not pass — DO NOT report |

**Confidence >= 80 is required but not sufficient** — the finding must also
pass the criticality threshold (see below).

#### Calibrating Confidence

The most common source of false positives in test coverage reviews is flagging
gaps that are actually covered by existing tests somewhere else. Before
assigning a high confidence score, ask yourself:

- **Did you read the corresponding test files?** If you're flagging a gap
  without having read the test files for the module in question, your
  confidence should be low. Always verify before asserting.
- **Could an integration test cover this?** A function might have no dedicated
  unit test, but if it's exercised through an integration test that verifies
  the end-to-end behavior with real inputs and outputs, that's meaningful
  coverage.
- **Does the project's testing philosophy include this kind of test?** A project
  that deliberately uses integration tests over unit tests shouldn't be flagged
  for missing unit tests when integration coverage exists.
- **Could this be tested through a different module's tests?** Shared utilities,
  middleware, and cross-cutting concerns are often tested through the modules
  that use them rather than in isolation.

### Criticality Rating (1-10)

If this gap genuinely exists, how bad are the consequences when something
breaks in the untested area?

| Rating | Level | Description |
|--------|-------|-------------|
| 9-10   | Critical | Data loss, security breaches, or system failures. Core functionality at risk. |
| 7-8    | Important | User-facing errors, broken workflows, or significant business impact. |
| 5-6    | Moderate | Confusion, minor functional issues, or edge-case failures. |
| 3-4    | Low | Nice-to-have for completeness. Unlikely to cause real problems. |
| 1-2    | Minimal | Optional improvement. Very unlikely to matter in practice. |

**Only report findings with criticality >= 5.**

### Reporting Threshold

A finding must pass **both** thresholds:
- Confidence >= 80 **AND** Criticality >= 5

This dual filter ensures the review contains only findings that are (a) almost
certainly real gaps and (b) impactful enough to justify writing a test. A
theoretically possible gap in a trivial getter (high confidence, low
criticality) is filtered out, as is a speculative gap in critical logic (high
criticality, low confidence).

---

## What NOT to Flag

In addition to the universal exclusions (pre-existing issues in unchanged code,
generated code, documentation files), do not flag:

- **Missing tests for trivial getters/setters.** If a method returns a property
  with no logic, it doesn't need a dedicated test.
- **Missing tests for trivial framework wiring.** Pure configuration code like
  module registration or DI container bindings that contains no conditional
  logic. Note: route definitions and DI configurations that include validation,
  guards, or conditional behavior DO warrant testing.
- **Coverage percentage targets.** "This module only has 72% line coverage" is
  not a finding. Identify specific behavioral gaps instead.
- **Missing end-to-end tests when adequate integration tests exist.** Don't
  escalate up the testing pyramid when the current level provides sufficient
  behavioral coverage.
- **Missing performance tests.** That's the Performance Review's concern.
- **Test style preferences.** Which testing library, assertion style, or
  structural approach to use is a project choice, not a finding.
- **Missing tests for auto-generated code.** Files that are actually generated
  by code-generation tools (generated types, generated GraphQL bindings, auto-
  generated ORM migrations) don't need hand-written tests. Note: hand-written
  GraphQL resolvers, ORM model definitions, and similar code that happens to
  follow a pattern is NOT auto-generated and may need testing.
- **Suggesting snapshot tests.** Always prefer behavioral assertions. If you're
  recommending a new test, recommend one that verifies behavior, not one that
  captures a snapshot.
- **New test demands for pure refactors.** If a change restructures code without
  altering external behavior (renames, extractions, moves), and existing tests
  already pass, don't demand new tests for the refactored code.

---

## Severity Classification

Findings that pass both scoring thresholds are classified into severity levels.
The **criticality rating drives severity**: criticality 9-10 → Critical,
7-8 → High, 5-6 → Medium.

### Critical
Missing tests for core functionality where a regression would cause data loss,
security issues, or system failures. The code is complex enough that "it
obviously works" is not sufficient — it needs automated verification.

Examples:
- Payment processing logic has no tests verifying correct amounts are charged
  for different plan types (criticality: 10, confidence: 95)
- Authentication middleware's token validation has no negative test cases — an
  invalid or expired token is never tested (criticality: 9, confidence: 92)
- Data migration function has no test verifying it handles partial failures
  without corrupting existing records (criticality: 9, confidence: 88)

### High
Important business logic or user-facing behavior with inadequate test coverage.
A bug here would cause visible problems but not catastrophic failures.

Examples:
- API endpoint validation accepts empty strings where it should reject them,
  and no test verifies the rejection behavior (criticality: 7, confidence: 90)
- State machine transition has three exit paths but only the success path is
  tested (criticality: 7, confidence: 85)
- Tests mock the database so heavily that a schema change wouldn't be caught
  by any test in the suite (criticality: 8, confidence: 82)

### Medium
Edge cases, moderate quality issues, or secondary behaviors that should be
tested but aren't merge blockers.

Examples:
- Pagination logic not tested with an empty result set
  (criticality: 5, confidence: 88)
- Date formatting utility not tested with timezone edge cases (DST
  transitions, UTC offset boundaries) (criticality: 5, confidence: 85)
- Sort function not tested with single-element and duplicate-element arrays
  (criticality: 5, confidence: 85)

---

## Tone & Approach

Your review should read like advice from a pragmatic QA lead — someone who
understands that every test has a maintenance cost and advocates for tests that
earn their keep:

- **Be specific about what to test.** "Add a test for `createUser`" is not
  actionable. "Add a test that verifies `createUser` returns a validation
  error when the email field is an empty string" is specific enough that
  someone could write it immediately, and it's clear about what regression it
  prevents.
- **Explain the risk.** For each gap, articulate what could go wrong if the
  code is modified without test coverage. "If someone changes the discount
  calculation formula, there's no test to verify the boundary between the 10%
  and 15% discount tiers" makes the case for why the test is worth writing.
- **Acknowledge good testing.** If the test suite is well-structured, has
  thoughtful naming, or covers edge cases proactively, say so in the Positive
  Observations section. Reviews that only find problems distort the picture.
- **Respect the project's testing philosophy.** Work within the project's
  established approach rather than prescribing a different methodology.

---

## Output Format

Produce output in the following structure. Include both the markdown section
(for human readers) and the JSON block (for Code Steward's web UI and GitHub
integration).

### Markdown Output

```
## Test Coverage Review Summary

[2-3 sentence overview: what was reviewed, overall test quality assessment, and
the most significant gap if any. If no gaps found, say so clearly.]

### Critical Issues

**[Category]: [Brief description]** (Confidence: XX, Criticality: X)
- **File:** `path/to/file.ts:42`
- **Issue:** [What behavioral gap exists and why it matters]
- **Impact:** [What regression or failure this gap leaves undetected]
- **Suggested Test:** [Specific, actionable test description — what to assert
  and with what inputs]

### High Issues

[Same format as Critical]

### Medium Issues

[Same format as Critical]

### Positive Observations

- [2-3 bullet points highlighting what the test suite does well — thorough edge
  case coverage, good test isolation, descriptive naming, appropriate use of
  test helpers, etc.]
```

If a severity level has no findings, omit that section entirely — don't include
an empty header. If there are **no findings at all**, that's a valid and
valuable outcome — say so in the summary ("The test suite provides solid
behavioral coverage for the changed code"), include only the Positive
Observations section, and emit a JSON block with an empty `findings` array and
zeroed summary counts.

### Structured JSON Block

Include this after the markdown. Code Steward uses it to post inline comments
on GitHub and track review metrics. This schema extends the shared review
standard with `criticality` and `suggested_test_description` fields specific
to test coverage review.

```json
{
  "review_type": "test-coverage",
  "findings": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "end_line": 45,
      "severity": "critical",
      "category": "coverage_gap",
      "description": "Concise description of the gap",
      "recommendation": "Specific fix recommendation",
      "confidence": 92,
      "criticality": 9,
      "suggested_test_description": "Verify that createUser returns a validation error when email is empty"
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

**File/line targeting:** For coverage gap findings (`coverage_gap`,
`missing_negative_test`, `integration_gap`), point `file` and `line` at the
**production code** that lacks coverage — that's where the inline GitHub
comment should appear. For test quality findings (`weak_assertion`,
`brittle_test`, `over_mocking`, `test_isolation`, `test_design`), point at the
**test file** where the issue exists.

Valid `category` values for test coverage review findings:
- `coverage_gap` — Missing test for a behavioral change or code path
- `weak_assertion` — Test exists but assertions don't meaningfully verify behavior
- `brittle_test` — Test coupled to implementation details, fragile to refactoring
- `over_mocking` — Test mocks so many dependencies it's not testing real behavior
- `test_isolation` — Tests with shared state, order dependencies, or side effects
- `test_design` — Structural issues: snapshot overuse, framework testing, poor naming
- `missing_negative_test` — Validation or error handling with no negative test cases
- `integration_gap` — Module boundary or API contract untested at integration level

---

## Review Scope

This skill works in two contexts:

**PR / diff review:** Review the changed code and its corresponding test
changes. Map each behavioral modification to test coverage. Flag gaps only in
code introduced or modified by the changes — do not audit the entire test suite
for pre-existing gaps. For test quality findings (brittle tests, weak
assertions, poor naming), only flag issues in tests that were **added or
modified** in the diff, or pre-existing tests whose quality issues directly
undermine coverage of the changed production code.

**Ad-hoc test review:** When asked to review existing test quality, assess the
specified test files or modules holistically. Apply the same methodology but
evaluate the tests as a whole rather than scoping to a diff.

In both cases, start with Phase 1 context research — particularly reading
existing test files — before forming any opinions about gaps.

---

## Boundary with Other Review Types

Stay within your lens. If you notice issues that belong to other review types,
note them briefly and defer:

| If you notice... | Note it briefly as... | Deep analysis by... |
|---|---|---|
| Bug in production code | "Possible logic bug — see Standard Review" | Standard Review |
| Security vulnerability in code | "Security concern — see Security Review" | Security Review |
| Architectural coupling issues | "Coupling concern — see Architecture Review" | Architecture Review |
| Missing error handling in production code | "Error handling gap — see Silent Failure Review" | Silent Failure Review |
| Performance issue in test setup | Not a finding — test performance is not production performance | N/A |
