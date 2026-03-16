# Shared Components

Reusable application-level UI components used across the Code Steward demo interface. These components provide the top-level chrome (header, theme switching) and core interactive elements (repository cards, dialogs).

## Components

| File | Description |
|------|-------------|
| `cs-demo/components/app-header.tsx` | Main application header bar. Exports `AppHeader`. |
| `cs-demo/components/repo-card.tsx` | Card component for displaying a repository summary. Exports `RepoCard`. |
| `cs-demo/components/add-repo-dialog.tsx` | Dialog for adding a new repository to the dashboard. Exports `AddRepoDialog`. |
| `cs-demo/components/theme-switcher.tsx` | Light/dark theme toggle control. Exports `ThemeSwitcher`. |

## Responsibilities

- **App Header** — Renders the persistent top navigation bar, likely incorporating the theme switcher and branding.
- **Repo Card** — Presents repository metadata (name, status, metrics) in a card layout suitable for a dashboard grid.
- **Add Repo Dialog** — Modal form for onboarding a new repository into Code Steward.
- **Theme Switcher** — Allows users to toggle between light and dark modes.

## Usage

These components are consumed by page-level routes under `cs-demo/app/`. They are self-contained and do not currently depend on other internal modules, making them straightforward to compose into new views.
