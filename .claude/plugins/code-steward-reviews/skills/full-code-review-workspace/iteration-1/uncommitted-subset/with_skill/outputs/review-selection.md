# Review Selection

## User Request

> "review my local changes, just standard and security"

## Selected Reviews

| # | Review Type | Selected | Reason |
|---|-------------|----------|--------|
| 1 | Standard | Yes | Explicitly requested by user |
| 2 | Security | Yes | Explicitly requested by user |
| 3 | Performance | No | Not requested |
| 4 | Architecture | No | Not requested |
| 5 | Test Coverage | No | Not requested |
| 6 | Silent Failure | No | Not requested |

## Selection Logic

Per Step 2 of the full-code-review orchestrator skill:

> If the user requests a subset, respect it.

The user explicitly listed "standard and security" as the review types to run. This matches the skill's table row for explicit list requests:

> | Explicit list ("security and architecture") | Exactly what they asked |

**2 review types selected: standard-review, security-review.**

## Edge Case Check

This is a small-to-moderate changeset: 4 source files, ~300 lines of new implementation code. The skill's edge case guidance for small changes says:

> Suggest a reduced review set -- "This is a small change. I'd recommend standard + security, but I can run all 6 if you want."

The user's request already aligns with the recommended reduced set for small changes. No adjustment needed.
