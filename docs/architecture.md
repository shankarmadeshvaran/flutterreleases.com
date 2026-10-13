# FlutterReleases Architecture

This document explains how release data moves through FlutterReleases and where contributors should make changes. The project intentionally keeps one canonical release dataset and generates every public representation from it.

## System Overview

```text
Flutter SDK archive + official Flutter/GitHub sources
  -> scripts/crawl-releases.js
  -> packages/web/public/releases.json
  -> shared release selectors
  -> React UI + static HTML + JSON + Markdown + RSS + sitemap + LLM files
  -> Cloudflare Pages
```

`packages/web/public/releases.json` is the source of truth for published release facts. Homepage values, release pages, the Flutter versions hub, compatibility results, RSS, sitemap release entries, Markdown pages, and LLM files must consume that dataset rather than maintain separate version facts.

## Application and Routing

The frontend is a React 19 and Vite application using Wouter. SPA routes provide the interactive experience, including filtering, release expansion, theme switching, blog navigation, FAQ, and the Flutter/Dart compatibility checker.

Search-critical routes are also generated as complete static HTML by `scripts/generate-release-pages.js`. Their initial HTML contains headings, metadata, canonical links, release facts, and internal links without requiring JavaScript. The generated pages may still load the Vite application assets for progressive enhancement.

Canonical release URLs use a trailing slash:

```text
/release/<version>/
```

Cloudflare Pages applies `packages/web/public/_redirects` so the non-trailing form redirects to the canonical URL. Markdown alternates use `/release/<version>.md`; they are machine-readable alternatives, not canonical HTML replacements.

## Data Ownership

| Concern | Owning files |
|---|---|
| Release discovery and verification | `scripts/crawl-releases.js`, `docs/crawler.md` |
| Canonical release data | `packages/web/public/releases.json` |
| Shared generator selectors | `scripts/release-data-utils.js` |
| Frontend release normalization | `packages/web/src/web/hooks/useReleases.ts` |
| Flutter/Dart lookup behavior | `packages/web/src/web/lib/compatibility.ts` |
| Static routes and machine formats | `scripts/generate-release-pages.js` |
| Lightweight committed feed/sitemap refresh | `scripts/generate-releases.js` |
| FAQ content | `packages/web/src/web/data/faq.json` |
| Blog index metadata | `packages/web/src/web/data/blog-posts.json` |
| Blog article content | `packages/web/src/web/content/blog/*.md` |
| Site changelog content | `packages/web/src/web/data/changelog.json` |
| Theme and shared UI | `packages/web/src/web/styles.css`, `components/`, `useDarkMode.ts` |
| Deployment and scheduled updates | `.github/workflows/` |

Public JSON fields are treated as a compatibility contract. Schema changes should be additive unless a coordinated migration is unavoidable.

## Build and Generation

The production pipeline has two stages:

1. `bun run build:web` creates `packages/web/dist/` and copies static files from `public/`.
2. `node scripts/generate-release-pages.js` reads the canonical data and writes the complete static production site into `dist/`.

The full generator creates release HTML and Markdown, the versions hub, compatibility checker, FAQ, blog output, homepage Markdown, sitemap, RSS/discovery files, and LLM orientation files. Selected shared discovery artifacts are also updated in `public/`; route-specific static output remains in `dist/`.

`scripts/generate-releases.js` is a smaller workflow generator. It refreshes the committed RSS feed, sitemap, and generation status after crawler or generator changes without requiring a Vite build. The deployment generator always produces the final files served from `dist/`.

Do not manually edit generated files such as `feed.xml`, `sitemap.xml`, `links.html`, `llms.txt`, `llms-full.txt`, generated Markdown, or generated route HTML.

## Automated Release Flow

Workflows use version-pinned `actions/checkout@v7.0.1` and
`actions/setup-node@v7.1.0`, which support the Node 24 action runtime. Crawler
and lightweight generator jobs explicitly select Node 24 with package-manager
caching disabled because they run scripts without installing npm dependencies.
GitHub-hosted `ubuntu-latest` supplies the required runner; no local or
Cloudflare configuration is needed. Keep credential persistence and existing
write permissions intact for crawler/generator commits.

The daily schedule runs at 06:17 UTC (11:47 IST):

1. `crawl-releases.yml` runs the crawler for all channels.
2. If canonical release data changed, the workflow commits only `releases.json`.
3. The resulting push triggers validation, the lightweight feed/sitemap update, and the normal deployment workflow.
4. The crawler workflow also performs a release deployment when it created a data commit.
5. After deployment, high-value changed/current URLs are submitted to IndexNow.

The generators use dataset-derived selectors, so a newly crawled release automatically appears in the homepage data, release pages, version history, compatibility data, RSS, sitemap, Markdown, and LLM files on the next successful build. Contributors should not add a second update path for a new representation.

## Provenance and Unknown Data

Published facts should be verified by an authoritative source or mechanically derived from authoritative structured data. Trusted sources are the Flutter SDK archive, Flutter documentation, the Flutter GitHub repository, and official Dart sources where available.

Missing information must remain missing. Do not infer system requirements, platform minimums, breaking changes, release summaries, or compatibility beyond the bundled Flutter-to-Dart mapping. Generated pages should omit unavailable sections rather than print guesses.

## Adding Functionality

For a new page, add the SPA route when interaction is needed and add static generation when the page contains search-critical content. Reuse the existing header, footer, theme tokens, metadata conventions, and canonical URL rules.

For a new release field, establish its authoritative upstream source first, add it without breaking existing JSON consumers, update both frontend and generator normalization if necessary, and add a consistency check.

For a new machine-readable representation, generate it from `releases.json` or shared content files. Do not create another release database. Keep canonical HTML in the sitemap and advertise alternate formats from their corresponding HTML pages where appropriate.

For crawler changes, follow [crawler.md](crawler.md) and run the crawler-specific validation before regenerating the site.

## Validation Boundaries

The core checks protect different layers:

- `bun run lint` checks JavaScript and TypeScript quality.
- `bun run typecheck` checks workspace TypeScript contracts.
- `bun run build:web` checks the Vite application build.
- `generate-release-pages.js` checks full static generation.
- `test:site-pages` checks static knowledge pages and metadata.
- `test:release-consistency` checks that generated representations agree with canonical data.
- `test:flutter-versions` checks the versions hub and release discovery.
- `test:flutter-version-checker` checks compatibility data and static checker output.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the complete pre-PR workflow.
