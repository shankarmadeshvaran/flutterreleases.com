# FlutterReleases Design System

## Identity
Clean, minimal, developer-first release tracker. Feels like a polished tool, not a marketing site.

## Typography
- Font: DM Sans (Google Fonts) — clean, modern, highly legible at small sizes
- Display: DM Sans 700 for version numbers and headings
- Body: DM Sans 400 at 14px
- Code/version numbers: DM Mono for monospaced version strings

## Colors (CSS Variables)

### Light Mode
- `--bg`: #FAFAFA
- `--bg-surface`: #FFFFFF
- `--bg-subtle`: #F4F4F5
- `--border`: #E4E4E7
- `--text-primary`: #18181B
- `--text-secondary`: #71717A
- `--text-muted`: #A1A1AA
- `--accent`: #0EA5E9  (Flutter-sky — lighter than current blue, fresher)
- `--accent-hover`: #0284C7

### Dark Mode
- `--bg`: #09090B
- `--bg-surface`: #111113
- `--bg-subtle`: #18181B
- `--border`: #27272A
- `--text-primary`: #FAFAFA
- `--text-secondary`: #A1A1AA
- `--text-muted`: #52525B
- `--accent`: #38BDF8
- `--accent-hover`: #7DD3FC

### Channel Badge Colors
- stable: green — bg #DCFCE7, text #166534 / dark: bg #14532D, text #86EFAC
- beta: amber — bg #FEF3C7, text #92400E / dark: bg #78350F, text #FCD34D
- main/dev: violet — bg #EDE9FE, text #5B21B6 / dark: bg #4C1D95, text #C4B5FD
- hotfix: red — bg #FEE2E2, text #991B1B / dark: bg #7F1D1D, text #FCA5A5

### Release Type
- Release: slate badge
- Hotfix: red badge (same as hotfix channel)
- Beta: amber badge

## Layout
- Max container width: 1200px, centered, px-6
- Top nav: sticky, height 56px, subtle border-bottom
- Hero section: compact, max 640px centered, text-center — subtitle + trust cues
- Filter bar: channel tabs + search in a single row
- Table: full-width, dense but breathable, alternating hover, no vertical dividers between cells
- Sticky table header
- Footer: minimal, one-line

## Spacing
- Base unit: 4px
- Section gap: 32px
- Table row padding: 14px 16px
- Card padding: 20px

## Components
- Channel filter tabs: pill style, active = solid accent bg
- Search: full-width input with icon, subtle border
- Version badge: monospace font, larger weight
- Download buttons: small outlined chips grouped together
- Release notes links: text links, small
- Pagination: minimal prev/next + page numbers
- Dark mode toggle: icon-only in header

## Motion
- Page load: fade-in stagger on table rows (CSS, 0.1s delay per row, max 500ms)
- Filter change: instant, no animation (feels snappy)
- Hover: 150ms bg transition on rows

## Anti-patterns to avoid
- No heavy shadows
- No rounded card grids
- No gradient backgrounds on hero
- No decorative illustrations
- No Inter or Space Grotesk
