# Flutter Release Crawler Guide

This guide defines the rules for crawler-related changes. Follow it whenever editing `scripts/crawl-releases.js`, `scripts/generate-releases.js`, release data generation, or release-note/download validation.

## Source Priority

Use these sources in this order:

1. Official Flutter SDK archive
   - Canonical source for Flutter versions, channels, release dates, Dart SDK versions, framework hashes, and SDK download URLs.
   - Archive-backed download URLs should stay in `platforms`.
2. Flutter official release notes
   - Use for stable `.0` feature releases such as `3.44.0`.
   - Do not use these pages for hotfix/patch releases such as `3.44.9`.
3. Flutter stable changelog
   - Use for stable hotfix/patch releases.
   - Link to the version anchor in `https://github.com/flutter/flutter/blob/stable/CHANGELOG.md`.
4. GitHub release/tag/commit pages
   - Use for beta/dev/main releases and as fallback reference URLs.

Do not add manually curated release records when the data exists in `releases.json` or can be derived from official sources.

Do not use third-party websites as authoritative release facts. They may be useful for debugging, but published data must come from Flutter/Dart official sources or mechanically derived fields from those sources.

## URL Rules

- Release page URLs are canonical with trailing slashes: `/release/<version>/`.
- Do not generate both slash and non-slash release URLs in sitemap, RSS, `links.html`, JSON-LD, or internal links.
- Cloudflare Pages should redirect `/release/<version>` to `/release/<version>/`.
- `/flutter-versions/` must remain static and crawlable.

## Release Notes Rules

- Stable feature releases:
  - Example: `3.44.0`
  - `release_notes.base` should point to Flutter docs release notes.
  - `link_status.release_notes.source` should be `flutter-docs-release-notes`.
- Stable hotfix/patch releases:
  - Example: `3.44.9`
  - `release_notes.base` should point to Flutter stable `CHANGELOG.md` with the version anchor.
  - `link_status.release_notes.source` should be `flutter-stable-changelog`.
- Beta/dev releases:
  - Do not point to stable docs release-note pages.
  - Use GitHub tag/release/commit links as the reference target.

When possible, verify changelog anchors from the raw Markdown, not from GitHub fragment redirects.

## Download Rules

- Keep download URLs sourced from the official SDK archive.
- Store platform downloads under `platforms`.
- Recent stable/beta download URLs should be verified by default in crawler runs.
- Full historical download verification is opt-in with:

```sh
node scripts/crawl-releases.js --all-channels --verify-downloads
```

Avoid making the daily crawler perform an unbounded full historical download audit unless there is a strong reason.

## Provenance Rules

Each release should include additive `source_urls` when the corresponding source exists:

- `sdk_archive` for the official Flutter SDK archive.
- `release_notes` for verified Flutter docs release notes, stable changelog anchors, or GitHub release/tag pages.
- `github` for GitHub tag, release, commit, or DEPS references.

Only store source URLs that actually exist in the record or can be derived from an authoritative source. Do not guess release-note pages or GitHub tags when verification failed.

Generated HTML, Markdown, RSS, LLM files, and compatibility pages must read from `releases.json` or shared selectors. Do not maintain separate release facts for a new representation.

## Unknown Data Policy

Use these states when adding release facts:

- `verified`: explicitly supported by an authoritative upstream source.
- `derived`: mechanically derived from authoritative structured data.
- `unknown`: not available with enough confidence.

Unknown data must remain missing or empty. Do not fabricate:

- release summaries
- system requirements
- minimum iOS/macOS/Xcode versions
- breaking-change summaries
- compatibility claims beyond the bundled Dart SDK mapping

The current crawler keeps `requires` as `{}` unless requirements are verified from an authoritative upstream source. Generated pages should omit empty sections instead of printing repeated "Unknown" values.

## Data Contract

The UI depends on these existing fields:

- `version`
- `channel`
- `release_type`
- `released`
- `dart_version`
- `requires`
- `platforms`
- `release_notes`
- `source_urls`
- `ref_url`

Optional verification metadata belongs in `link_status`.

Do not remove or rename existing fields without updating:

- `packages/web/src/web/hooks/useReleases.ts`
- `scripts/generate-release-pages.js`
- `scripts/validate-flutter-versions-page.js`
- README documentation

## Validation Checklist

After crawler-related changes, run:

```sh
node --check scripts/crawl-releases.js
node --check scripts/generate-releases.js
node --check scripts/validate-flutter-versions-page.js
node --check scripts/validate-release-consistency.js
```

```sh
PATH=/Users/shankar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ./node_modules/.bin/oxlint scripts/crawl-releases.js scripts/generate-releases.js scripts/validate-flutter-versions-page.js --deny-warnings --no-error-on-unmatched-pattern
```

Run the crawler when data rules changed:

```sh
node scripts/crawl-releases.js --all-channels
```

Then regenerate static output:

```sh
bun run build:web
SITE_URL=https://flutterreleases.com node scripts/generate-release-pages.js
SITE_URL=https://flutterreleases.com node scripts/validate-flutter-versions-page.js
SITE_URL=https://flutterreleases.com node scripts/validate-release-consistency.js
```

Spot-check representative releases:

- Latest stable hotfix, such as `3.44.9`, points to `CHANGELOG.md#3449`.
- Latest stable `.0`, such as `3.44.0`, points to Flutter docs release notes.
- Latest stable download URLs are present and verified.
- A beta release does not point to stable docs release notes.
- Generated `/release/<version>/index.html` contains the expected release-note and download links.
- Generated `/release/<version>.md` contains the same Flutter, Dart, channel, release date, sources, and related-release values as the HTML page.
- Generated release pages show a Sources section when source data exists.

## Do Not

- Do not manually hardcode fake release data.
- Do not publish generated prose as release facts.
- Do not overwrite crawler-owned `releases.json` from a secondary generator.
- Do not add old missing beta/dev history unless the product intentionally wants that backfill.
- Do not weaken schema validation or static crawlability checks.
- Do not add `noindex` to old beta/dev pages unless explicitly requested.
