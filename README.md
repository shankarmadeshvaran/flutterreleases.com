# flutterreleases.com

Browse Flutter releases, bundled Dart SDK versions, channels, downloads, and official release notes in one place. A daily GitHub Actions crawler maintains the published dataset; freshness depends on successful runs and available upstream data.

**Live site:** [flutterreleases.com](https://flutterreleases.com)

The homepage offers latest-stable Windows, macOS, and Linux SDK downloads when
available in the dataset, plus a link to older versions. Static HTML and Markdown
derive those downloads from the same data; crawler automation is unchanged.

Unknown URLs return a themed 404 page with links to existing resources rather
than redirecting to the homepage. `/release` and `/release/` permanently redirect
to `/flutter-versions/`. Recovery copy is shared in `data/not-found.json`; the
post-build generator creates `404.html`. Verify status codes with local Pages.

The homepage advertises the API catalog, OpenAPI specification, and API docs
through HTTP `Link` headers on HTML and negotiated Markdown GET/HEAD responses.
These links are generated from the existing catalog definitions, with no separate
Cloudflare dashboard rule. See [API discovery](docs/api-discovery.md) for validation.

Privacy Policy (`/privacy-policy/`) and Terms and Conditions
(`/terms-and-conditions/`) are generated from `packages/web/src/web/data/legal.json`
and linked in the footer. This shared content also powers the React pages.
Review operator details, retention settings, and applicable consent requirements
before publishing policy changes; a privacy notice does not replace required consent.

Contributor entry points: [CONTRIBUTING.md](CONTRIBUTING.md) · [AI agent instructions](AGENTS.md) · [Architecture](docs/architecture.md) · [Design](docs/design.md) · [Crawler rules](docs/crawler.md)

## Public URLs

| Page / Tool | URL | What it is for |
|---|---|---|
| Flutter Releases | [flutterreleases.com](https://flutterreleases.com) | Browse the latest Flutter releases, Dart SDK versions, channels, downloads, and release notes |
| Flutter Versions | [flutterreleases.com/flutter-versions/](https://flutterreleases.com/flutter-versions/) | SEO-friendly Flutter version history, latest stable/beta/dev, and Flutter ↔ Dart compatibility |
| Flutter Version Compatibility Checker | [flutterreleases.com/tools/flutter-version-checker/](https://flutterreleases.com/tools/flutter-version-checker/) | Check which Dart SDK ships with a Flutter version, or which Flutter releases include a Dart version |
| FAQ | [flutterreleases.com/faq/](https://flutterreleases.com/faq/) | Answers about release data, update frequency, Dart compatibility, downloads, and support |
| Blog | [flutterreleases.com/blog/](https://flutterreleases.com/blog/) | Technical articles published from Markdown manuscripts |
| API Docs | [flutterreleases.com/api-docs/](https://flutterreleases.com/api-docs/) | Public JSON dataset contract, provenance, and usage guidance |

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite 7 + Tailwind CSS v4 |
| Routing | Wouter |
| Build | Bun workspaces + Turborepo; explicit application/Vite TypeScript checks |
| Deploy | Static assets and a scoped Pages Function via GitHub Actions and `npx --yes wrangler@4` |
| Data pipeline | Node.js scripts; automation uses Node 24 |
| Analytics | Optional build-time GA4 injection and existing event helpers |

---

## Project Structure

Tracked source layout; related image assets and article files are grouped by pattern. Generated `dist/`, caches, and installed dependencies are not tracked.

```text
AGENTS.md                       # Repository-wide AI coding instructions
CONTRIBUTING.md                  # Setup, ownership, validation, and PR rules
README.md
LICENSE                         # MIT, copyright 2025-2026
package.json                    # Bun workspace scripts and tooling
bun.lock                        # Committed dependency lockfile
tsconfig.json
turbo.json
.env.template                   # Local environment template; not credentials
.gitignore
.oxlintrc.json

docs/
  architecture.md               # Source-of-truth, routing, and automation model
  design.md                     # Current UI, theme, and responsive conventions
  crawler.md                    # Trusted sources and crawler validation rules
  analytics.md                  # GA4 configuration, events, funnels, and checks
  markdown-negotiation.md       # Accept handling, Pages runtime, caching, and tests
  api-discovery.md               # Catalog, OpenAPI, and dataset documentation

.github/
  workflows/
    deploy.yml                  ← Builds + deploys to Cloudflare Pages on push to main
    crawl-releases.yml          ← Daily archive/GitHub crawl, commit, and conditional deployment
    update-releases.yml         ← Regenerates feed.xml + sitemap.xml when release data or scripts change
    validate-release-data.yml   ← Guardrail: fails on schema drift or suspiciously small data

scripts/
  crawl-releases.js             ← Hits Flutter SDK archive + GitHub/docs sources, verifies
                                   release-note and recent download URLs, writes releases.json
  generate-releases.js          ← Lightweight generator for committed feed.xml,
                                   sitemap.xml, and generation_status.json
  generate-release-pages.js     ← Post-build: generates per-release HTML, sitemap.xml,
                                   Markdown alternates, /flutter-versions/, llms.txt,
                                   llms-full.txt, links.html, API resources, and Pages routing
  release-data-utils.js         ← Shared selectors/provenance helpers used by generators
                                   and consistency checks
  submit-indexnow.js            ← Post-deploy: submits high-value URLs to IndexNow
  markdown-negotiation.js       ← Pages handler selecting existing Markdown using Accept
  api-catalog.js                ← Catalog and OpenAPI builders for the public JSON interface
  validate-api-catalog.js       ← Contract/data consistency and GET/HEAD discovery checks
  validate-markdown-negotiation.js ← Format, header, redirect, and resource-isolation checks
  validate-site-pages.js        ← Checks static homepage, FAQ, blog, metadata, and links
  validate-release-consistency.js ← Confirms HTML/Markdown/LLM output matches releases.json
  validate-flutter-versions-page.js ← Verifies generated SEO page, latest channels,
                                      canonical release links, sitemap inclusion,
                                      release-note source rules, and download status
  validate-flutter-version-checker.js ← Verifies Flutter ↔ Dart compatibility lookup,
                                         static checker HTML, canonical links, and sitemap inclusion
  validate-theme.js             ← System preference, saved choice, and toggle checks
  validate-analytics.js         ← GA4 injection, static clicks, and checker events

packages/
  web/
    README.md                   ← Web package commands and validation
    package.json                ← Frontend dependencies and typechecked build
    tsconfig.json               ← Editor/project references
    tsconfig.app.json           ← Application TypeScript checks
    tsconfig.node.json          ← Vite and plugin TypeScript checks
    website.config.json         ← Site identity and production URL
    index.html                  ← Entry HTML with meta tags, OG, JSON-LD, canonical,
                                   noscript fallback with top-10 stable links
    vite.config.ts
    vite/
      plugins/
        google-analytics-plugin.ts   ← Injects GA4 script when VITE_GA_MEASUREMENT_ID is set
    src/web/
      main.tsx
      app.tsx                   ← Wouter routes; no backend or desktop scaffold
      styles.css                ← Shared light/dark tokens and UI styles
      vite-env.d.ts
      pages/
        index.tsx               ← Main page (filter, search, pagination, dark mode)
        blog.tsx                ← Blog index only; articles are generated static pages
        flutter-versions.tsx    ← SPA version history and Flutter ↔ Dart matrix route
        flutter-version-checker.tsx ← SPA Flutter & Dart compatibility checker route
        faq.tsx                 ← FAQ page using shared site theme and FAQ data
        changelog.tsx           ← Direct site changelog route, not linked in primary nav
        api-docs.tsx            ← Public dataset documentation using the shared site theme
      data/
        blog-posts.json         ← Blog index metadata used by SPA and static generator
        faq.json                ← FAQ content shared by SPA route and static generator
        changelog.json          ← Site changelog content shared by SPA route and static generator
        api-docs.json           ← API documentation copy shared by SPA and static generator
      content/blog/
        *.md                    ← Blog manuscripts and article metadata
      components/
        BlogCard.tsx
        Hero.tsx                ← Latest stable/beta pills → canonical release pages
        Header.tsx              ← Nav, dark mode toggle
        FilterBar.tsx           ← Channel filter + search
        ReleaseTable.tsx        ← Expandable rows, downloads, release note links
        Pagination.tsx
        Footer.tsx              ← Product, Resources (including API Docs), and Community
        ChannelBadge.tsx
      hooks/
        useReleases.ts          ← Fetches + normalises releases.json
        useDarkMode.ts
        useMeta.ts
      lib/
        analytics.ts            ← Safe wrapper around the injected GA4 runtime
        compatibility.ts        ← Flutter ↔ Dart lookup, compatibility, and stable-first sorting helpers
      types/
        release.ts              ← Frontend Release interface and Channel type
    public/
      _headers                 ← Cloudflare Pages cache/security headers copied into dist/
      _redirects               ← Legacy aliases and API docs slash redirect;
                                   exact release redirects are generated in dist/
      .well-known/ory-verify.txt ← Published ownership verification
      7f5162486aa84ed58a5faca3e760c881.txt ← Published IndexNow key
      releases.json             ← Source of truth — written by crawler, never edit manually
      feed.xml                  ← RSS feed — generated from releases.json
      sitemap.xml               ← Committed sitemap refreshed by generate-releases.js;
                                   production copy rebuilt by generate-release-pages.js
      links.html                ← Crawlable full release index — generated by generate-release-pages.js
      llms.txt                  ← Lightweight LLM orientation file — auto-generated
      llms-full.txt             ← Compact LLM knowledge reference — auto-generated
      robots.txt
      generation_status.json    ← Lightweight pipeline status, not a health API
      og-image.png
      og-image.svg              ← Retained SVG asset
      lockup_flutter_horizontal.svg
      lockup_flutter_horizontal_wht.svg
      favicon.ico
      favicon-*.png             ← 16px, 32px, and 48px icons
      android-chrome-*.png      ← 192px and 512px manifest icons
      apple-touch-icon.png
      blog/*.svg                ← Published article cover assets
      site.webmanifest
      feed.xsl                  ← Styles the RSS feed in browsers
```

> Vite copies `public/` into `dist/` during the web build. The post-build generator then adds full static routes and Markdown files to `dist/`; only selected shared discovery files are also written back to `public/`. Do not expect every `dist/` route to exist in `public/`.

---

## Local Development

```sh
git clone https://github.com/shankarmadeshvaran/flutterreleases.com.git
cd flutterreleases.com
bun install
bun run dev        # Vite dev server at http://localhost:5173
```

Bun is the project package manager; see `packageManager` in `package.json`. Node 24 matches the crawler/generator automation. Vite normally uses port 5173 and selects another port if it is occupied; use the URL printed by the server.

Vite loads the root `.env` when present. Node scripts read exported environment variables and do not automatically load `.env`; either export `GITHUB_TOKEN` or use Node's `--env-file=.env` option after copying `.env.template`. A token helps avoid low anonymous GitHub API limits. `WEBSITE_URL` in the template does not set Vite's port. Never commit local credentials.

## Build

```sh
bun run build:web                        # App/Vite type checks, then Vite -> packages/web/dist
SITE_URL=https://flutterreleases.com node scripts/generate-release-pages.js
```

The post-build generator is required for the complete production site. A Vite-only build does not create release/article HTML, Markdown, API discovery, or the Pages handler. The frontend uses React, Wouter, Lucide, and shared CSS; unused Hono, Electron, React Query, and button scaffolding has been removed.

Rebuilding Vite clears `dist/`; rerun the post-build generator afterwards.

For plain static preview after building and generating, use the web package's installed Vite without rebuilding:

```sh
cd packages/web
bunx vite preview --port 4173
```

The package's preview script rebuilds the app, so use the standalone command above to preserve generated routes. Vite preview does not execute Pages Functions. For actual negotiation and redirect checks, follow the local `wrangler pages dev` commands in [docs/markdown-negotiation.md](docs/markdown-negotiation.md).

---

## Data Pipeline

Crawler-specific rules and validation steps live in [docs/crawler.md](docs/crawler.md). Read that guide before changing release discovery, release-note URLs, download verification, or generated release data.

The full source-of-truth, build, routing, and automation model lives in [docs/architecture.md](docs/architecture.md). New contributors should also read [CONTRIBUTING.md](CONTRIBUTING.md) before editing crawler-owned or generated files.

Analytics setup, events, funnels, and tracking rules live in [docs/analytics.md](docs/analytics.md). Read that guide before adding product analytics or new tracked properties.

| Step | Trigger | What it does |
|---|---|---|
| `crawl-releases.yml` | Daily 06:17 UTC / 11:47 IST + manual | Crawls stable/beta and rolling main, refreshes existing dev data, commits changed JSON, then conditionally builds, validates, deploys, and submits IndexNow URLs |
| `update-releases.yml` | Matching pushes to `main`/`master` + manual | Runs the lightweight generator for changes to JSON, scripts, root package.json, or this workflow; commits only feed, sitemap, and generation status |
| `validate-release-data.yml` | Matching pushes to `main`/`master` + manual | Checks nonempty records, canonical first-record fields, and the 50-item minimum for changes to JSON, normalization, crawler/generator, or this workflow |
| `deploy.yml` | Every push to `main` + manual | Frozen Bun install, data guards, typechecked build, static generation, Markdown/API validation, Pages deployment, and IndexNow submission |

The crawler has its own deployment job when JSON changes; do not rely solely on a separate push-triggered workflow for automated publication. Scheduled runs can be delayed or fail. Inspect Actions and `meta.generated_at` when checking freshness.

The two generators have different responsibilities. `generate-releases.js` keeps small committed discovery artifacts current without building the app. `generate-release-pages.js` runs after Vite and creates the complete production output in `dist/`, including static routes, Markdown representations, and the final production sitemap. Both consume the same canonical release dataset and shared selectors.

The lightweight generator also fetches upstream metadata and writes an intermediate `releases.generated.json`; it prefers existing canonical records for the published feed/sitemap and does not overwrite crawler-owned `releases.json`. Its workflow commits only the feed, sitemap, and generation status.

### Source-of-truth flow

FlutterReleases uses one canonical release dataset:

```text
Official upstream sources
  -> crawler / update pipeline
  -> packages/web/public/releases.json
  -> HTML, JSON, Markdown, RSS, sitemap, links.html, llms.txt, llms-full.txt
```

New public representations must consume `releases.json` or the shared release selectors in `scripts/release-data-utils.js`. Do not create a second release database for Markdown, LLM files, homepage copy, the compatibility checker, RSS, or sitemap metadata.

### Running the crawler locally

```sh
node scripts/crawl-releases.js                 # stable channel only
node scripts/crawl-releases.js --all-channels  # stable + beta + main; refreshes existing dev metadata
node scripts/crawl-releases.js --all-channels --verify-downloads  # full download URL audit
# If using values from the root .env:
node --env-file=.env scripts/crawl-releases.js --all-channels
```

The crawler uses the official Flutter SDK archive as the canonical source for versions, Dart SDK versions, release dates, framework hashes, and platform download URLs. Stable `.0` feature releases point to Flutter's official docs release-note pages. Stable hotfix/patch releases point to the Flutter stable `CHANGELOG.md` version anchor. Recent stable/beta download URLs are verified by default; `--verify-downloads` verifies all archive-backed downloads.

Before writing `releases.json`, the crawler validates version identifiers and keeps one authoritative record per Flutter version. If the same version appears in more than one channel, it prefers stable, then beta, dev, and main, with verified and complete records preferred within a channel. Empty, `undefined`, and whitespace-corrupted versions are discarded. Static generators apply the same guard so HTML, Markdown, RSS, sitemap, LLM files, and the compatibility checker cannot publish duplicate release facts while historical data is being cleaned.

### Regenerating all static assets locally

```sh
# Run after bun run build:web — reads from dist/, falls back to public/
SITE_URL=https://flutterreleases.com node scripts/generate-release-pages.js

# Options
node scripts/generate-release-pages.js --dry-run      # Preview counts, no writes
node scripts/generate-release-pages.js --stable-only  # Only generate stable release pages
```

This produces:
- `dist/release/<version>/index.html` — one page per release
- `dist/release/<version>.md` — Markdown equivalent for each release page
- `dist/flutter-versions/index.html` — crawlable Flutter version history and Dart compatibility page
- `dist/flutter-versions.md` — Markdown equivalent of the Flutter versions hub
- `dist/tools/flutter-version-checker/index.html` — crawlable Flutter & Dart compatibility checker page
- `dist/flutter-dart-compatibility.md` — Markdown equivalent of the compatibility checker
- `dist/faq/index.html` — crawlable FAQ page with FAQPage structured data
- `dist/faq.md` — Markdown equivalent of the FAQ
- `dist/index.md` — Markdown equivalent of the homepage release overview
- `dist/blog/index.html` — crawlable blog index
- `dist/blog/<slug>/index.html` — static articles from Markdown manuscripts
- `dist/blog/<slug>.md` — Markdown equivalent for generated blog posts
- `dist/blog.md` — Markdown equivalent of the blog index
- `dist/_worker.js` + `dist/_routes.json` — scoped Markdown content negotiation
- `dist/_redirects` — legacy aliases plus exact per-release slash redirects
- `dist/changelog/index.html` — direct site changelog route
- `dist/.well-known/api-catalog` — RFC 9727 discovery of the JSON interface
- `dist/openapi.json` — generated OpenAPI 3.1.1 contract
- `dist/api-docs/index.html` — crawlable API documentation
- `dist/sitemap.xml` + `public/sitemap.xml` — canonical indexable HTML URLs only
- `dist/llms.txt` + `public/llms.txt` — lightweight LLM orientation file
- `dist/llms-full.txt` + `public/llms-full.txt` — compact LLM knowledge reference
- `dist/links.html` + `public/links.html` — crawlable full release index (no JS)
- `dist/feed.xml` + `public/feed.xml` — generated release RSS

Here `dist/` means `packages/web/dist/` and `public/` means `packages/web/public/`. The generator also replaces the built homepage's crawler-readable fallback with dataset-derived content. `--stable-only` is a selective local generation option, not the production deployment mode; it does not filter every hub or sitemap to stable releases.

Submit high-value URLs to IndexNow after deployment:

```sh
SITE_URL=https://flutterreleases.com node scripts/submit-indexnow.js --dry-run
SITE_URL=https://flutterreleases.com node scripts/submit-indexnow.js
```

IndexNow uses the root key file at `/7f5162486aa84ed58a5faca3e760c881.txt`. The submitter includes the homepage, `/flutter-versions/`, `/tools/flutter-version-checker/`, `/blog/`, `/faq/`, configured blog posts, latest stable/beta/dev/main releases, and recent stable release pages. Set `INDEXNOW_KEY` only if rotating the public key.

---

## SEO & Discoverability

Published representations serve different discovery channels; `releases.json` is maintained by the crawler, while the post-build generator derives the static representations:

| File | Purpose | Audience |
|---|---|---|
| `sitemap.xml` | Lists canonical indexable HTML, not every machine representation | Googlebot, Bingbot |
| `feed.xml` | RSS feed of stable + beta releases | RSS readers, aggregators |
| `releases.json` | Machine-readable full release dataset | Developers, scripts |
| `llms.txt` | Lightweight orientation and current-release index | LLM crawlers and retrieval systems |
| `llms-full.txt` | Compact knowledge reference with current releases, compatibility pointers, provenance, and stable history | LLM context windows |
| `links.html` | Crawlable page listing all release links | Crawlers without JS |
| `/flutter-versions/` | Static Flutter version history, latest stable/beta/dev, and Flutter ↔ Dart compatibility | Search engines, LLMs, developers |
| `/tools/flutter-version-checker/` | Static and interactive Flutter & Dart compatibility checker | Developers, search engines |
| `/release/<version>/` | Individual release page with JSON-LD + downloads | Search engines, LLMs |
| `/release/<version>.md` | Markdown equivalent of the canonical HTML release page | Retrieval systems, coding agents |
| `/blog/` and `/blog/<slug>/` | Blog index and static technical articles | Developers, search engines |
| `/api-docs/` | Human-readable dataset documentation, linked from footers | Developers, integrators |
| `/.well-known/api-catalog` and `/openapi.json` | Discovery and contract for the existing JSON interface | Automated clients, coding agents |

**Flutter versions page** (`/flutter-versions/`) is generated from `releases.json` on every post-build run. It serves full static HTML with the latest stable, beta, and dev/main releases, grouped version history, Dart SDK compatibility rows, JSON-LD, canonical metadata, and links to every individual release page.

**Flutter version checker** (`/tools/flutter-version-checker/`) is generated from `releases.json` on every post-build run and also has a SPA route. It answers Flutter → Dart, Dart → Flutter, and exact bundled-SDK compatibility questions. Stable releases are prioritized in source order and UI order, while beta/dev/main releases remain available for completeness.

**FAQ** (`/faq/`) is generated from `packages/web/src/web/data/faq.json`, uses FAQPage structured data, and is included in the sitemap and IndexNow submissions.

**Blog**: the index consumes `blog-posts.json`; individual articles are generated from `src/web/content/blog/*.md`. Add both metadata and the manuscript when publishing a post. Articles have static headings, a table of contents, code highlighting/copy controls, checklists, and contextual links. They are not rendered by a separate article SPA route.

Use the generated-site preview to review articles locally; the Vite development SPA does not supply article-content routes.

**Per-release pages** (`/release/<version>/`) serve generated HTML directly in production. Release URLs are canonical with a trailing slash; exact static redirects and the Pages handler normalize non-slash forms without capturing `.md` files. Pages include dataset-derived relationships where available, source links, and links back to useful hubs. In Vite development without generated pages, the SPA release route redirects to the homepage's selected-release view; it is not the production rendering path.

The homepage links to `/flutter-versions/` through normal anchor links in the nav/hero/footer and the `<noscript>` fallback. Release pages also link back to `/flutter-versions/`, creating crawlable paths between the SEO hub and individual release pages.

After production deploys, `deploy.yml` and the deploy stage of `crawl-releases.yml` submit high-value URLs to IndexNow. This is intentionally scoped to tools, blog pages, latest channel releases, and recent stable releases instead of every historical release page.

---

## API Discovery

The existing public `GET /releases.json` dataset is discoverable through
`/.well-known/api-catalog`, with an OpenAPI contract at `/openapi.json` and
human-readable documentation at `/api-docs/`. API Docs is linked beside JSON API
in the Resources footer and from generated static page footers. These are static post-build
outputs, not a new backend. No filtering, pagination, writes, API keys, or health
endpoint are introduced. See [docs/api-discovery.md](docs/api-discovery.md) for
generation, hosting, and GET/HEAD validation.

## Deploy

`bun run build:web` now checks both application and Vite/plugin TypeScript before
building. This same command runs in deployment and crawler deployment workflows.

`robots.txt` allows public crawling and declares `ai-train=no, search=yes,
ai-input=yes`: search indexing and AI retrieval are permitted, while model
training is declined. Content Signals express preferences, not enforced access
restrictions, and do not guarantee crawler compliance or search visibility.
Maintain the policy in `packages/web/public/robots.txt`; no Cloudflare setting
is required. See [docs/architecture.md](docs/architecture.md#crawler-content-use-policy).

Supported HTML page URLs support `Accept: text/markdown`, serving the existing generated
Markdown while normal browsers retain HTML. The post-build generator packages
a scoped Pages Function and exact release redirects so `.md` filenames are not
captured by slash redirects. No new dependency or secret is required. Function
requests use the Workers allowance, and negotiated responses use safe no-store
caching. See [docs/markdown-negotiation.md](docs/markdown-negotiation.md) for the
route list, hosting implications, and local testing through `wrangler pages dev`.

Negotiation covers the homepage, release pages, versions hub, compatibility checker,
FAQ, and blog. API docs and the site changelog remain HTML-only. Query parameters
do not alter generated Markdown; the checker Markdown is a compatibility reference,
not an execution of an interactive lookup.

Push to `main` → `deploy.yml` builds, runs the generator, and deploys automatically with `npx --yes wrangler@4 pages deploy`.

Because every push to `main` can trigger deployment and release-data workflows, run the deploy-safe checks before committing or pushing:

```sh
git status --short
git diff --stat
git diff --check
```

```sh
bun run typecheck
bun run lint
bun run build:web
SITE_URL=https://flutterreleases.com node scripts/generate-release-pages.js
bun run test:site-pages
bun run test:release-consistency
bun run test:flutter-versions
bun run test:flutter-version-checker
bun run test:markdown-negotiation
bun run test:api-catalog
bun run test:theme
bun run test:analytics
git diff --check
```

Before committing, inspect `git status --short` again and avoid committing generated churn or temporary build folders unless the generated files are the intended change.

### Required GitHub Secrets

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token (Pages:Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Workers & Pages overview → right sidebar |

The crawler uses GitHub's automatically supplied `GITHUB_TOKEN`; no personal-token secret is required for its current workflow. `SITE_URL` is not required for the production deployment: deploy/crawler jobs set it explicitly, and scripts default to `https://flutterreleases.com`. The lightweight update workflow reads an optional `SITE_URL` secret. Keep site URL overrides aligned with `packages/web/website.config.json` when changing hosts.

### Optional Environment Values

| Variable | Purpose |
|---|---|
| `VITE_GA_MEASUREMENT_ID` | GA4 web stream measurement ID such as `G-XXXXXXXXXX`; when omitted, no analytics script is injected |
| `INDEXNOW_KEY` | Optional secret or repository variable when rotating the public IndexNow key; also publish its matching root key file |

GA4 custom events are documented in [docs/analytics.md](docs/analytics.md). Register useful event parameters such as `version`, `channel`, `platform`, `location`, `label`, `href`, and `result_count` as custom dimensions in GA4 if you want to use them in reports and explorations.

`VITE_GA_MEASUREMENT_ID` may be configured as either a GitHub Actions secret or repository variable. When it is omitted, the build leaves analytics code inactive.

### Cloudflare Pages headers

`packages/web/public/_headers` is copied into `dist/` by Vite and consumed for static Pages responses. It sets long-lived caching for assets/icons, short caching for selected release resources, Markdown content types, and API catalog/OpenAPI headers. Function-handled page responses explicitly set security and negotiation headers; do not assume `_headers` automatically applies to them. JSON, RSS, sitemap, API discovery, and verification files remain static, outside the scoped worker.

### Cloudflare Pages project (one-time setup)

```sh
npx --yes wrangler@4 pages project create flutterreleases
```

Or create it in the Cloudflare dashboard under **Workers & Pages → Create application → Pages**.

Deploy `packages/web/dist`, not an `out` directory. The generated `_worker.js` and `_routes.json` are detected by Pages; no paid Markdown conversion setting or new binding is needed. Requests to scoped HTML routes, including browser requests, use the Pages Functions allowance. See [Markdown negotiation](docs/markdown-negotiation.md) for caching and quota/fail-open considerations.

---

## Release Data Contract

`releases.json` is the public `{ meta, items }` snapshot. `meta.generated_at` records dataset generation time, not a freshness guarantee; `meta.count` records the number of items. The published OpenAPI contract describes the current interface and permits additive fields. Core record fields include:

| Field | Meaning |
|---|---|
| `version` | Flutter version/tag identifier or rolling `main`; required by the public contract |
| `channel` | Upstream channel; required by the public contract, never inferred solely from version syntax |
| `release_type` | Dataset release classification, not a guarantee about the included changes |
| `released` | Release date where available; historical values can be empty |
| `dart_version` | Bundled Dart SDK version when known; may be absent or null, not a compatibility range |
| `requires` | `{}` unless requirements are explicitly verified from an authoritative source |
| `platforms` | Object of download URLs keyed by platform |
| `release_notes` | Category-to-note-link mapping; `base` is the primary link where available |
| `source_urls` | Additive provenance URLs such as SDK archive, release notes, GitHub tag, or DEPS |
| `link_status` | Optional verification metadata for `release_notes` and platform downloads |
| `verified` | Crawler verification flag, not a guarantee that every field or live link is valid |
| `sources` | Source labels; use `source_urls` for concrete links |

Revision, build, and tag fields are also available where known. Optional facts can be absent or null; empty requirements do not mean there are no requirements. Consumers should tolerate additional fields and filter the full snapshot locally. See [API documentation](https://flutterreleases.com/api-docs/) and [docs/api-discovery.md](docs/api-discovery.md).

The dataset permits only one record per `version`. Supported identifiers follow Flutter version/tag forms such as `3.47.5`, `3.48.0-0.5.pre`, and `v1.9.1+hotfix.4`, plus the rolling `main` record. The daily crawler enforces these rules automatically; do not maintain duplicate channel records manually.

Release-note URL rules:

- Stable feature releases such as `3.44.0` use Flutter docs release notes.
- Stable hotfix/patch releases such as `3.44.9` use the Flutter stable changelog version anchor.
- Beta/dev releases use GitHub tag or commit links instead of stable docs pages.
- `link_status.release_notes` records the selected source and verification result.
- `link_status.downloads` records verification results for platform download URLs when checked.

Never edit `releases.json` manually — the crawler owns it.

### Provenance and unknown data policy

Trusted release sources are the official Flutter SDK archive, Flutter documentation, Flutter GitHub repository/tags/changelog, and Dart official sources when available. Do not use third-party pages as authoritative release facts.

Use these confidence states when adding new fields:

- `verified`: explicitly supported by an authoritative upstream source.
- `derived`: mechanically derived from authoritative structured data.
- `unknown`: not available with enough confidence.

Unknown data must remain missing or empty. Do not infer system requirements, minimum platform versions, summaries, breaking changes, or migration advice because they sound plausible.

---

## Potential Follow-ups

The compatibility checker and version history are already implemented. The following ideas are not commitments or currently available features; richer comparisons require authoritative change/platform data first.

| Feature | Description | Difficulty |
|---|---|---|
| Version diff / upgrade path | Pick two versions, see what changed (breaking changes, new APIs) | Hard |
| Breaking changes aggregator | Parse `flutter/flutter` changelog for `[Breaking Change]` tags per version | Hard |
| Push notifications | Notify subscribers when a new stable release drops | Medium |
| Native app | iOS/Android app with push notifications for new stable releases | Medium |

---

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). It explains which files own UI, release data, blog content, static SEO output, deployment, and crawler behavior, plus the checks required for each kind of change.

1. Fork the repo.
2. Create a branch: `git checkout -b feat/your-feature`.
3. Make a focused change and run the relevant validation suite.
4. Open a PR against `main` and describe whether the change affects generated output or automation.

Pushes to `main`, including PR merges, trigger the deployment workflow; manual deployment is also supported. The crawler separately deploys changed release data. Ask for explicit authorization before committing/pushing from an AI task, and preserve newer automated data commits when integrating work.

### Rules

**Do:**
- Keep `releases.json` in the crawler schema — update `useReleases.ts` if you change the shape
- Follow [docs/crawler.md](docs/crawler.md) for crawler source priority, release-note URL rules, download verification, and validation
- Run `bun run build:web && node scripts/generate-release-pages.js` locally before opening a PR
- Run `node scripts/validate-flutter-versions-page.js` after generating static pages when touching SEO output
- Run `node scripts/crawl-releases.js --all-channels` when changing crawler data rules
- Use `SITE_URL` env var in scripts for base URLs

**Don't:**
- Don't edit `releases.json`, `feed.xml`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, generated Markdown pages, `/flutter-versions/`, or `links.html` manually — they're auto-generated
- Don't switch package managers or add npm/yarn lockfiles; use Bun for project dependencies. The configured temporary `npx wrangler@4` deployment CLI is an intentional exception, not an npm dependency installation into the project.
- Don't remove or weaken the `validate-release-data.yml` guardrail
- Don't reintroduce `flutter_version`-only release objects (legacy schema — normalised in the generator)
- Don't publish inferred release facts without authoritative provenance

AI coding tools should follow [AGENTS.md](AGENTS.md), read [docs/design.md](docs/design.md) before UI work, and update the focused maintenance docs when changing behavior. Documentation-only changes need link/path validation and `git diff --check`, not a site rebuild.
