// Mock data for the Code Steward demo

export interface Repo {
  id: string;
  name: string;
  org: string;
  remoteUrl: string;
  localPath: string;
  defaultBranch: string;
  lastReviewDate: string | null;
  lastRefreshedAt: string | null;
  lastDocGeneratedAt: string | null;
  lastDocCommitHash: string | null;
  docOutputPath: string;
  createdAt: string;
  openPRCount: number | null; // null = loading
  syncStatus: "up-to-date" | "behind" | "loading" | "error";
}

export interface PR {
  number: number;
  title: string;
  author: string;
  branch: string;
  baseBranch: string;
  status: "open" | "draft";
  createdAt: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  csReviewStatus: "not-reviewed" | "in-progress" | "complete";
  ghReviewStatus: "pending" | "approved" | "changes-requested";
  newComments: number;
}

export interface ReviewResult {
  id: string;
  type: string;
  model: string;
  status: "running" | "complete" | "error";
  markdown: string;
  costUsd: number;
  annotations: FileAnnotation[];
}

export interface FileAnnotation {
  filePath: string;
  lineNumber: number;
  comment: string;
  severity: "critical" | "major" | "minor" | "info";
}

export interface CodeScan {
  id: string;
  scanType: string;
  description: string;
  icon: string;
}

export interface RepoNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface RepoTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

// ─── Repos ───

export const repos: Repo[] = [
  {
    id: "1",
    name: "payment-service",
    org: "acme",
    remoteUrl: "https://github.com/acme/payment-service",
    localPath: "/repos/acme/payment-service",
    defaultBranch: "main",
    lastReviewDate: "2026-03-13T14:30:00Z",
    lastRefreshedAt: "2026-03-15T08:00:00Z",
    lastDocGeneratedAt: "2026-03-01T10:00:00Z",
    lastDocCommitHash: "a1b2c3d",
    docOutputPath: "docs/wiki",
    createdAt: "2026-01-15T09:00:00Z",
    openPRCount: 5,
    syncStatus: "up-to-date",
  },
  {
    id: "2",
    name: "auth-gateway",
    org: "acme",
    remoteUrl: "https://github.com/acme/auth-gateway",
    localPath: "/repos/acme/auth-gateway",
    defaultBranch: "main",
    lastReviewDate: "2026-03-10T16:45:00Z",
    lastRefreshedAt: "2026-03-14T12:00:00Z",
    lastDocGeneratedAt: null,
    lastDocCommitHash: null,
    docOutputPath: "docs/wiki",
    createdAt: "2026-02-01T09:00:00Z",
    openPRCount: 3,
    syncStatus: "behind",
  },
  {
    id: "3",
    name: "web-dashboard",
    org: "acme",
    remoteUrl: "https://github.com/acme/web-dashboard",
    localPath: "/repos/acme/web-dashboard",
    defaultBranch: "main",
    lastReviewDate: "2026-03-14T09:15:00Z",
    lastRefreshedAt: "2026-03-15T08:00:00Z",
    lastDocGeneratedAt: "2026-03-12T15:00:00Z",
    lastDocCommitHash: "e4f5g6h",
    docOutputPath: "docs/wiki",
    createdAt: "2026-01-20T09:00:00Z",
    openPRCount: 8,
    syncStatus: "up-to-date",
  },
  {
    id: "4",
    name: "data-pipeline",
    org: "acme",
    remoteUrl: "https://github.com/acme/data-pipeline",
    localPath: "/repos/acme/data-pipeline",
    defaultBranch: "main",
    lastReviewDate: "2026-02-28T11:00:00Z",
    lastRefreshedAt: "2026-03-10T08:00:00Z",
    lastDocGeneratedAt: null,
    lastDocCommitHash: null,
    docOutputPath: "docs/wiki",
    createdAt: "2026-02-10T09:00:00Z",
    openPRCount: 1,
    syncStatus: "behind",
  },
  {
    id: "5",
    name: "mobile-api",
    org: "acme",
    remoteUrl: "https://github.com/acme/mobile-api",
    localPath: "/repos/acme/mobile-api",
    defaultBranch: "main",
    lastReviewDate: null,
    lastRefreshedAt: "2026-03-15T08:00:00Z",
    lastDocGeneratedAt: null,
    lastDocCommitHash: null,
    docOutputPath: "docs/wiki",
    createdAt: "2026-03-05T09:00:00Z",
    openPRCount: 0,
    syncStatus: "up-to-date",
  },
  {
    id: "6",
    name: "notification-hub",
    org: "acme",
    remoteUrl: "https://github.com/acme/notification-hub",
    localPath: "/repos/acme/notification-hub",
    defaultBranch: "develop",
    lastReviewDate: "2026-03-11T08:20:00Z",
    lastRefreshedAt: "2026-03-13T16:00:00Z",
    lastDocGeneratedAt: "2026-02-20T10:00:00Z",
    lastDocCommitHash: "i7j8k9l",
    docOutputPath: "docs/wiki",
    createdAt: "2026-01-25T09:00:00Z",
    openPRCount: 2,
    syncStatus: "up-to-date",
  },
];

// ─── PRs for payment-service ───

export const paymentServicePRs: PR[] = [
  {
    number: 142,
    title: "Add Stripe webhook retry logic with exponential backoff",
    author: "sarah-chen",
    branch: "feat/webhook-retry",
    baseBranch: "main",
    status: "open",
    createdAt: "2026-03-14T10:30:00Z",
    filesChanged: 7,
    additions: 284,
    deletions: 42,
    csReviewStatus: "not-reviewed",
    ghReviewStatus: "pending",
    newComments: 0,
  },
  {
    number: 139,
    title: "Refactor payment validation middleware",
    author: "marcus-j",
    branch: "refactor/validation",
    baseBranch: "main",
    status: "open",
    createdAt: "2026-03-12T14:15:00Z",
    filesChanged: 12,
    additions: 445,
    deletions: 312,
    csReviewStatus: "complete",
    ghReviewStatus: "changes-requested",
    newComments: 3,
  },
  {
    number: 137,
    title: "Fix race condition in concurrent charge processing",
    author: "alex-kim",
    branch: "fix/race-condition",
    baseBranch: "main",
    status: "open",
    createdAt: "2026-03-11T09:00:00Z",
    filesChanged: 4,
    additions: 89,
    deletions: 23,
    csReviewStatus: "in-progress",
    ghReviewStatus: "pending",
    newComments: 0,
  },
  {
    number: 135,
    title: "Update Stripe SDK to v3.2 and migrate deprecated methods",
    author: "sarah-chen",
    branch: "chore/stripe-v3.2",
    baseBranch: "main",
    status: "open",
    createdAt: "2026-03-10T16:00:00Z",
    filesChanged: 18,
    additions: 156,
    deletions: 198,
    csReviewStatus: "not-reviewed",
    ghReviewStatus: "pending",
    newComments: 0,
  },
  {
    number: 131,
    title: "Add PCI compliance audit logging",
    author: "dev-ops-pat",
    branch: "feat/pci-logging",
    baseBranch: "main",
    status: "draft",
    createdAt: "2026-03-08T11:30:00Z",
    filesChanged: 9,
    additions: 367,
    deletions: 15,
    csReviewStatus: "not-reviewed",
    ghReviewStatus: "pending",
    newComments: 1,
  },
];

// ─── Review results for PR #139 ───

export const pr139Reviews: ReviewResult[] = [
  {
    id: "rev-1",
    type: "Standard Code Review",
    model: "claude-sonnet-4-6",
    status: "complete",
    costUsd: 0.12,
    annotations: [
      {
        filePath: "src/middleware/validation.ts",
        lineNumber: 45,
        comment:
          "The validation chain doesn't handle the case where `amount` is zero. While zero-amount transactions are rare, they're valid for auth-only captures.",
        severity: "major",
      },
      {
        filePath: "src/middleware/validation.ts",
        lineNumber: 112,
        comment:
          "Consider extracting this regex into a named constant. The pattern is complex enough that a descriptive name would aid readability.",
        severity: "minor",
      },
      {
        filePath: "src/types/payment.ts",
        lineNumber: 28,
        comment:
          "The `PaymentStatus` enum now has 8 values. Consider whether `PARTIALLY_REFUNDED` and `REFUND_PENDING` could be modeled as a separate `RefundStatus` to keep payment lifecycle states distinct from refund lifecycle states.",
        severity: "info",
      },
    ],
    markdown: `## Standard Code Review — PR #139

### Summary
This PR refactors the payment validation middleware from a monolithic function into a composable chain-of-responsibility pattern. The architectural improvement is sound and will make the validation logic significantly more testable and extensible.

### Key Findings

**Architecture** — The chain pattern is well-implemented. Each validator is a standalone function that can be tested independently. The composition in \`createValidationPipeline()\` is clean.

**Edge Cases** — Zero-amount transactions are not handled by the new validation chain. The old monolithic function had an implicit pass-through for \`amount === 0\`, but the new \`AmountValidator\` rejects it as invalid. This will break auth-only capture flows.

**Type Safety** — The new \`PaymentStatus\` enum is growing. Consider splitting refund states into a separate enum to maintain clear lifecycle boundaries.

**Test Coverage** — New validators have good unit test coverage. Integration tests for the full pipeline are missing — recommend adding tests that exercise the complete chain with realistic payment scenarios.

### Files Reviewed
| File | Status |
|------|--------|
| \`src/middleware/validation.ts\` | Major refactor — needs attention |
| \`src/middleware/validators/\` | New files — well structured |
| \`src/types/payment.ts\` | Type changes — review enum growth |
| \`tests/validation.test.ts\` | Good coverage, missing integration |`,
  },
  {
    id: "rev-2",
    type: "Security Review",
    model: "claude-sonnet-4-6",
    status: "complete",
    costUsd: 0.09,
    annotations: [
      {
        filePath: "src/middleware/validators/card-validator.ts",
        lineNumber: 34,
        comment:
          "Card number is logged in the validation error path. Even though it's partial, PCI DSS prohibits logging any portion of the PAN in plaintext. Use a masked format.",
        severity: "critical",
      },
    ],
    markdown: `## Security Review — PR #139

### Summary
One critical PCI compliance issue found. The card validation error path logs a partial card number in plaintext, which violates PCI DSS Requirement 3.4.

### Critical Finding

**PAN Logging Violation** — \`card-validator.ts:34\` logs the first 6 digits of the card number when validation fails. PCI DSS requires that no portion of the PAN be stored or logged in plaintext. This must be masked before merge.

### Other Observations
- Input sanitization is properly applied before validation
- No SQL injection vectors in the refactored code
- API rate limiting is unchanged and adequate
- Error messages don't leak internal implementation details`,
  },
  {
    id: "rev-3",
    type: "Performance Review",
    model: "claude-haiku-4-5",
    status: "complete",
    costUsd: 0.03,
    annotations: [
      {
        filePath: "src/middleware/validation.ts",
        lineNumber: 78,
        comment:
          "The validation pipeline creates new validator instances on every request. Consider caching the pipeline instance since validators are stateless.",
        severity: "minor",
      },
    ],
    markdown: `## Performance Review — PR #139

### Summary
No significant performance concerns. The refactored validation adds minimal overhead compared to the monolithic approach.

### Observations
- Validator instantiation per-request is technically unnecessary (validators are stateless) but the overhead is negligible (~0.01ms)
- The chain pattern adds one function call per validator vs the previous if/else chain — no measurable impact
- No new database queries or external API calls introduced
- Memory allocation pattern is unchanged`,
  },
];

// ─── Synthesis for PR #139 ───

export const pr139Synthesis = `## Consolidated Review — PR #139: Refactor Payment Validation Middleware

### Executive Summary
The refactoring from monolithic validation to a chain-of-responsibility pattern is architecturally sound and improves testability. **One critical issue must be resolved before merge:** PCI compliance violation in card number logging.

### Action Items (by priority)

| Priority | Issue | File | Action |
|----------|-------|------|--------|
| **CRITICAL** | PAN logging violation | \`card-validator.ts:34\` | Mask card number in error logs immediately |
| **Major** | Zero-amount transactions rejected | \`validation.ts:45\` | Add pass-through for auth-only captures |
| **Minor** | Enum growth in PaymentStatus | \`payment.ts:28\` | Consider splitting refund states |
| **Minor** | Pipeline instantiation | \`validation.ts:78\` | Cache stateless validator pipeline |

### Recommendation
**Request Changes** — The PCI violation is a blocker. The zero-amount edge case should also be addressed before merge. The remaining items are suggestions for follow-up.

### Cost Summary
| Review | Model | Cost |
|--------|-------|------|
| Standard | Sonnet 4.6 | $0.12 |
| Security | Sonnet 4.6 | $0.09 |
| Performance | Haiku 4.5 | $0.03 |
| Synthesis | Opus 4.6 | $0.18 |
| **Total** | | **$0.42** |`;

// ─── Scan types ───

export const scanTypes: CodeScan[] = [
  {
    id: "security",
    scanType: "Security Scan",
    description:
      "Analyze the codebase for security vulnerabilities, injection risks, auth issues, and OWASP Top 10 concerns.",
    icon: "Shield",
  },
  {
    id: "tech-debt",
    scanType: "Technical Debt",
    description:
      "Identify areas of technical debt: code duplication, complexity hotspots, deprecated patterns, and maintainability issues.",
    icon: "Wrench",
  },
  {
    id: "doc-quality",
    scanType: "Documentation Quality",
    description:
      "Assess inline documentation coverage, API documentation completeness, and README accuracy.",
    icon: "FileText",
  },
  {
    id: "code-quality",
    scanType: "Code Quality",
    description:
      "Review code style consistency, naming conventions, error handling patterns, and architectural adherence.",
    icon: "Code",
  },
  {
    id: "performance",
    scanType: "Performance",
    description:
      "Identify N+1 queries, memory leaks, unnecessary re-renders, blocking operations, and optimization opportunities.",
    icon: "Zap",
  },
];

// ─── Notes & Tasks for payment-service ───

export const paymentServiceNotes: RepoNote[] = [
  {
    id: "note-1",
    content:
      "Need to refactor the payment retry module before Q3. The current implementation has a hard-coded 3-retry limit that doesn't account for idempotency keys properly. Talk to Sarah about her webhook retry PR — it might address some of this.",
    createdAt: "2026-03-10T14:00:00Z",
    updatedAt: "2026-03-13T09:00:00Z",
  },
  {
    id: "note-2",
    content:
      "PCI audit scheduled for April. Need to ensure all card data handling follows DSS 4.0 requirements. The security scan flagged the card-validator logging issue — make sure that's resolved.",
    createdAt: "2026-03-05T10:00:00Z",
    updatedAt: "2026-03-05T10:00:00Z",
  },
];

export const paymentServiceTasks: RepoTask[] = [
  {
    id: "task-1",
    text: "Review and merge Stripe webhook retry PR (#142)",
    completed: false,
    createdAt: "2026-03-14T11:00:00Z",
  },
  {
    id: "task-2",
    text: "Schedule PCI compliance review with security team",
    completed: false,
    createdAt: "2026-03-10T14:30:00Z",
  },
  {
    id: "task-3",
    text: "Update payment service documentation wiki",
    completed: false,
    createdAt: "2026-03-08T09:00:00Z",
  },
  {
    id: "task-4",
    text: "Fix race condition in concurrent charges (PR #137)",
    completed: true,
    createdAt: "2026-03-06T10:00:00Z",
  },
];

// ─── Review history for insights ───

export const reviewHistory = [
  {
    id: "rh-1",
    date: "2026-03-13",
    type: "PR Review" as const,
    target: "PR #139 — Refactor payment validation middleware",
    reviewTypes: ["Standard", "Security", "Performance"],
    cost: 0.42,
  },
  {
    id: "rh-2",
    date: "2026-03-10",
    type: "PR Review" as const,
    target: "PR #135 — Update Stripe SDK to v3.2",
    reviewTypes: ["Standard"],
    cost: 0.08,
  },
  {
    id: "rh-3",
    date: "2026-03-05",
    type: "Scan" as const,
    target: "Security Scan — full codebase",
    reviewTypes: ["Security"],
    cost: 1.24,
  },
  {
    id: "rh-4",
    date: "2026-02-28",
    type: "PR Review" as const,
    target: "PR #128 — Add multi-currency support",
    reviewTypes: ["Standard", "Performance"],
    cost: 0.31,
  },
  {
    id: "rh-5",
    date: "2026-02-20",
    type: "Scan" as const,
    target: "Technical Debt — full codebase",
    reviewTypes: ["Technical Debt"],
    cost: 0.95,
  },
];

// ─── Utility ───

export function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date("2026-03-15T10:00:00Z"); // Fixed for demo
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function getRepoById(id: string): Repo | undefined {
  return repos.find((r) => r.id === id);
}
