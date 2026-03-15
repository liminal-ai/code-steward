# Review Selection

## Selected Review Types: All 6

The user requested a "comprehensive review" with all 6 review types run explicitly.

| # | Review Type | Skill | Selected | Rationale |
|---|-------------|-------|----------|-----------|
| 1 | Standard | standard-review | Yes | User requested comprehensive / all 6 |
| 2 | Security | security-review | Yes | User requested comprehensive / all 6 |
| 3 | Performance | performance-review | Yes | User requested comprehensive / all 6 |
| 4 | Architecture | architecture-review | Yes | User requested comprehensive / all 6 |
| 5 | Test Coverage | test-coverage-review | Yes | User requested comprehensive / all 6 |
| 6 | Silent Failure | silent-failure-review | Yes | User requested comprehensive / all 6 |

## Edge Case Consideration

The files under review are Markdown skill definitions (documentation/specification files),
not executable code. Several review types (security, performance, silent-failure, test-coverage)
are primarily designed to analyze executable code and may yield limited or no findings on
specification documents. However, the user explicitly requested all 6 types, so all will be
run. Reviews that find no applicable issues will report clean results, which is a valid outcome
per the skill definitions.

## Adaptation for Non-Code Files

Since the target files are skill specifications (instructional Markdown documents that define
how AI agents should conduct code reviews), the reviews will be adapted as follows:

- **Standard Review**: Assess logic correctness of the specified methodology, readability,
  naming consistency, structural coherence, and internal consistency.
- **Security Review**: Check for any security anti-patterns that the skills might inadvertently
  encourage or fail to catch. Assess whether the exclusion lists could create blind spots.
- **Performance Review**: Assess whether the review methodology could create performance
  issues when executed (e.g., overly broad search patterns, unbounded file reads).
- **Architecture Review**: Evaluate the structural design of the skills -- module boundaries,
  pattern conformance with sibling skills, coupling, API surface (output format contracts).
- **Test Coverage Review**: Assess whether the skills have adequate validation mechanisms
  (examples, edge case handling, calibration guidance) to prevent incorrect execution.
- **Silent Failure Review**: Look for places where the methodology could silently produce
  wrong or incomplete results without the user knowing.
