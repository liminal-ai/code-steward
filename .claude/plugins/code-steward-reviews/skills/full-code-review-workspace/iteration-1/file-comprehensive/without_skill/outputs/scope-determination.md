# Scope Determination

## What Was Reviewed

Two SKILL.md files from the Code Steward reviews plugin:

1. **standard-review/SKILL.md** (533 lines, ~24KB) -- The general-purpose "senior developer" code review skill
2. **security-review/SKILL.md** (443 lines, ~22KB) -- The security-focused vulnerability detection skill

## How Scope Was Determined

The task specified two explicit directory paths:
- `.claude/plugins/code-steward-reviews/skills/standard-review/`
- `.claude/plugins/code-steward-reviews/skills/security-review/`

Each directory contains a single file: `SKILL.md`. These are the target files.

## Context Gathered for the Review

To perform a meaningful review, I also read these supporting files to understand the broader system the skills operate within:

### Direct Dependencies / Parent Standards
- **`review-standards.md`** (193 lines) -- The shared standards document that all six review skills must conform to. This defines the three-phase methodology, confidence scoring, severity levels, output format, and universal exclusions that each skill is supposed to implement.
- **`plugin.json`** and **`marketplace.json`** -- Plugin metadata confirming the plugin's name, version (0.1.0), and declared scope (six review types).

### Sibling Skills (for cross-skill consistency analysis)
- **`architecture-review/SKILL.md`** (591 lines)
- **`performance-review/SKILL.md`** (322 lines)
- **`silent-failure-review/SKILL.md`** (526 lines)
- **`test-coverage-review/SKILL.md`** (511 lines)
- **`review-synthesis/SKILL.md`** (550 lines)
- **`full-code-review/SKILL.md`** (294 lines)

Reading all sibling skills was necessary to evaluate:
- Whether standard-review and security-review are internally consistent with the shared standards
- Whether they correctly define boundaries with the other review types
- Whether cross-references between skills are accurate and complete
- Whether the output schema contracts are compatible with what the synthesis skill expects to consume

## Review Dimensions

The review examines the two target SKILL.md files across these dimensions:

1. **Correctness and Internal Consistency** -- Do the skills accurately implement what `review-standards.md` requires? Are there contradictions within each skill?
2. **Cross-Skill Consistency** -- Are shared concepts (confidence scoring, severity levels, output format, exclusions) defined consistently across the two skills and with the parent standards?
3. **Completeness** -- Are there gaps in the methodology, output schema, exclusion lists, or boundary definitions?
4. **Output Schema Correctness** -- Will the JSON output from these skills be consumable by the synthesis skill and the declared web UI integration?
5. **Prompt Engineering Quality** -- How well are these skills written as LLM instructions? Are there ambiguities, contradictions, or instruction gaps that would cause unreliable behavior?
6. **Architecture and Design** -- Is the overall design of these skills well-structured? Are responsibilities properly separated?
7. **Edge Case Handling** -- Do the skills handle all relevant edge cases (no findings, mixed contexts, boundary with other review types)?
8. **Maintainability** -- How easy would it be to update these skills as the system evolves?

## What Was NOT Reviewed

- The evals directory under `full-code-review/` (out of explicit scope)
- The implementation code that would invoke these skills (no runtime code exists in the plugin yet)
- The actual effectiveness of these skills when run against real code (would require execution testing)
- The `full-code-review-workspace/` directory contents (that is the output destination, not a review target)
