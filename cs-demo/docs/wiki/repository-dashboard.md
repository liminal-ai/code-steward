# Repository Dashboard

The Repository Dashboard module provides the detail pages for viewing an individual repository within the Code Steward demo app. It uses Next.js dynamic routing (`[id]`) to render repository-specific views with a shared layout and multiple sub-pages.

## Purpose

This module is the primary interface for exploring a single repository's health, documentation, activity, and review status. It comprises a shared layout shell and six feature pages.

## Components

### Layout

- **`cs-demo/app/repo/[id]/layout.tsx`** (89 LOC) — Shared layout wrapper for all repository detail pages. Likely provides navigation tabs/sidebar and common repository context.

### Pages

| Page | Path | LOC | Description |
|------|------|-----|-------------|
| Overview | `cs-demo/app/repo/[id]/page.tsx` | 6 | Landing page for a repository; likely a redirect or summary. |
| Docs | `cs-demo/app/repo/[id]/docs/page.tsx` | 328 | Documentation viewer/explorer for the repository. |
| Insights | `cs-demo/app/repo/[id]/insights/page.tsx` | 240 | Analytics and health metrics dashboard. |
| Issues | `cs-demo/app/repo/[id]/issues/page.tsx` | 24 | Issue listing for the repository. |
| Pull Requests | `cs-demo/app/repo/[id]/pulls/page.tsx` | 477 | Pull request listing and detail view — the largest page in the module. |
| Review | `cs-demo/app/repo/[id]/review/page.tsx` | 207 | Code review interface for repository changes. |

## Architecture Notes

- All pages are Next.js App Router pages using the `app/repo/[id]/` dynamic segment.
- The shared layout (`layout.tsx`) wraps all sub-pages, providing consistent navigation and repository context.
- The **Pulls** page is the most feature-rich (477 LOC), suggesting significant UI for PR workflows.
- The **Overview** page is minimal (6 LOC), likely delegating to child routes or rendering a simple redirect.
- Components from `cs-demo/components/` are likely consumed by these pages for shared UI elements.

## Dependencies

This module has no explicitly mapped cross-module dependencies. It likely consumes shared UI components from the `cs-demo/components/` directory and mock/demo data sources.
