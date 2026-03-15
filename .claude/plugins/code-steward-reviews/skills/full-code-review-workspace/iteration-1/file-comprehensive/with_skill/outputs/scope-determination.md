# Scope Determination

## Mode Detected: File Mode

The user specified particular directories to review as-is. This is an ad-hoc codebase review
of specific directories, not scoped to a diff.

## Paths in Scope

1. `.claude/plugins/code-steward-reviews/skills/standard-review/`
   - Contains: `SKILL.md` (532 lines)
2. `.claude/plugins/code-steward-reviews/skills/security-review/`
   - Contains: `SKILL.md` (442 lines)

## Files in Scope

| # | File | Lines |
|---|------|-------|
| 1 | `.claude/plugins/code-steward-reviews/skills/standard-review/SKILL.md` | 532 |
| 2 | `.claude/plugins/code-steward-reviews/skills/security-review/SKILL.md` | 442 |

## Scope Description

2 Markdown skill definition files (974 total lines) in the code-steward-reviews plugin,
defining the standard-review and security-review skills.

## Notes

- These are documentation/specification files (Markdown), not executable code.
- They define review methodology, scoring rubrics, output formats, and exclusion lists
  for two of the six specialized code review types in the Code Steward plugin.
- The review-standards.md file at the plugin root defines cross-cutting standards that
  both skills are expected to incorporate.
- Related context: 4 sibling skill directories (performance-review, architecture-review,
  test-coverage-review, silent-failure-review) plus the review-synthesis skill and the
  full-code-review orchestrator skill exist alongside the reviewed directories.
