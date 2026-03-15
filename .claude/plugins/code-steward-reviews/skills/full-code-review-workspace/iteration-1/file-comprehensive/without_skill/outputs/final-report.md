# Comprehensive Review: standard-review and security-review Skills

## Executive Summary

The standard-review and security-review SKILL.md files are remarkably well-written LLM instruction documents. They demonstrate a high level of craft in prompt engineering: thorough methodology, aggressive false-positive filtering, calibrated confidence scoring with concrete examples, and carefully defined boundaries between review types. The output schemas are well-designed for both human and machine consumption.

That said, this review identified several issues across the two files, ranging from inconsistencies with the parent `review-standards.md` contract to subtle schema incompatibilities with the downstream synthesis skill, and a few places where the instructions are ambiguous or create edge cases that could degrade review quality.

The review is organized into eight dimensions. Findings are severity-tagged as **Critical** (will cause incorrect behavior or broken integration), **High** (significant quality or consistency issue), or **Medium** (real improvement opportunity, not urgent).

---

## 1. Correctness and Internal Consistency

### 1.1 Confidence Threshold Discrepancy Between Standard and Security Reviews

**Severity: High**

The two skills define different confidence thresholds for reporting, and both deviate from `review-standards.md` in different ways.

**`review-standards.md` (the parent standard):**
- 91-100: Always report
- 81-90: Always report
- 71-80: Report only if impact is significant
- 0-70: DO NOT REPORT
- States: "Only report findings with confidence >= 80."

**`standard-review/SKILL.md` (lines 256-258):**
- 91-100: Always report
- 81-90: Always report
- 71-80: DO NOT report
- 0-70: DO NOT report
- States: "Only report findings with confidence >= 80."

**`security-review/SKILL.md` (lines 185-191):**
- 91-100: Always report
- 81-90: Always report
- 71-80: Report only if severity is Critical or High
- 0-70: DO NOT REPORT

The parent standard says 71-80 can be reported "if impact is significant." The standard review *narrows* this to "never report 71-80" while the security review *redefines* it as "report if severity is Critical or High." These are three different policies for the same threshold band.

This is a design decision that may be intentional (each skill calibrates differently), but it creates a problem for the synthesis skill. The synthesis skill (`review-synthesis/SKILL.md`, line 143) applies a blanket rule: "If the adjusted confidence drops below 80, reject the finding." This means any security finding reported in the 71-80 band (permitted by the security skill) will be automatically rejected by synthesis. The security skill is telling reviewers to report findings that the downstream consumer will systematically discard.

**Recommendation:** Either align the security skill's threshold with the synthesis skill's 80-minimum rule (removing the 71-80 exception), or update the synthesis skill to respect review-type-specific thresholds. The current state creates findings that are born to be rejected.

### 1.2 Standard Review Excludes Its Own "Report Moderate Confidence" Policy

**Severity: Medium**

The standard review's confidence table (lines 256-258) says 71-80 is "DO NOT report," but `review-standards.md` line 43 says 71-80 is "Report only if impact is significant." The standard review has silently narrowed the parent standard without acknowledging the deviation. This is arguably the right call (the standard review covers broad territory where moderate-confidence findings are likely noise), but the deviation from the parent standard should be explicit, either by noting it in the skill or by updating the parent standard to say "individual skills may narrow this range."

---

## 2. Cross-Skill Consistency

### 2.1 Boundary Table Asymmetry

**Severity: Medium**

The standard review's boundary table (lines 386-393) lists five other review types it defers to: Security, Performance, Architecture, Test Coverage, and Silent Failure. It instructs the reviewer to "format these brief notes as regular findings in the output" with a note to see the specialized review.

The security review has *no boundary table at all*. It does not address what to do when it notices non-security issues (e.g., a performance problem, an architectural concern, or a logic bug). The architecture review and performance review both have boundary tables. This is an omission in the security review.

**Recommendation:** Add a boundary table to the security review similar to the one in the standard review, instructing the security reviewer to briefly note non-security issues (logic bugs, performance concerns, architectural problems) with a deferral note, rather than either ignoring them or reporting them as security findings.

### 2.2 The Standard Review Says Cross-Domain Notes Go in the JSON; Architecture Review Says They Don't

**Severity: High**

The standard review (lines 394-398) says cross-domain boundary notes should be "regular findings in the output" and explicitly states they should be formatted as findings that "still need to meet the confidence threshold." This means they would appear in the JSON `findings` array.

The architecture review (lines 398-402) takes the opposite stance: "If you do notice a cross-domain issue, mention it in the summary paragraph -- do not create a finding entry for it in the JSON `findings` array."

This inconsistency means the synthesis skill will receive cross-domain findings from some review types but not others, with no way to distinguish them structurally. For the standard review specifically, cross-domain notes will be mixed in with actual standard-review findings in the JSON, making it harder for the synthesis skill to properly route or deduplicate them.

**Recommendation:** Pick one approach and apply it consistently. The architecture review's approach (summary mention only, no JSON finding) is cleaner because it avoids polluting the structured data with findings that are explicitly deferred to another review type. Alternatively, if cross-domain findings should appear in JSON, add a `"deferred_to"` field to the finding schema so the synthesis skill can handle them appropriately.

### 2.3 Output Schema Field Discrepancies

**Severity: High**

The security review's JSON schema (lines 366-389) includes fields that are not present in the standard review's schema (lines 471-494), and vice versa. This is expected for review-type-specific fields, but there are inconsistencies in *shared* fields:

- The security review's JSON finding includes `exploit_scenario` and `cwe` -- these are security-specific and correctly absent from the standard review. Good.
- The standard review's JSON finding does NOT include `exploit_scenario` but the security review REQUIRES it (line 402: "Every finding MUST include the `exploit_scenario` field").
- Both schemas share `file`, `line`, `end_line`, `severity`, `category`, `description`, `recommendation`, `confidence` -- these are consistent.

The issue is that the **synthesis skill expects** `exploit_scenario` and `cwe` to be present on security findings (synthesis skill line 402-403: "Review-type-specific fields... are PRESERVED from source findings when present"). If the security review omits `exploit_scenario` on a finding (despite the MUST requirement), the synthesis output will have an incomplete finding. This is well-handled by the security skill's explicit MUST, but the *standard review's* cross-domain security notes (which go into findings per section 2.2 above) would NOT have `exploit_scenario`, creating an inconsistency for findings categorized under `cross_domain` that reference security issues.

**Recommendation:** If cross-domain security notes from the standard review enter the JSON findings array, they should either (a) not use security-specific categories, or (b) include the security-specific fields. The cleaner fix is to adopt the architecture review's approach and keep cross-domain notes out of the JSON entirely.

---

## 3. Completeness

### 3.1 Missing "Ad-Hoc Review" Guidance for Context Research

**Severity: Medium**

Both skills describe two contexts in their "Review Scope" section: PR/diff review and ad-hoc codebase review. However, the Phase 1 context research instructions in both skills are implicitly written for the PR/diff scenario. For example:

- Standard review Phase 1, step 3 (line 49): "For PR reviews, read the PR description and commit messages... For ad-hoc reviews, look at the surrounding code to understand the module's purpose."
- Security review Phase 1 (lines 28-39): "Before examining the changes, understand the security posture..." -- uses "changes" language throughout, which is PR-centric.

The ad-hoc case is acknowledged but under-specified. When reviewing an entire module as-is (not a diff), what constitutes "the surrounding code"? How deep should context research go? The standard review gives one sentence on this; the security review gives none.

**Recommendation:** Add a brief paragraph to each skill's Phase 1 that specifically addresses the ad-hoc context: what to read, how to scope the analysis, and how to prioritize (since reviewing an entire codebase is unbounded without guidance).

### 3.2 No Guidance on Handling Monorepo or Multi-Language Projects

**Severity: Medium**

Neither skill addresses what happens when the code under review spans multiple languages or frameworks. The security review (line 36) says to "Note the language, framework, and runtime (these determine which vulnerability classes are relevant)," but what if the diff includes Python backend code and TypeScript frontend code? The vulnerability classes differ, the conventions differ, and the approach differs.

This is a real scenario in monorepo projects and is not addressed.

**Recommendation:** Add a brief note acknowledging multi-language changes and instructing the reviewer to evaluate each language segment against its own conventions and vulnerability profile.

### 3.3 Security Review Missing "Tone & Approach" Section

**Severity: Medium**

The standard review has a "Tone & Approach" section (lines 401-420) with guidance on being constructive, specific, acknowledging good code, and being proportionate. The architecture review, silent-failure review, test-coverage review, and performance review all have analogous sections.

The security review has no "Tone & Approach" section at all. Security review findings can be particularly sensitive -- telling someone their code has a vulnerability can feel confrontational. The absence of tone guidance is a gap, especially given the "think like an attacker" framing that could lead to adversarial-sounding language.

**Recommendation:** Add a "Tone & Approach" section to the security review that addresses the unique dynamics of security feedback: be precise about the exploit without being alarmist, focus on the code path rather than the developer, and acknowledge good security practices in the Positive Observations section.

---

## 4. Output Schema Correctness

### 4.1 `cross_domain` Category Only Defined in Standard Review

**Severity: Medium**

The standard review defines `cross_domain` as a valid category value (line 505): "Brief notes on issues better covered by another review type (security, performance, architecture, etc.)."

The security review does not define `cross_domain` as a valid category, and its category list (lines 392-398) only includes security-specific categories. If the security review were to notice a non-security issue (a logic bug, a performance concern), it has no category for it and no instructions on how to report it (see section 2.1 above).

This is consistent with the security review's omission of a boundary table -- the skill simply doesn't contemplate reporting non-security issues. But it means the security reviewer will either (a) silently ignore non-security issues, (b) shoehorn them into a security category, or (c) include them without a valid category. None of these outcomes is ideal.

### 4.2 The `summary.files_reviewed` Field Has No Definition

**Severity: Medium**

Both skills include `files_reviewed` in the JSON summary block (standard review line 492, security review line 387). Neither skill defines how to count this number. Is it the number of files in the diff? The number of files the reviewer actually read (which could include context files from Phase 1)? The number of files that have findings?

The synthesis skill uses this field in its output but also does not define it. This ambiguity means different review runs will count files differently, making the metric unreliable for tracking.

**Recommendation:** Add a brief definition. Suggested: "The number of files in the review scope (changed files for PR/diff reviews, specified files for ad-hoc reviews). Do not count files read only for context research."

---

## 5. Prompt Engineering Quality

### 5.1 The Security Review's Exclusion List is a Strength

**Severity: N/A (Positive Observation)**

The security review's exclusion list (lines 219-276) and false positive precedents (lines 278-323) are exceptionally well-crafted. They address the most common false positive patterns in LLM security reviews with specific, actionable guidance. Items like "Random UUIDs (v4) are unguessable" (line 285), "Framework XSS protection" (line 293), "Client-side auth is not security" (line 296), and "ORMs prevent SQL injection" (line 298) directly target the failure modes that make LLM security reviews unreliable in practice.

This is one of the strongest sections across all the skill files.

### 5.2 The Standard Review's Phase 2 Examples Are Effective

**Severity: N/A (Positive Observation)**

The standard review's Phase 2 (lines 56-74) provides concrete examples of what comparative analysis looks like in practice (the `Result<T, E>` pattern example, the `formatCurrency()` example). These ground the abstract methodology in specific, recognizable scenarios that help the LLM understand the intent.

### 5.3 The "Could I Write a Failing Test for This?" Calibration Heuristic

**Severity: N/A (Positive Observation)**

The standard review's confidence calibration section (lines 268-281) includes the question "Could I write a failing test for this?" as a confidence booster. This is an excellent heuristic that directly ties confidence to concrete verifiability. It encourages the reviewer to think in terms of demonstrable behavior rather than abstract concern.

### 5.4 Ambiguity in "Basic Error Handling" vs. "Silent Failure Review"

**Severity: Medium**

The standard review's Error Handling focus area (lines 169-190) says it covers "the most impactful gaps" and that this "is not an exhaustive error-handling audit (that's the Silent Failure review's job)." However, the boundary between "most impactful gaps" and "exhaustive audit" is not crisp.

For example, the standard review says to flag "Silent swallowing of errors -- Empty catch blocks, or catch blocks that log but don't propagate" (lines 179-181). The silent failure review also flags "Empty catch blocks" and "Catch blocks that only log and continue" (lines 217-224). These are literally the same things described in the same terms.

An LLM running the standard review will flag empty catch blocks. An LLM running the silent failure review will also flag them. The synthesis skill will then need to deduplicate them. This is not necessarily wrong (the synthesis skill is designed to deduplicate), but the near-identical language means the findings will be extremely similar, creating unnecessary work for the synthesis step.

**Recommendation:** Sharpen the boundary. The standard review could focus on *missing* error handling (operations that should have error handling but don't), while the silent failure review focuses on *inadequate* error handling (operations that have error handling but it's insufficient). Alternatively, the standard review could limit its error handling section to only flag empty catch blocks and unhandled promises, deferring everything else to silent failure.

### 5.5 Security Review's Phase 3 Filter #2 Creates a Contradiction

**Severity: High**

The security review's Phase 3 (lines 59-69) defines four filters every candidate finding must pass. Filter #2 states:

> "Does it meet the confidence threshold? Confidence >= 81 is always reportable. Confidence 71-80 is only reportable if the severity would be Critical or High. Below 71, drop it regardless."

But the confidence scoring table (lines 185-191) says:

> 91-100: Always report
> 81-90: Always report
> 71-80: Report only if severity is Critical or High
> 0-70: DO NOT REPORT

These are consistent with each other -- but filter #2 says ">= 81 is always reportable," while the table says "91-100" and "81-90" as separate bands that are both "always report." The filter text uses >= 81 as the threshold, but the actual minimum in the "always report" band is 81, not 80.

The subtle issue: the `review-standards.md` parent says "Only report findings with confidence >= 80." The security review's filter uses >= 81 as the "always reportable" threshold, effectively shifting the minimum by 1 point. This is likely unintentional -- a finding at exactly confidence 80 is reportable under the parent standard but falls into the "71-80" band in the security review, where it would only be reported if Critical or High severity. Under the parent standard, it would always be reported.

**Recommendation:** Align the threshold to >= 80 for "always reportable" and 70-79 for the conditional band, matching the parent standard's explicit >= 80 rule.

---

## 6. Architecture and Design

### 6.1 The Three-Phase Methodology is Well-Structured

**Severity: N/A (Positive Observation)**

Both skills implement the three-phase methodology (Context Research, Comparative Analysis, Issue Assessment) mandated by `review-standards.md`. This shared structure creates consistency across review types and ensures context is always gathered before judgment is rendered. The phases build on each other logically, and the instruction to "do not skip ahead" is appropriate for preventing the common LLM failure mode of jumping to conclusions.

### 6.2 Duplication of Parent Standards Within Each Skill

**Severity: Medium**

Both the standard review and security review redefine concepts that are already defined in `review-standards.md`: confidence scoring tables, severity level definitions, the three-phase methodology, universal exclusions, and output format requirements. In some cases these are customized (severity definitions adapted to the review type, which is correct), but in other cases they are near-verbatim copies.

For example, the confidence scoring table is defined in `review-standards.md` (lines 38-43), then re-stated in the standard review (lines 251-258) and the security review (lines 185-191) with slight variations (see section 1.1). The universal exclusions are listed in `review-standards.md` (lines 155-169), then partially or fully re-listed in each skill.

This duplication creates drift risk -- when the parent standard is updated, each skill must be separately updated to match. The variations documented in section 1.1 may already be evidence of this drift.

**Recommendation:** This is a structural tradeoff. Each skill file needs to be self-contained because it's the entire instruction set given to the LLM at review time (the LLM doesn't separately receive `review-standards.md`). If that's the case, the duplication is necessary. But if the Claude plugin framework supports composing multiple files into a single prompt, the shared standards should be factored out and injected rather than copy-pasted. If self-containment is required, consider adding a comment header noting which version of the parent standard each section is derived from, to make drift detectable.

### 6.3 The Skills are Appropriately Sized

**Severity: N/A (Positive Observation)**

At ~24KB and ~22KB respectively, both skills are large but not unwieldy. They provide sufficient detail to guide an LLM through a complex task without being so long that key instructions get lost in the context window. The section structure is clean and navigable, with clear headers, tables, and examples that break up the text.

---

## 7. Edge Case Handling

### 7.1 Neither Skill Addresses Empty Diffs or No-Op Changes

**Severity: Medium**

Both skills describe PR/diff and ad-hoc contexts, but neither addresses what happens when the diff is empty or contains only trivial changes (e.g., a version bump in `package.json`, a whitespace change, or a change to a generated file). The full-code-review orchestrator handles the "no changes detected" case (lines 269-271), but the individual skills don't.

If an individual skill is invoked directly (not through the orchestrator) on an empty or trivial diff, it has no guidance on what to do. It might produce a full review of surrounding context (violating the "only flag issues in changed lines" rule) or produce an awkward report with no findings and no explanation.

**Recommendation:** Add a brief note to the Review Scope section of each skill: "If the diff is empty or contains only trivial/generated changes, produce a brief summary stating no review is warranted and emit a JSON block with empty findings."

### 7.2 Security Review Doesn't Address "No Security-Relevant Changes"

**Severity: Medium**

The security review has a "If No Vulnerabilities Are Found" section (lines 411-425) that handles the case where the review finds nothing. But it doesn't address the distinct case where the changes are not security-relevant at all (e.g., a pure CSS change, a documentation update, or a refactor of test utilities). In this case, the reviewer should arguably say "these changes do not introduce security-relevant code" rather than running through the full Phase 1-3 methodology only to find nothing.

The standard review implicitly handles this through its "Be proportionate" tone guidance (lines 418-420), but the security review lacks equivalent guidance.

**Recommendation:** Add a brief note at the start of the security review methodology: "If the changes do not touch any security-relevant code paths (no input handling, no auth, no data access, no cryptography, no external integrations), state this assessment and produce a clean report without forcing yourself through the full vulnerability assessment."

---

## 8. Maintainability

### 8.1 Hardcoded Category Lists Require Synchronized Updates

**Severity: Medium**

The standard review defines 9 valid category values (lines 496-506). The security review defines 23 valid category values (lines 392-398). These lists are hardcoded in each skill and must be kept in sync with:
- What the synthesis skill expects to consume
- What the web UI/GitHub integration can display
- What any future reporting or analytics layer aggregates on

There is no single source of truth for category values. If a category is added to one skill and not registered in the synthesis skill or the web UI, findings with that category may be silently dropped or displayed incorrectly.

**Recommendation:** Consider maintaining a shared category registry (perhaps in `review-standards.md` or a separate `categories.md`) that each skill references. This doesn't eliminate duplication in the skill files (if they need to be self-contained), but it provides a canonical reference for what categories exist and what they mean.

### 8.2 Version/Provenance Tracking

**Severity: Medium**

Neither skill file includes any version identifier, last-updated date, or indication of which version of `review-standards.md` it was derived from. Given the drift issues identified in section 1.1 and the duplication discussed in section 6.2, this makes it difficult to determine whether a particular skill is current.

**Recommendation:** Add a comment or frontmatter field indicating the skill version and the parent standards version it conforms to. Example: `standards_version: "1.0"` in the frontmatter, corresponding to a version in `review-standards.md`.

---

## Summary of Findings

| # | Severity | Section | Finding |
|---|----------|---------|---------|
| 1.1 | High | Correctness | Confidence threshold discrepancy: security review allows 71-80 findings that synthesis will systematically reject |
| 1.2 | Medium | Correctness | Standard review silently narrows parent standard's 71-80 band without acknowledgment |
| 2.1 | Medium | Cross-Skill | Security review has no boundary table for cross-domain issues |
| 2.2 | High | Cross-Skill | Standard review puts cross-domain notes in JSON findings; architecture review says don't -- inconsistent |
| 2.3 | High | Cross-Skill | Cross-domain security notes from standard review lack required `exploit_scenario` field |
| 3.1 | Medium | Completeness | Ad-hoc review context research is under-specified in both skills |
| 3.2 | Medium | Completeness | No guidance for monorepo or multi-language projects |
| 3.3 | Medium | Completeness | Security review lacks "Tone & Approach" section |
| 4.1 | Medium | Schema | `cross_domain` category only defined in standard review, not security review |
| 4.2 | Medium | Schema | `files_reviewed` field has no definition in any skill |
| 5.4 | Medium | Prompt Eng. | Overlapping error handling scope between standard and silent failure reviews |
| 5.5 | High | Prompt Eng. | Security review's >= 81 threshold shifts minimum by 1 from parent standard's >= 80 |
| 6.2 | Medium | Architecture | Duplicated parent standard content creates drift risk |
| 7.1 | Medium | Edge Cases | Neither skill addresses empty or trivial diffs |
| 7.2 | Medium | Edge Cases | Security review doesn't address non-security-relevant changes |
| 8.1 | Medium | Maintainability | Hardcoded category lists with no single source of truth |
| 8.2 | Medium | Maintainability | No version or provenance tracking in skill files |

**Totals: 4 High, 13 Medium, 0 Critical**

---

## Positive Observations

- **The false positive prevention infrastructure is best-in-class.** The security review's exclusion list (22 hard exclusions) and false positive precedents (12 entries) represent a level of care that is rare in automated review tooling. These aren't generic "best practices" -- they target specific, known failure modes of LLM-powered security reviews with concrete, actionable filtering rules.

- **The confidence scoring system with calibration examples is well-designed.** Both skills provide not just a scoring rubric but concrete calibration scenarios (e.g., "A SQL injection where user input visibly reaches a raw query: 91-100," "An eval() call where the input source is unclear: 71-80"). This grounds the abstract scoring system in recognizable situations, which is exactly what an LLM needs to apply the system consistently.

- **The "What NOT to Flag" sections are as valuable as the "What to Flag" sections.** Both skills invest significant space in defining what is *out of scope*, including nuanced exclusions like "Don't flag naming issues when the current name is merely different from what you'd prefer" (standard review) and "Crashes aren't vulnerabilities" (security review). This negative guidance is critical for preventing the LLM from generating low-value noise.

- **The output format is well-suited for a multi-consumer pipeline.** The dual output (human-readable markdown + machine-readable JSON) with clearly defined field schemas enables the synthesis skill, web UI, and GitHub integration to each consume the same output through different paths. The JSON schema is simple and flat, avoiding nested structures that would be fragile.

- **The boundary definitions between review types are thoughtful.** The standard review's boundary table (lines 386-398) cleanly divides responsibility across the six review types, preventing both gaps and overlaps. The instruction to "note it briefly but don't perform deep analysis" is the right tradeoff between completeness and focus.
