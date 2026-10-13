# @flutterreleases/web

React + Vite frontend for [flutterreleases.com](https://flutterreleases.com).

## Dev

```sh
bun run dev       # http://localhost:5173
```

## Build

```sh
bun run build     # outputs to dist/
```

The build checks application and Vite/plugin TypeScript, then builds Vite and
copies public resources (including `_headers`) into `dist/`. For deployable
release HTML, Markdown, and API discovery, also run the post-build generator
from the repository root as shown below.

## Typecheck

```sh
bun run typecheck
```

## Pre-push Checks

From the repo root, run the deploy-safe checks before pushing to `main`:

```sh
git diff --check
cd packages/web
bun run typecheck
cd ../..
bunx oxlint . --deny-warnings --no-error-on-unmatched-pattern
bun run build:web
SITE_URL=https://flutterreleases.com node scripts/generate-release-pages.js
SITE_URL=https://flutterreleases.com node scripts/validate-flutter-versions-page.js
SITE_URL=https://flutterreleases.com node scripts/validate-flutter-version-checker.js
bun run test:site-pages
bun run test:release-consistency
bun run test:markdown-negotiation
bun run test:api-catalog
bun run test:theme
bun run test:analytics
```

See root [README](../../README.md) for full project docs.
See [API discovery](../../docs/api-discovery.md) and
[architecture](../../docs/architecture.md) for generation and ownership rules.
