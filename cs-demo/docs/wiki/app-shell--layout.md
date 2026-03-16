# App Shell & Layout

This module provides the top-level application structure for the Code Steward demo app, including the root layout, landing page, and global theming infrastructure.

## Responsibilities

- **Root Layout** — Wraps the entire application with global providers, metadata, and HTML structure.
- **Landing Page** — Renders the default route (`/`) for the demo app.
- **Theme Provider** — Supplies a React context for theme management, allowing components throughout the app to access and switch between named themes.

## Components

| File | Purpose |
|---|---|
| `cs-demo/app/layout.tsx` | Root layout component; sets up HTML skeleton, metadata export, and wraps children with global providers. |
| `cs-demo/app/page.tsx` | Home page rendered at the `/` route. |
| `cs-demo/providers/theme-provider.tsx` | `ThemeProvider` context provider and `useTheme` hook; exports the `ThemeName` type for theme identification. |

## Key Exports

- **`metadata`** (from `layout.tsx`) — Next.js metadata object for the application.
- **`ThemeProvider`** / **`useTheme`** (from `theme-provider.tsx`) — React context provider and consumer hook for theming.
- **`ThemeName`** (from `theme-provider.tsx`) — TypeScript type representing available theme names.

## Usage

The `ThemeProvider` is mounted inside `layout.tsx` so that any page or component in the tree can call `useTheme()` to read or change the active theme. Pages like `page.tsx` are rendered as children of this layout.

## Dependencies

This module has no direct dependencies on other internal modules. It serves as the outermost shell that all other modules render within.
