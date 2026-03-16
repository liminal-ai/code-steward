# Data & Utilities

Mock data layer providing type definitions, sample fixtures, and general utility functions for the Code Steward demo application.

## Purpose

This module serves as the foundational data layer for the demo UI. It defines the core TypeScript interfaces used throughout the application and provides realistic mock data that powers the demo without requiring a live backend. It also includes shared utility functions.

## Components

### `cs-demo/lib/mock-data.ts`

The primary data module (~545 LOC) containing:

**Type Definitions:**
- `Repo` — Repository metadata
- `PR` — Pull request structure
- `ReviewResult` — AI-generated review output
- `FileAnnotation` — Per-file review annotations
- `CodeScan` — Code scanning/analysis results
- `RepoNote` — Repository-level notes
- `RepoTask` — Task/action items for a repo

**Mock Fixtures:**
- `repos` — Sample repository list
- `paymentServicePRs` — Pull requests for the payment service demo repo
- `pr139Reviews` — Review results for a specific PR
- `pr139Synthesis` — Synthesized review summary
- `scanTypes` — Available code scan types
- `paymentServiceNotes` / `paymentServiceTasks` — Notes and tasks fixtures
- `reviewHistory` — Historical review data

**Helper Functions:**
- `formatRelativeDate()` — Formats dates into human-readable relative strings
- `getRepoById()` — Lookup a repository by ID

### `cs-demo/lib/utils.ts`

Minimal utility module (~6 LOC) exporting:
- `cn()` — Class name merging utility (likely wrapping `clsx` + `tailwind-merge`)

## Usage

Components across the demo app import interfaces and fixtures from `mock-data.ts` to render repository dashboards, PR review views, and scan results. The `cn()` utility is used broadly for conditional Tailwind CSS class composition.

## Dependencies

This module has no dependencies on other internal modules — it is a leaf-level data provider consumed by UI components throughout the application.
