# Contributing to FlutterReleases

Thank you for improving FlutterReleases. The project is both an interactive website and a generated release reference, so a small data or generator change can affect HTML, JSON, Markdown, RSS, sitemap entries, and automated deployments.

Read [docs/architecture.md](docs/architecture.md) before making architectural or generation changes. Read [docs/crawler.md](docs/crawler.md) before changing release discovery, release notes, downloads, provenance, or `releases.json` handling.

## Setup

Requirements:

- Bun, using the version declared by `packageManager` in `package.json`
- Node.js for repository scripts

```sh
git clone https://github.com/shankarmadeshvaran/flutterreleases.com.git
cd flutterreleases.com
bun install
bun run dev
```

The local Vite server runs at `http://localhost:5173`. Copy `.env.template` to `.env` only when local environment values are needed. A GitHub token is useful for crawler development because it avoids low anonymous API limits.

## Choose the Correct Owner

| Change | Start here |
|---|---|
| Homepage or shared UI | `packages/web/src/web/pages/`, `components/`, `styles.css` |
| Theme behavior | `useDarkMode.ts` and existing CSS variables; do not add page-specific theme state |
| Release crawler/data rules | `scripts/crawl-releases.js` and `docs/crawler.md` |
| Static release/SEO/Markdown output | `scripts/generate-release-pages.js` |
| Markdown negotiation | `scripts/markdown-negotiation.js`, `docs/markdown-negotiation.md` |
| Public API discovery | `scripts/api-catalog.js`, `data/api-docs.json`, `docs/api-discovery.md` |
| Shared release selectors | `scripts/release-data-utils.js` |
| Compatibility behavior | `packages/web/src/web/lib/compatibility.ts` |
| FAQ | `packages/web/src/web/data/faq.json` |
| Blog listing | `packages/web/src/web/data/blog-posts.json` |
| Blog article | `packages/web/src/web/content/blog/*.md` |
| Deployment or scheduled automation | `.github/workflows/` |

Keep changes scoped. Existing URLs, trailing-slash canonical rules, public JSON fields, theme behavior, and crawler automation are compatibility surfaces.

## Release Data Rules

Do not manually maintain release facts outside the canonical dataset. The crawler owns `packages/web/public/releases.json`, and all generated representations must consume it or shared selectors.

Only publish facts that are verified by an authoritative upstream source or mechanically derived from authoritative structured data. Missing facts remain missing. Do not invent release summaries, platform requirements, minimum operating-system versions, or compatibility claims.

Public schema changes should be additive. If a field changes, update the frontend types/normalization, static generator, validations, and documentation together.

## Generated Files

Do not hand-edit generated output:

- `feed.xml`
- `sitemap.xml`
- `links.html`
- `llms.txt`
- `llms-full.txt`
- generated release HTML or Markdown
- generated hub/FAQ/blog static output in `dist/`

Edit the owning source and run the generator. Vite copies `public/` into `dist/`; `generate-release-pages.js` then adds the complete production routes to `dist/`.

## Validation

For UI, content, generator, or SEO changes, run:

```sh
bun run lint
bun run typecheck
bun run build:web
SITE_URL=https://flutterreleases.com node scripts/generate-release-pages.js
bun run test:site-pages
bun run test:release-consistency
bun run test:flutter-versions
bun run test:flutter-version-checker
bun run test:markdown-negotiation
bun run test:api-catalog
git diff --check
```

For crawler changes, also follow the validation checklist in [docs/crawler.md](docs/crawler.md), including a representative all-channel crawler run when data-selection rules changed.

Visually verify affected pages in both light and dark themes and at desktop and mobile widths. Essential SEO content must exist in generated HTML without JavaScript.

For negotiation changes, also use local `wrangler pages dev` as documented in
[Markdown negotiation](docs/markdown-negotiation.md). Vite preview does not execute
the Pages handler. Never hand-edit generated `_worker.js`, `_routes.json`, or
exact release redirects in `dist/`.

## Automation Safety

Every push to `main` starts the production deployment. Changes to release data or scripts can also start release validation and feed/sitemap generation. The scheduled crawler may commit to `main` while a contribution is in progress, so update or rebase your branch before pushing.

Do not weaken release-count/schema guards, remove canonical redirects, or change Cloudflare output paths without validating the complete deployment workflow. Never add credentials or local `.env` files to a commit.

## Pull Requests

Use a focused branch and describe:

- what changed and why
- which URLs or generated representations are affected
- whether crawler or GitHub Actions behavior changes
- which validation commands passed
- any authoritative sources used for new release facts

Before opening the PR, confirm that unrelated generated churn, temporary files, and build output are not staged.

## Useful Documentation

- [Architecture](docs/architecture.md)
- [Crawler rules](docs/crawler.md)
- [Design system guidance](design.md)
- [Analytics and community research](docs/analytics-and-community-research.md)
