# FlutterReleases

[![Flutter Releases](https://img.shields.io/badge/Flutter-SDK-blue)](https://flutterreleases.com)
[![Dart Releases](https://img.shields.io/badge/Dart-SDK-0175C2)](https://flutterreleases.com)
[![Next.js](https://img.shields.io/badge/Built%20with-Next.js-black)](https://nextjs.org)
[![TailwindCSS](https://img.shields.io/badge/Styled%20with-TailwindCSS-38B2AC)](https://tailwindcss.com)
[![Node 24+](https://img.shields.io/badge/Node-24%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[FlutterReleases.com](https://flutterreleases.com) is an **unofficial, community-maintained resource** listing all Flutter SDK releases with Dart versions, release notes, and download links — automatically kept up to date.

Follow: [@devinmaking](https://x.com/devinmaking)

---

## Features

- Searchable, filterable table (stable / beta / main / hotfix)
- Paginated results — 10 releases per page
- Per-release download links (macOS arm64/x64, Windows, Linux)
- Release notes with per-section CTAs (Framework, iOS, Android, Web, etc.)
- JSON API at `/data/releases.json`
- RSS feed at `/feed.xml`
- Sitemap at `/sitemap.xml`

---

## How releases are kept up to date

Two GitHub Actions workflows run in sequence:

```
[crawl-releases.yml]  ──►  public/data/releases.json  ──►  [update-releases.yml]
      (daily + on-demand)         (commit to main)            (feed.xml + sitemap.xml)
```

### Workflow 1 — `crawl-releases.yml`

Runs daily at 06:00 UTC (or manually via `workflow_dispatch`).  
Executes `scripts/crawl-releases.js` which:

1. Loads the current `public/data/releases.json`
2. Fetches all releases from the **Google Flutter SDK Archive** (stable by default; pass `--all-channels` for beta too)
3. Compares versions — only processes entries not already in the JSON
4. For each new version:
   - Pulls framework revision and summary from **GitHub API** (`flutter/flutter` tags + releases)
   - Infers `release_type` (Hotfix if patch > 0, otherwise Release)
   - Constructs `release_notes` URLs from the docs.flutter.dev pattern
   - Detects `requires` (macOS, Xcode, Windows, Visual Studio, Linux) based on the Flutter version number
5. Writes new entries to the top of `items[]` and commits back to `main`

### Workflow 2 — `update-releases.yml`

Triggers on any push to `main` that touches `public/data/releases.json`.  
Runs `scripts/generate-releases.js` to rebuild:
- `public/feed.xml` — RSS feed
- `public/sitemap.xml` — XML sitemap
- `public/releases.json` — legacy fallback
- `public/generation_status.json` — build metadata

---

## Running the crawler manually

```bash
# Stable releases only (default)
node scripts/crawl-releases.js

# Stable + beta
node scripts/crawl-releases.js --all-channels

# Dry run — preview output, no file writes
node scripts/crawl-releases.js --dry-run

# With a GitHub token (avoids rate limits)
GITHUB_TOKEN=your_token node scripts/crawl-releases.js
```

A `GITHUB_TOKEN` is recommended. Without it, GitHub API requests are unauthenticated and rate-limited to 60/hour.

---

## Data schema

Each entry in `public/data/releases.json` follows this shape:

```jsonc
{
  "version": "3.32.0",                       // Flutter SDK version
  "channel": "stable",                        // stable | beta | main
  "release_type": "Release",                  // Release | Hotfix
  "released": "2025-05-20",                   // ISO 8601 date
  "dart_version": "3.8.0",                    // Dart SDK version
  "framework_revision": "abc1234",            // 7-char git sha
  "engine_revision": "def5678",               // engine commit sha
  "summary": "...",                           // first line of GitHub release body
  "requires": {
    "macos": "macOS 13.5+",
    "xcode": "Xcode 15.1+",
    "windows": "Windows 10+",
    "visual_studio": "Visual Studio 2022",
    "linux": "bash, git, curl, unzip"
  },
  "platforms": {
    "macos_arm64": "https://storage.googleapis.com/...",
    "macos_x64":   "https://storage.googleapis.com/...",
    "windows_x64": "https://storage.googleapis.com/...",
    "linux_x64":   "https://storage.googleapis.com/..."
  },
  "release_notes": {
    "base":      "https://docs.flutter.dev/release/release-notes/release-notes-3.32.0",
    "framework": "https://docs.flutter.dev/...#framework-changes",
    "material":  "https://docs.flutter.dev/...#material-library",
    "ios":       "https://docs.flutter.dev/...#ios",
    "android":   "https://docs.flutter.dev/...#android",
    "web":       "https://docs.flutter.dev/...#web",
    "windows":   "https://docs.flutter.dev/...#windows",
    "linux":     "https://docs.flutter.dev/...#linux"
  }
}
```

Notes:
- `release_notes.base` is `null` for very old releases (e.g. v1.0.0) where no docs page exists
- `release_notes.tools` anchor is always `null` — the `#tools` anchor does not exist on Flutter release notes pages
- Hotfix entries share the base URL of their `.0` parent (e.g. `3.32.1` → `release-notes-3.32.0`)

---

## Project structure

```
.
├── components/
│   ├── Header.js           # Top nav, dark mode toggle
│   ├── ReleaseTable.js     # Main table — search, filters, pagination, downloads, notes
│   └── Seo.js              # <head> meta tags
├── models/
│   └── Release.js          # Normalizes raw JSON entries into UI-ready shape
├── pages/
│   └── index.js            # getStaticProps loads releases.json, passes to ReleaseTable
├── public/
│   ├── data/
│   │   └── releases.json   # Primary data source (crawler output)
│   ├── releases.json       # Legacy fallback (generator output)
│   ├── feed.xml            # RSS feed
│   ├── sitemap.xml         # XML sitemap
│   └── generation_status.json
├── scripts/
│   ├── crawl-releases.js   # Fetches new Flutter releases and updates releases.json
│   └── generate-releases.js # Builds feed.xml, sitemap.xml from releases.json
├── .github/workflows/
│   ├── crawl-releases.yml  # Runs crawler daily (06:00 UTC)
│   └── update-releases.yml # Rebuilds feed/sitemap on releases.json change
└── README.md
```

---

## Local development

```bash
# Prerequisites: Node 24+

npm ci
npm run dev      # dev server at http://localhost:3000
npm run build    # production build
npm run start    # production server
```

To test the crawler locally, copy `.env.example` to `.env` and set `GITHUB_TOKEN`, then run:

```bash
node scripts/crawl-releases.js --dry-run
```

---

## Tech stack

- **Next.js** — React framework, static site generation via `getStaticProps`
- **Tailwind CSS** — utility-first styling, dark mode
- **lunr** — client-side full-text search
- **Node.js** — crawler and generator scripts
- **GitHub Actions** — fully automated daily updates

---

## Contributing

Contributions are welcome.

1. **Bug reports / missing data** — open a [GitHub Issue](../../issues)
2. **Crawler improvements** — edit `scripts/crawl-releases.js`; test with `--dry-run` first
3. **UI improvements** — edit components in `components/`; follow existing Tailwind patterns
4. **Schema additions** — update both the crawler output and `models/Release.js` normalization

### Guidelines

- Fork → branch → PR (keep PRs small and focused)
- Run `npm run build` before submitting — no build errors
- Validate JSON with `jq . public/data/releases.json` and XML with `xmllint`
- Crawler PRs should include a `--dry-run` output sample in the PR description

---

## Disclaimer

Not affiliated with Google or the Flutter team. All SDK downloads are hosted by Google; links go directly to Flutter's official infrastructure.

---

## License

MIT — see [LICENSE](./LICENSE)

Made with ❤️ by [@devinmaking](https://x.com/devinmaking)
