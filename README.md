# FlutterReleases - Starter (Next.js + Tailwind)

This is a minimal static Next.js site that reads `public/data/releases.json` and renders a searchable/filterable table. The site is exportable and works well on Cloudflare Pages or any static host.

## Quick start

1. Install deps

```bash
npm install
```

2. Run dev

```bash
npm run dev
```

3. Build + export (static site)

```bash
npm run build
npm run export
# output will be in the `out/` folder
```

## Deploy to Cloudflare Pages

1. Push this repo to GitHub.
2. Open Cloudflare Pages and "Create a project". Connect your GitHub repo.
3. Set the build command to:

```
npm run build && npm run export
```

4. Set the build output directory to:

```
out
```

5. Deploy. Cloudflare Pages will provision HTTPS automatically once DNS is configured.

## Notes
- Keep `public/data/releases.json` updated by your ingestion script (GitHub Actions). The site reads that file at build time; updates require a new build (the ingestion workflow can commit to the repo to trigger a build).
- This starter is intentionally simple: no server runtime, client-side Lunr search, and static export for easy hosting.
```