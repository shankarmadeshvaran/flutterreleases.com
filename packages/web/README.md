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

The build copies `public/_headers` into `dist/` for Cloudflare Pages cache/security headers.

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
```

See root [README](../../README.md) for full project docs.
