# FlutterReleases Design System

## Identity
Clean, minimal, developer-first release tracker. Feels like a polished tool, not a marketing site.

The product promise is accuracy: official Flutter SDK archive data, verified download links, and release notes routed to the correct source. The UI should feel trustworthy and operational, not promotional.

## Typography
- Font: system UI stack — fast, native, highly legible at small sizes, and avoids render-blocking font requests
- Display: system UI 700 for version numbers and headings
- Body: system UI 400 at 14px
- Code/version numbers: native monospace stack for version strings

## Colors (CSS Variables)

### Light Mode
- `--bg`: #FAFAFA
- `--bg-surface`: #FFFFFF
- `--bg-subtle`: #F4F4F5
- `--border`: #E4E4E7
- `--text-primary`: #18181B
- `--text-secondary`: #71717A
- `--text-muted`: #71717A
- `--accent`: #0EA5E9  (Flutter-sky — lighter than current blue, fresher)
- `--accent-hover`: #0284C7
- `--accent-bg`: #E0F2FE
- `--row-hover`: #F9FAFB

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
- `--accent-bg`: #0C4A6E
- `--row-hover`: #18181B

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
- Top nav: sticky, height 56px, subtle border-bottom, translucent surface with light blur
- Filter bar: sticky below the nav, channel tabs left and search/count right on desktop; stacked on mobile
- Hero section: compact, left-aligned, max 2xl text block inside the 1200px container — subtitle + trust cues
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
- Pagination: minimal icon prev/next + page numbers, fixed 32px square buttons
- Pagination icon buttons must have accessible names such as "Previous page" and "Next page"
- Dark mode toggle: icon-only in header
- Header brand: Flutter lockup asset plus "Releases" text on larger screens
- Donate/contact actions: quiet header links; never compete with release data
- Trust cues: small muted text links under the hero, including "Downloads hosted by Google", "Flutter Versions", and unofficial-resource disclaimer

## Data Presentation
- Downloads and release-note links must remain visible as normal links, not hidden behind client-only interaction.
- Verified crawler data should be reflected through reliable link targets first; avoid adding noisy verification badges unless the UI is explicitly expanded for diagnostics.
- Major stable releases link to official Flutter docs release notes.
- Stable hotfix/patch releases link to the Flutter stable changelog version anchor.
- Beta/dev/main releases should not imply stable docs release notes; use GitHub tag, release, or commit links.
- If a download link is missing, show a quiet dash and keep the row layout stable.
- Loading states should reserve the same rough footprint as loaded content, especially on mobile, to avoid layout shift.
- If a direct download link fails, keep the existing quiet fallback copy pointing users to Flutter's official archive.
- Tool pages such as the Flutter & Dart Version Compatibility Checker must use the global theme state, shared header/footer, CSS variables, existing badges, and stable-first data ordering.

## Motion
- Page load: fade-in stagger on table rows (CSS, 0.1s delay per row, max 500ms)
- Filter change: instant, no animation (feels snappy)
- Hover: 150ms bg transition on rows

## Anti-patterns to avoid
- No heavy shadows
- No rounded card grids
- No gradient backgrounds on hero
- No decorative illustrations
- No third-party runtime font loading unless the performance tradeoff is explicitly accepted
- No marketing-style hero layout or oversized CTA section
- No unverified release-note shortcuts
- No badges or alerts that make the table harder to scan
