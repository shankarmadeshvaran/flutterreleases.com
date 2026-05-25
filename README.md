# flutterreleases.com

Browse every Flutter release — version, Dart SDK, channel, downloads, and release notes — in one place. Updated daily via GitHub Actions.

**Live site:** [flutterreleases.com](https://flutterreleases.com)

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite 7 + Tailwind CSS v4 |
| Routing | Wouter |
| Build | Bun + Turborepo monorepo |
| Deploy | Cloudflare Pages (via GitHub Actions) |
| Data pipeline | Node.js scripts + GitHub Actions (daily cron) |

---

## Project Structure

```
.github/
  workflows/
    deploy.yml           ← Builds + deploys to Cloudflare Pages on push to main
    crawl-releases.yml   ← Daily cron: crawls Flutter releases API → canonical releases.json
    update-releases.yml  ← Regenerates feed.xml + sitemap.xml + status only
    validate-release-data.yml ← Guardrail: fails on schema drift / suspiciously small data
packages/
  web/
    src/web/
      pages/
        index.tsx        ← Main page (filter, pagination, dark mode)
      components/
        Hero.tsx         ← Latest stable/beta pills (clickable → release notes)
        Header.tsx       ← Nav, dark mode toggle, Twitter + donate links
        FilterBar.tsx    ← Channel filter + search
        ReleaseTable.tsx ← Expandable rows, download chips, release note links
        Pagination.tsx
        Footer.tsx
      hooks/
        useReleases.ts   ← Fetches + normalises releases.json data
        useDarkMode.ts
      types/
        release.ts       ← Release, Channel, ReleaseType types
    public/
      data/
        releases.json    ← Source of truth, updated by crawler
scripts/
  crawl-releases.js      ← Hits Flutter releases API, writes releases.json
  generate-releases.js   ← Generates feed.xml, sitemap.xml
```

---

## Local Development

```sh
bun install
bun run dev        # starts Vite dev server at http://localhost:4200
```

## Build

```sh
bun run build:web  # outputs to packages/web/dist
```

---

## Deploy

Merging to `main` automatically triggers the **Deploy to Cloudflare Pages** workflow.

### Required GitHub Secrets

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token (use "Edit Cloudflare Workers" template or Pages:Edit permission) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right sidebar on any domain or Workers/Pages overview |

Add both under **Settings → Secrets and variables → Actions** in the repo.

### Cloudflare Pages project setup (one-time)

If the Pages project doesn't exist yet, create it first:
```sh
bunx wrangler pages project create flutterreleases
```
Or create it in the Cloudflare dashboard under **Workers & Pages → Create application → Pages**.

The workflow uses:
- **Build command:** `bun run build:web`
- **Output directory:** `packages/web/dist`
- **Project name:** `flutterreleases`

---

## Data Pipeline

| Workflow | Trigger | What it does |
|---|---|---|
| `crawl-releases.yml` | Daily 06:00 UTC | Hits Flutter SDK archive + GitHub metadata, writes canonical `packages/web/public/releases.json`, commits |
| `update-releases.yml` | On push to data/scripts | Regenerates `feed.xml`, `sitemap.xml`, `generation_status.json` only |
| `validate-release-data.yml` | On push to release data / schema files | Fails if `releases.json` drops schema or looks suspiciously small |
| `deploy.yml` | On push to `main` | Builds Vite app, deploys to Cloudflare Pages |

---

## UI Features

- **Hero pills** — Latest stable + beta versions shown at top; click to open release notes in new tab
- **Release table** — All releases paginated (10/page), filterable by channel (stable/beta/dev) and search
- **Expandable rows** — Click any row to expand: system requirements, all platform downloads, all release note links
- **Dark mode** — Persisted via localStorage
- **All links open in new tab** — Downloads, release notes, everything

## Contributor Rules

### Do
- Keep `packages/web/public/releases.json` in the crawler schema only.
- Update `useReleases.ts` if you touch the JSON shape.
- Let `crawl-releases.yml` own release data.
- Let `update-releases.yml` own feed/sitemap/status files only.
- Use `git pull --rebase && git push` in workflows that push back to `main`.

### Don’t
- Don’t reintroduce `flutter_version`-only release objects.
- Don’t let multiple workflows write the same release data file.
- Don’t use `npm ci` in this repo root; Bun workspaces are the source of truth.
- Don’t remove the schema guardrail workflow.
- Don’t change the release JSON format without updating the frontend and docs together.

### Release data contract
Current canonical release objects must include:
- `version`
- `channel`
- `release_type`
- `released`
- `dart_version`
- `requires`
- `platforms`
- `release_notes`

If any of those are missing, the UI or pipeline may break.

---

## Redesign (May 2025)

The `redesign` branch introduced a full rewrite from Next.js → Vite + React:

- Replaced Next.js with a Bun monorepo (Turborepo + Vite)
- New design system with CSS variables for theming, dark mode
- Flutter/Dart version pills with proper brand colours (no broken SVG icons)
- Removed "LATEST" badge from table rows — Hero pills serve that purpose
- Fixed all table links to open in new tab (`target="_blank"`) with `stopPropagation()` so row expand doesn't fire
- Added Cloudflare Pages deploy workflow (`deploy.yml`)
