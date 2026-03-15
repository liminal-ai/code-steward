# Code Steward Review Standards

These standards apply to ALL review skills in this plugin. Every skill MUST
incorporate these patterns. They are non-negotiable.

---

## Three-Phase Analysis Methodology

Every review follows three phases in order. Do not skip phases.

**Phase 1 — Context Research**
Before examining the changes, understand the codebase:
- Read CLAUDE.md or equivalent project configuration if present
- Identify existing patterns, conventions, and frameworks in use
- Understand the project's established approaches for the area you're reviewing
- Note the project's language, framework, and architectural style

**Phase 2 — Comparative Analysis**
Compare the changes against established patterns:
- Does the new code follow or deviate from existing conventions?
- Are there inconsistencies with how similar things are done elsewhere?
- Does the change introduce something new where an established pattern exists?

**Phase 3 — Issue Assessment**
Now assess specific issues through your review lens:
- Apply your specialized focus area
- Score each finding for confidence
- Filter out low-confidence findings before reporting
- Produce structured output

---

## Confidence Scoring

Every finding MUST include a confidence score from 0 to 100.

| Range | Meaning | Action |
|-------|---------|--------|
| 91-100 | Certain — clear violation or bug with obvious impact | Always report |
| 81-90 | High confidence — strong evidence of a real issue | Always report |
| 71-80 | Moderate — likely issue but may have context you're missing | Report only if impact is significant |
| 0-70 | Low confidence — speculative, theoretical, or nitpick | DO NOT REPORT |

**Only report findings with confidence >= 80.**

Quality over quantity. A review with 3 high-confidence findings is more valuable
than one with 15 mixed-confidence findings. The tech lead using this tool needs
to trust that every reported finding is worth their time.

---

## Severity Levels

Every finding MUST be classified into one of three severity levels. Definitions
vary by review type but follow this general framework:

| Severity | General Definition |
|----------|-------------------|
| **Critical** | Will cause bugs, security breaches, data loss, or system failures in production. Must fix before merge. |
| **High** | Significant issue that will cause problems — poor user experience, maintenance burden, performance degradation. Should fix before merge. |
| **Medium** | Real issue with lower impact. Consider fixing but not a merge blocker. |

Do NOT use "Low" or "Informational" levels. If it's not worth classifying as
Medium or above, it's below the confidence threshold and shouldn't be reported.

---

## Output Format

Every review MUST produce output in this exact structure:

### Markdown Section

Start with a brief 2-3 sentence summary of overall findings. Then list findings
grouped by severity:

```
## [Review Type] Review Summary

[2-3 sentence overview of findings]

### Critical Issues

**[Category]: [Brief description]** (Confidence: XX)
- **File:** `path/to/file.ts:42`
- **Issue:** [Detailed explanation of what's wrong]
- **Impact:** [What happens if this isn't fixed]
- **Recommendation:** [Specific fix with code example if helpful]

### High Issues

[Same format]

### Medium Issues

[Same format]

### Positive Observations

[Brief notes on what the code does well — 2-3 bullet points max]
```

### Structured JSON Block

After the markdown, include a JSON code block with machine-readable findings.
This is used by Code Steward's web UI to create inline GitHub comments and
track review data.

```json
{
  "review_type": "standard|security|performance|architecture|test-coverage|silent-failure",
  "findings": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "end_line": 45,
      "severity": "critical",
      "category": "category_name",
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

---

## Project Convention Awareness

Before reviewing, check for and read these files if they exist:
- `CLAUDE.md` — project-specific coding conventions and rules
- `.editorconfig` — formatting standards
- `eslint` / `prettier` / `biome` config — style rules
- `tsconfig.json` — TypeScript strictness settings

If the project has explicit conventions, violations of those conventions are
higher severity than general best practice suggestions. A finding that
contradicts an explicit project convention should be flagged but noted as
"conflicts with project convention in [file]" rather than reported as an issue.

---

## Exclusion Principles

Each review type has its own exclusion list. But these universal exclusions
apply to ALL review types:

1. **Pre-existing issues** — Only flag issues introduced or modified by the
   changes being reviewed. Do not flag problems in unchanged code.
2. **Style preferences** — Do not flag style choices that aren't in the
   project's conventions. Personal preferences are not findings.
3. **Theoretical issues** — Do not flag issues that require unlikely or
   contrived scenarios to trigger. Focus on realistic impact.
4. **Documentation files** — Markdown files (.md), README files, and
   documentation-only changes are generally excluded from code reviews.
5. **Generated code** — Files that are clearly auto-generated (lock files,
   build artifacts, generated types) should not be reviewed.
6. **Test files** — Test files are only reviewed by the Test Coverage review
   type. Other review types should not flag issues in test files unless the
   issue has production implications (e.g., a test that modifies production data).

---

## Skill Description (Frontmatter)

Each skill's frontmatter `description` field controls when Claude auto-triggers
the skill. Write descriptions that:
- List the specific trigger phrases a user would say
- Cover both PR review and ad-hoc codebase review contexts
- Mention the specific review focus (security, performance, etc.)
- Are specific enough to not trigger on unrelated tasks

---

## What These Skills Are NOT

- Not a replacement for human code review — they augment it
- Not linters or formatters — they don't check style rules (use eslint for that)
- Not CI/CD validators — they don't run tests or builds
- Not documentation generators — they review code, not produce docs

Each skill is a focused lens that examines code from a specific angle and
produces actionable findings a tech lead can act on.
