# Boot Flow

The Boot Flow module provides the initial boot/onboarding page for the Code Steward demo application. It serves as the entry point experience users encounter when first launching the app.

## Purpose

This module is responsible for:
- Rendering the initial boot/onboarding screen at the `/boot` route
- Guiding users through first-time setup or app initialization

## Components

| File | Description |
|------|-------------|
| `cs-demo/app/boot/page.tsx` | Next.js page component for the `/boot` route (137 LOC) |

## Architecture Notes

- Built as a Next.js App Router page under `cs-demo/app/boot/`
- Currently self-contained with no dependencies on other modules
- No other modules depend on this module
