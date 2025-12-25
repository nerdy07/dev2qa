# Design Language Overview

This document captures the shared tokens and UI guidelines that underpin the refreshed Dev2QA experience. Treat these values as the single source of truth whenever you introduce or update UI.

## Color Roles

| Token | CSS Variable | Usage |
| --- | --- | --- |
| Primary | `--primary` / `--primary-foreground` | Primary actions, key accents, hero metrics |
| Secondary | `--secondary` / `--secondary-foreground` | Secondary actions, subdued surfaces |
| Surface | `--surface` / `--surface-elevated` / `--surface-muted` | Base backgrounds, elevated cards, muted containers |
| Border | `--border` | Dividers, outlines, input borders |
| Success | `--success` / `--success-foreground` | Positive states, completion |
| Warning | `--warning` / `--warning-foreground` | Pending attention, caution |
| Info | `--info` / `--info-foreground` | Neutral highlights, notifications |
| Destructive | `--destructive` / `--destructive-foreground` | Errors, destructive actions |
| Muted | `--muted` / `--muted-foreground` | Secondary text, subtle fills |
| Gold | `--gold` | Recognition moments (badges, trophies) |

> Dark mode values are tuned separately to maintain contrast. Avoid hard-coding hex values—use the Tailwind color tokens (`bg-info`, `text-success-foreground`, etc.).

## Shadows

| Token | CSS Variable | Tailwind Shadow | Usage |
| --- | --- | --- | --- |
| Soft | `--shadow-sm` | `shadow-soft` | Low elevation cards, hover states |
| Lifted | `--shadow-md` | `shadow-lifted` | Interactive panels, dialogs |
| Float | `--shadow-lg` | `shadow-float` | Modals, hero callouts |

Each shadow token is defined with HSLA values so we can tint them for dark mode without re-authoring every rule.

## Spacing Scale

| Name | CSS Variable | Value |
| --- | --- | --- |
| `2xs` | `--space-2xs` | `0.25rem` |
| `xs` | `--space-xs` | `0.5rem` |
| `sm` | `--space-sm` | `0.75rem` |
| `md` | `--space-md` | `1rem` |
| `lg` | `--space-lg` | `1.5rem` |
| `xl` | `--space-xl` | `2rem` |

Tailwind exposes these via `gap-sm`, `px-md`, etc., so layout spacing stays consistent across the app.

## Typography

- `--font-body` is the baseline stack for headings and body text (defined via font loading in `_app`).
- Use `text-sm` for supporting copy, `text-base` for body, `text-lg`+ for headings based on hierarchy.
- Maintain consistent line-heights and letter spacing—prefer existing Tailwind utilities before introducing custom style overrides.

## Component Guidelines

- **Cards**: `bg-surface` (or `bg-surface-elevated`), `shadow-soft` by default, add `shadow-lifted` on hover for interactive elements.
- **Badges**: Map semantic meaning to status tokens (e.g., `bg-success`, `bg-warning`, `bg-info`). Ensure text uses corresponding foreground tokens.
- **StatCard**: Pair the hero metric with a clear `text-primary` or `text-success` color. Use the spacing tokens for padding (`p-md`) and icon alignment.
- **Headers**: `PageHeader` and similar wrappers should respect `gap-md`/`gap-lg` and adapt to column layout on mobile (`flex-col` → `sm:flex-row`).

## Accessibility & Dark Mode

- All tokens meet WCAG AA contrast ratios in both light and dark themes.
- Focus states should leverage `ring` and `outline` utilities tied to `--ring`; avoid eliminating the focus ring.
- When adding new colors or components, update this file and `globals.css` to keep light/dark variants in sync.

## Implementation Notes

- Tailwind configuration (`tailwind.config.ts`) exposes every token described here.
- Prefer semantic class names (`bg-success`, `shadow-soft`, `gap-sm`) over raw CSS/inline styles.
- When building new components, document the chosen tokens via Storybook or component docs to maintain clarity.

Refer back to this document during reviews—deviations should either extend the token set or align with a defined exception.






