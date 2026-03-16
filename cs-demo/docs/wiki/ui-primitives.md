# UI Primitives

Low-level, generic UI components that form the design system for the Code Steward demo application. These are reusable building blocks consumed by higher-level feature components and pages.

## Overview

The UI Primitives module provides a comprehensive set of accessible, styled components built on top of [Radix UI](https://www.radix-ui.com/) primitives and styled with Tailwind CSS / `class-variance-authority`. They follow the [shadcn/ui](https://ui.shadcn.com/) pattern — each component lives in its own file under `cs-demo/components/ui/` and can be customized directly.

## Components

| Component | File | Description |
|-----------|------|-------------|
| Alert | `cs-demo/components/ui/alert.tsx` | Contextual feedback messages |
| Avatar | `cs-demo/components/ui/avatar.tsx` | User/entity image with fallback |
| Badge | `cs-demo/components/ui/badge.tsx` | Small status/label indicator |
| Button | `cs-demo/components/ui/button.tsx` | Primary interactive element with variants |
| Card | `cs-demo/components/ui/card.tsx` | Content container with header/body/footer |
| Checkbox | `cs-demo/components/ui/checkbox.tsx` | Boolean toggle input |
| Collapsible | `cs-demo/components/ui/collapsible.tsx` | Expandable/collapsible section |
| Dialog | `cs-demo/components/ui/dialog.tsx` | Modal overlay for focused interactions |
| Dropdown Menu | `cs-demo/components/ui/dropdown-menu.tsx` | Context/action menu with submenus |
| Input | `cs-demo/components/ui/input.tsx` | Text input field |
| Label | `cs-demo/components/ui/label.tsx` | Form field label |
| Progress | `cs-demo/components/ui/progress.tsx` | Progress bar indicator |
| Scroll Area | `cs-demo/components/ui/scroll-area.tsx` | Custom scrollable container |
| Separator | `cs-demo/components/ui/separator.tsx` | Visual divider |
| Sheet | `cs-demo/components/ui/sheet.tsx` | Slide-out side panel |
| Skeleton | `cs-demo/components/ui/skeleton.tsx` | Loading placeholder |
| Switch | `cs-demo/components/ui/switch.tsx` | Toggle switch input |
| Table | `cs-demo/components/ui/table.tsx` | Data table with header/body/row/cell |
| Tabs | `cs-demo/components/ui/tabs.tsx` | Tabbed content navigation |
| Textarea | `cs-demo/components/ui/textarea.tsx` | Multi-line text input |
| Tooltip | `cs-demo/components/ui/tooltip.tsx` | Hover information popover |

## Key Dependencies

- **Radix UI** — Headless accessible primitives (`@radix-ui/react-*`)
- **class-variance-authority (cva)** — Variant-based className composition
- **Tailwind CSS** — Utility-first styling
- **tailwind-merge / clsx** — Class merging utilities

## Usage

All primitives are intended to be imported directly by feature-level components and page layouts throughout `cs-demo/`:

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
```

Components can be customized by editing their source files directly — they are not an external dependency but owned source code.
