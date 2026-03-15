# Full Code Review Complete

**Scope:** 2 skill definition files (standard-review/SKILL.md and security-review/SKILL.md) reviewed as ad-hoc codebase review in file mode.
**Reviews run:** standard, security, performance, architecture, test-coverage, silent-failure

---

## Review Synthesis -- Verification Summary

**Reviews synthesized:** standard, security, performance, architecture, test-coverage, silent-failure
**Total findings received:** 8
**Verified & included:** 6 (4 confirmed, 2 adjusted)
**Rejected (false positive):** 1
**Merged (duplicates):** 1
**Synthesizer-identified (new):** 0

### Rejection Log

| # | Source | File:Line | Original Finding | Rejection Reason |
|---|--------|-----------|-----------------|------------------|
| 1 | performance | security-review/SKILL.md:216 | Exclusion list at 23 items could cause slow sequential checking during review execution | The exclusion list is read by an LLM, not iterated programmatically. LLMs process structured lists holistically, not item-by-item. No measurable performance impact on review execution. |

### Merge Log

| # | Merged Finding | Into Finding | Source Reviews | Reason |
|---|---------------|-------------|----------------|--------|
| 1 | Missing "Review Scope" section (standard) | Missing structural sections (architecture) | standard + architecture | Both identify the same gap in security-review -- the architecture finding is broader (covers Boundary, Tone, and Review Scope as a pattern deviation), so the standard finding merges into it. |

### Adjustment Log

| # | Source | File:Line | What Changed | Why |
|---|--------|-----------|-------------|-----|
| 1 | standard | security-review/SKILL.md:63 | Severity Medium -> High | The >= 81 vs >= 80 discrepancy is not just a cosmetic inconsistency -- it creates a 1-point dead zone (exactly 80) where a finding would be reportable under the ecosystem standard but silently dropped by the security review. In a system where findings are cross-verified by a synthesis step that uses the >= 80 threshold, this mismatch could cause silent disagreements. |
| 2 | architecture | Both files | Scorecard Coupling & Cohesion adjusted 7/10 -> 6/10 | Upon deeper analysis, the security review's missing structural sections (Boundary, Tone, Review Scope) represent a meaningful coupling gap -- the full-code-review orchestrator and review-synthesis skill expect all individual review skills to produce compatible outputs and follow consistent structural contracts. The security review's deviations from this shared contract are more significant than initially assessed. |

### Synthesizer-Identified Findings

*No new findings identified during synthesis.*

---

### Architecture Scorecard

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Pattern Conformance | 6/10 | The two skills follow the three-phase methodology from review-standards.md, but the security-review deviates from the sibling skill pattern in several structural ways: different section names, missing sections (Boundary, Tone, Review Scope), different frontmatter format, and inconsistent confidence threshold table structure. |
| Abstraction Quality | 8/10 | Both skills define clear abstractions at the right level -- focus areas, scoring rubrics, output contracts. The security review's exclusion list and false positive precedents are particularly well-abstracted. |
| Coupling & Cohesion | 6/10 | The security review is less coupled to the shared ecosystem conventions than it should be. It operates somewhat independently where it should follow the shared contract more closely. Both skills are internally cohesive -- each section serves its skill's purpose. |
| API Clarity | 8/10 | Output format contracts (markdown + JSON) are well-defined in both skills. Category enums, severity levels, and required fields are explicit. The security review adds `exploit_scenario` and `cwe` fields cleanly. |
| Maintainability Impact | 7/10 | Both skills are maintainable documents. The standard review's structural consistency with siblings makes it easier to update cross-cutting concerns. The security review's structural deviations mean cross-cutting changes (like updating the confidence scoring rubric) require more careful attention. |

---

## Consolidated Review Findings

These two skill definitions are well-crafted specifications that demonstrate deep expertise in code review methodology. The standard-review skill is exemplary in its structural consistency with sibling skills and its nuanced coverage of focus areas. The security-review skill excels in its comprehensive exclusion list and false positive precedents, which represent substantial domain knowledge. The findings below identify inconsistencies and structural gaps that could cause subtle problems during automated review execution.

### High Issues

**Convention Violation: Security review uses >= 81 threshold where ecosystem standard is >= 80** (Confidence: 92 | Source: standard)
- **File:** `.claude/plugins/code-steward-reviews/skills/security-review/SKILL.md:63`
- **Issue:** In Phase 3's filter criteria (line 63), the security-review skill states "Confidence >= 81 is always reportable." This creates a 1-point discrepancy with the ecosystem-wide threshold of >= 80 established in `review-standards.md` (line 45) and used by all other skills (standard-review line 259: "Only report findings with confidence >= 80"; architecture-review line 269: same; performance-review line 172: "Only report findings scoring **80 or above**"). Additionally, the security review's own confidence scoring table on line 189 uses the range "81-90" which is consistent with >= 81 but inconsistent with the rest of the ecosystem. A finding scored at exactly 80 would be reported by every other review skill but silently dropped by the security review.
- **Impact:** During full-code-review orchestration, where the synthesis step cross-verifies findings using the standard >= 80 threshold, this mismatch creates a subtle behavioral inconsistency. More practically, it means the security review is slightly more aggressive at filtering than intended by the shared standard -- findings at exactly confidence 80 are silently excluded.
- **Recommendation:** Change line 63 to "Confidence >= 80 is always reportable. Confidence 71-80 is only reportable if the severity would be Critical or High. Below 71, drop it regardless." Also update the confidence scoring table on line 189 to use "80-90" as the second range, matching the ecosystem convention. Alternatively, if the >= 81 threshold is intentional for security reviews (stricter filtering), document the rationale explicitly and note the deviation from review-standards.md.
- **Verification:** Confirmed by reading security-review/SKILL.md lines 63-65 and comparing against review-standards.md line 45, standard-review/SKILL.md line 259, architecture-review/SKILL.md line 269, and performance-review/SKILL.md line 172. The discrepancy exists exactly as described.

**Pattern Conformance: Security review missing three structural sections present in sibling skills** (Confidence: 90 | Source: architecture)
- **File:** `.claude/plugins/code-steward-reviews/skills/security-review/SKILL.md`
- **Issue:** The security-review skill is missing three sections that are present in most or all sibling review skills:
  1. **"Review Scope" section** -- standard-review (line 510), architecture-review (line 575), test-coverage-review (line 493), silent-failure-review (line 497) all have explicit sections distinguishing PR/diff review behavior from ad-hoc codebase review behavior. The security review has no equivalent guidance. An agent executing the security review skill in ad-hoc mode (no diff) has no instruction on how to adapt its analysis -- should it flag all vulnerabilities in the file, or only recent ones?
  2. **"Tone & Approach" section** -- standard-review (line 402), architecture-review (line 436), test-coverage-review (line 372), silent-failure-review (line 514) all provide tone guidance. The security review does not. While the opening paragraphs set a tone ("think like an attacker", "minimize false positives"), there is no dedicated section addressing how to frame findings constructively.
  3. **"Boundary with Other Review Types" section** -- standard-review (line 381), architecture-review (line 385), test-coverage-review (line 514) all have explicit tables showing how to handle findings that cross into other review types' domains. The security review has no equivalent guidance.
- **Impact:** The missing "Review Scope" section is the most impactful gap. When the full-code-review orchestrator sends scope context to each subagent (Step 3 of the orchestrator), it includes mode-specific instructions like "Review these files/directories as an ad-hoc codebase review." The security review skill has no instructions on how to handle this mode. The agent must improvise, which could lead to inconsistent behavior. The missing "Boundary" section means the security review may produce findings that overlap with standard-review findings without the deduplication guidance that other skills provide.
- **Recommendation:** Add three sections to security-review/SKILL.md:
  1. A "Review Scope" section after the Output Format section, following the pattern established by standard-review (PR/diff mode: only flag vulnerabilities in changed code; ad-hoc mode: assess all code holistically).
  2. A "Tone" section, even if brief, addressing how to frame security findings constructively (e.g., "describe exploits clinically, not sensationally").
  3. A "Boundary with Other Review Types" section with a table showing how to handle findings that cross into standard, performance, or architecture domains (e.g., "If you notice a logic bug that isn't security-related, note it briefly and defer to Standard Review").
- **Verification:** Confirmed by grepping all SKILL.md files for "## Boundary", "## Tone", and "## Review Scope" headings. The security-review file contains none of these. Also confirmed by searching for "ad-hoc" and "PR review" in security-review/SKILL.md -- no matches for scope-related guidance.

### Medium Issues

**Convention Violation: Inconsistent 71-80 confidence range handling across the two skills** (Confidence: 88 | Source: standard)
- **File:** `.claude/plugins/code-steward-reviews/skills/standard-review/SKILL.md:256` and `.claude/plugins/code-steward-reviews/skills/security-review/SKILL.md:189`
- **Issue:** The 71-80 confidence range receives different treatment across the two reviewed skills and the parent review-standards.md:
  - **review-standards.md (line 42):** "Report only if impact is significant" -- conditional reporting
  - **standard-review (line 256):** "DO NOT report" -- absolute prohibition
  - **security-review (line 189):** "Report only if severity is Critical or High" -- conditional reporting with specific criteria
  This same inconsistency extends across the broader skill ecosystem: architecture-review uses "Report only if impact is significant", test-coverage-review uses "Does not pass -- DO NOT report", performance-review collapses the range into "0-79: DO NOT REPORT", and silent-failure-review uses "Report only if severity is Critical".
- **Impact:** When the full-code-review orchestrator runs all 6 reviews against the same codebase, each review applies a different threshold for the 71-80 range. This means a finding at confidence 75 with Critical severity would be reported by the security review and silent-failure review, but silently dropped by the standard review, test-coverage review, and performance review. The review-synthesis skill then has to reconcile these inconsistent thresholds during verification. This is not a bug per se -- it could be an intentional design choice where each review type calibrates its threshold to its domain -- but if intentional, it should be documented as such in review-standards.md.
- **Recommendation:** Either (a) standardize the 71-80 range handling across all skills to match review-standards.md ("Report only if impact is significant"), or (b) add a note to review-standards.md acknowledging that individual skills may override the 71-80 range behavior for domain-specific reasons, and list the current overrides. The standard-review's "DO NOT report" is the most restrictive interpretation and may be more conservative than intended by the parent standard.
- **Verification:** Confirmed by reading the confidence scoring sections of both files and all sibling skills. The discrepancy exists exactly as described across 6 different handling approaches for the same confidence range.

**Pattern Conformance: Inconsistent frontmatter description format between the two skills** (Confidence: 85 | Source: architecture)
- **File:** `.claude/plugins/code-steward-reviews/skills/security-review/SKILL.md:3` and `.claude/plugins/code-steward-reviews/skills/standard-review/SKILL.md:3`
- **Issue:** The standard-review uses YAML block scalar syntax (`>-`) for its frontmatter description, producing a clean multi-line format that's easy to read and edit. The security-review uses an inline quoted string on a single line, making the description a dense, hard-to-read wall of text. Comparing with sibling skills: architecture-review, performance-review, test-coverage-review, and silent-failure-review all use `>-` or `>` block scalar syntax. The security-review is the only skill using inline quoted string format.
- **Impact:** Reduced maintainability of the security-review frontmatter. The inline format is harder to read when scanning the file, harder to edit without breaking YAML syntax (escaped quotes, line length), and inconsistent with the established pattern across all other skills. When a contributor needs to update trigger phrases in the description, the inline format is more error-prone.
- **Recommendation:** Reformat the security-review's frontmatter description to use `>-` block scalar syntax, matching the convention established by standard-review and all other sibling skills.
- **Verification:** Confirmed by reading lines 1-5 of both files and comparing with frontmatter of all sibling skills. The security-review is the sole outlier using inline quoted string format.

**Consistency: Security review's confidence scoring table uses different row structure than other skills** (Confidence: 82 | Source: standard)
- **File:** `.claude/plugins/code-steward-reviews/skills/security-review/SKILL.md:185-190` and `.claude/plugins/code-steward-reviews/skills/performance-review/SKILL.md:176-180`
- **Issue:** Across the skill ecosystem, there are three different table structures for the confidence scoring rubric:
  - **4-row standard (91-100, 81-90, 71-80, 0-70):** Used by standard-review, architecture-review, silent-failure-review, test-coverage-review, and review-standards.md
  - **4-row with bold labels (same ranges):** Used by security-review -- same ranges but column content includes bold formatting (`**Certain**`) not used in other tables
  - **3-row simplified (91-100, 81-90, 0-79):** Used by performance-review -- collapses the 71-80 range into the 0-79 bucket
  While the security-review's table has the same 4 rows as the standard, its column header names differ ("Range / Meaning / Action" in most skills vs "Range / Meaning / Action" -- actually the same, but the "Meaning" content uses bold labels the others don't).
  This is a minor cosmetic inconsistency. The more substantive issue (different handling of the 71-80 range) is covered in the finding above.
- **Impact:** Low direct impact -- the tables communicate the same information through slightly different formatting. However, if a contributor is updating the confidence rubric across all skills (e.g., changing thresholds), the inconsistent formatting means they need to adapt each edit to match each file's local style rather than applying a uniform change.
- **Recommendation:** Standardize the confidence scoring table format across all skills. The 4-row format without bold labels (used by standard-review, architecture-review, et al.) is the most common and should be the standard. The performance-review's 3-row format should either be expanded to 4 rows for consistency or documented as an intentional simplification.
- **Verification:** Confirmed by reading the confidence scoring tables in both reviewed files and all sibling skills.

### Positive Observations

- **Standard-review's Phase 1-3 methodology is exceptionally well-structured.** The context research, comparative analysis, and issue assessment phases provide a rigorous framework that prevents shallow pattern-matching. The explicit instruction to "understand scope and intent" before examining code (line 48-53) is particularly valuable for preventing false positives from flagging intentional design choices.

- **Security-review's exclusion list and false positive precedents are outstanding.** The 23-item hard exclusion list (lines 222-276) and 12-item false positive precedent list (lines 282-316) represent deep domain knowledge about what NOT to flag. Items like "Random UUIDs (v4) are unguessable" (line 285), "Framework XSS protection" (line 293), and "Client-side auth is not security" (line 296) will prevent a large class of common false positives. This is one of the most valuable sections across all the review skills.

- **Both skills maintain clear separation of concerns.** The standard-review explicitly defers to other review types via its Boundary table (lines 387-398) with specific "Note it briefly as..." / "Deep analysis by..." guidance. The security-review's mandate to require a concrete exploit scenario for every finding (line 402-403: "If you cannot write a concrete exploit scenario, the finding is too speculative to report") is a strong quality gate.

- **The JSON output contracts are well-designed.** Both skills define explicit category enums, required fields, and example JSON blocks. The security-review's addition of `exploit_scenario` (required) and `cwe` (optional) fields extends the base contract cleanly without breaking compatibility. The standard-review's 9 category values (lines 497-506) provide good granularity without over-categorization.

- **Both skills effectively address the "no findings" outcome.** The standard-review handles it inline within the output format section (lines 460-464), while the security-review dedicates a full section with example output (lines 411-442). Both approaches communicate that a clean report is a valid, valuable outcome -- not a failure.

---

### Systemic Patterns

**Cross-cutting standard drift:** The most significant pattern across both reviewed files is inconsistency with the shared `review-standards.md` contract. The review-standards.md file defines common patterns (three-phase methodology, confidence scoring, output format, exclusion principles), but individual skills have drifted from these shared standards in small ways: the security review's >= 81 threshold (vs >= 80), the standard review's stricter 71-80 handling (vs review-standards.md's conditional), and structural section differences between skills. This suggests that the skills were written or evolved somewhat independently after the shared standard was established, and no reconciliation pass has been done to ensure alignment. This is a normal maturation pattern for a plugin with multiple specification documents -- it's the right time to do a consistency audit across all 8 skill files against review-standards.md.

---

## Consolidated JSON Block

```json
{
  "review_type": "synthesis",
  "synthesis_metadata": {
    "reviews_synthesized": ["standard", "security", "performance", "architecture", "test-coverage", "silent-failure"],
    "total_received": 8,
    "verified_included": 6,
    "rejected": 1,
    "merged": 1,
    "adjusted": 2,
    "synthesizer_identified": 0
  },
  "scorecard": {
    "pattern_conformance": { "score": 6, "justification": "Security-review deviates from sibling skill pattern in frontmatter format, section structure, and confidence threshold. Standard-review conforms well." },
    "abstraction_quality": { "score": 8, "justification": "Both skills define clear focus areas, scoring rubrics, and output contracts at appropriate abstraction levels." },
    "coupling_cohesion": { "score": 6, "justification": "Security-review is missing structural sections that couple it to the shared ecosystem contract (Review Scope, Boundary, Tone). Standard-review is well-coupled." },
    "api_clarity": { "score": 8, "justification": "JSON output contracts are well-defined with explicit category enums and required fields. Security review cleanly extends the base contract." },
    "maintainability_impact": { "score": 7, "justification": "Standard-review's consistency with siblings makes cross-cutting updates easy. Security-review's deviations require more careful attention during updates." }
  },
  "findings": [
    {
      "file": ".claude/plugins/code-steward-reviews/skills/security-review/SKILL.md",
      "line": 63,
      "end_line": 65,
      "severity": "high",
      "category": "convention_violation",
      "source_reviews": ["standard"],
      "description": "Security review uses >= 81 confidence threshold in filter criteria (line 63) while the ecosystem standard established in review-standards.md and all other skills use >= 80. A finding at exactly confidence 80 would be silently dropped by the security review but reported by every other review type.",
      "recommendation": "Change line 63 to 'Confidence >= 80 is always reportable' and update the confidence table range on line 189 to match. Alternatively, document the stricter threshold as an intentional security-specific override.",
      "confidence": 92,
      "verification_note": "Confirmed: line 63 reads 'Confidence >= 81 is always reportable' while review-standards.md line 45 reads 'Only report findings with confidence >= 80'. All other skills use >= 80."
    },
    {
      "file": ".claude/plugins/code-steward-reviews/skills/security-review/SKILL.md",
      "line": 1,
      "end_line": 442,
      "severity": "high",
      "category": "pattern_conformance",
      "source_reviews": ["architecture", "standard"],
      "description": "Security review skill is missing three structural sections present in most or all sibling skills: 'Review Scope' (PR vs ad-hoc guidance), 'Boundary with Other Review Types' (cross-domain finding handling), and 'Tone & Approach' (constructive feedback guidance). The missing Review Scope section is most impactful -- agents executing the skill in ad-hoc mode have no guidance on how to adapt analysis.",
      "recommendation": "Add Review Scope, Boundary, and Tone sections following the templates established by standard-review/SKILL.md.",
      "confidence": 90,
      "verification_note": "Confirmed: grepped all SKILL.md files for 'Review Scope', 'Boundary', and 'Tone' headings. Security-review contains none. Standard-review, architecture-review, test-coverage-review, and silent-failure-review contain all three (or equivalents)."
    },
    {
      "file": ".claude/plugins/code-steward-reviews/skills/standard-review/SKILL.md",
      "line": 256,
      "end_line": 257,
      "severity": "medium",
      "category": "convention_violation",
      "source_reviews": ["standard"],
      "description": "The 71-80 confidence range is handled inconsistently across the skill ecosystem. Standard-review (line 256) says 'DO NOT report' while review-standards.md (line 42) says 'Report only if impact is significant'. Security-review (line 189) says 'Report only if severity is Critical or High'. Six different interpretations exist across the 6 review skills plus the parent standard.",
      "recommendation": "Either standardize the 71-80 range handling across all skills to match review-standards.md, or add a note to review-standards.md acknowledging that individual skills may override this range for domain-specific reasons.",
      "confidence": 88,
      "verification_note": "Confirmed by reading confidence scoring sections across all 6 review skills and review-standards.md. Six distinct approaches to the 71-80 range verified."
    },
    {
      "file": ".claude/plugins/code-steward-reviews/skills/security-review/SKILL.md",
      "line": 3,
      "end_line": 3,
      "severity": "medium",
      "category": "pattern_conformance",
      "source_reviews": ["architecture"],
      "description": "Security-review uses inline quoted string for frontmatter description while all other skills (standard-review, architecture-review, performance-review, test-coverage-review, silent-failure-review) use YAML block scalar syntax (>- or >). The inline format produces a dense single line that is harder to read and edit.",
      "recommendation": "Reformat the security-review frontmatter description to use >- block scalar syntax, matching the convention established by all sibling skills.",
      "confidence": 85,
      "verification_note": "Confirmed by reading frontmatter of both reviewed files and all sibling skills. Security-review is the sole outlier using inline quoted string format."
    },
    {
      "file": ".claude/plugins/code-steward-reviews/skills/security-review/SKILL.md",
      "line": 185,
      "end_line": 190,
      "severity": "medium",
      "category": "convention_violation",
      "source_reviews": ["standard"],
      "description": "Confidence scoring table uses bold formatting in the Meaning column (e.g., '**Certain**') not used by other skills' tables. Performance-review uses a 3-row table (collapsing 71-80 into 0-79) while all others use 4 rows. Minor cosmetic inconsistency that makes cross-cutting table updates harder.",
      "recommendation": "Standardize table format across all skills to the 4-row non-bold style used by standard-review, architecture-review, and the parent review-standards.md.",
      "confidence": 82,
      "verification_note": "Confirmed by comparing table markup in both reviewed files and all sibling skills."
    },
    {
      "file": ".claude/plugins/code-steward-reviews/skills/security-review/SKILL.md",
      "line": 411,
      "end_line": 442,
      "severity": "medium",
      "category": "pattern_conformance",
      "source_reviews": ["architecture"],
      "description": "The security-review handles the 'no findings' case as a separate top-level section ('## If No Vulnerabilities Are Found') while the standard-review handles it inline within the Output Format section. Both approaches work, but the separate section approach adds a second '## Security Review Summary' heading (line 416) that could confuse agents parsing the skill definition -- it looks like a duplicate of the output template heading on line 334.",
      "recommendation": "Consider folding the 'no findings' guidance into the Output Format section (after the main template), following the standard-review's approach. This eliminates the duplicate heading and keeps all output format guidance in one place.",
      "confidence": 82,
      "verification_note": "Confirmed: security-review has two '## Security Review Summary' headings (lines 334 and 416). The first is inside a code fence (part of the output template), the second is inside another code fence in the 'no findings' section. While both are inside fences, an agent scanning for section structure could misinterpret them."
    }
  ],
  "rejections": [
    {
      "source_review": "performance",
      "original_file": ".claude/plugins/code-steward-reviews/skills/security-review/SKILL.md",
      "original_line": 216,
      "original_description": "23-item exclusion list could cause performance overhead during sequential evaluation",
      "rejection_reason": "LLMs process structured lists holistically, not via sequential iteration. No measurable performance impact on review execution. The exclusion list is read-and-internalized, not iterated programmatically."
    }
  ],
  "merges": [
    {
      "merged_source": "standard",
      "merged_file": ".claude/plugins/code-steward-reviews/skills/security-review/SKILL.md",
      "merged_line": 1,
      "into_source": "architecture",
      "into_file": ".claude/plugins/code-steward-reviews/skills/security-review/SKILL.md",
      "into_line": 1,
      "reason": "Standard review flagged missing 'Review Scope' section; architecture review flagged missing 'Review Scope', 'Boundary', and 'Tone' sections as a pattern conformance issue. Architecture finding is broader and subsumes the standard finding."
    }
  ],
  "adjustments": [
    {
      "source_review": "standard",
      "file": ".claude/plugins/code-steward-reviews/skills/security-review/SKILL.md",
      "line": 63,
      "field_changed": "severity",
      "original_value": "medium",
      "new_value": "high",
      "reason": "The >= 81 vs >= 80 discrepancy creates a 1-point dead zone where findings at exactly 80 are silently dropped. In the context of the full-code-review orchestrator and review-synthesis verification step (both of which assume >= 80), this is a behavioral inconsistency that could cause silent disagreements, not just a cosmetic issue."
    },
    {
      "source_review": "architecture",
      "file": "Both files (scorecard)",
      "line": 0,
      "field_changed": "scorecard.coupling_cohesion",
      "original_value": "7",
      "new_value": "6",
      "reason": "Security review's missing structural sections represent a meaningful gap in the shared ecosystem contract. The full-code-review orchestrator and review-synthesis skill both assume structural consistency across review skills."
    }
  ],
  "summary": {
    "total_findings": 6,
    "critical": 0,
    "high": 2,
    "medium": 4,
    "files_reviewed": 2
  }
}
```
