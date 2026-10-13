# Agent Instructions

These instructions apply across this repository. Keep changes focused on the
user's request and preserve existing URLs, functionality, and visual identity.

## Read Before Changing Code

- Read [CONTRIBUTING.md](CONTRIBUTING.md) and [architecture](docs/architecture.md)
  before implementation to identify the correct source owner and generation flow.
- For UI changes, read [design](docs/design.md). Reuse existing components, CSS
  variables, global theme behavior, and responsive patterns. Verify desktop and
  mobile layouts in light and dark modes; do not introduce page-specific themes.
- For crawler or release-data changes, follow [crawler rules](docs/crawler.md).
- For analytics changes, follow [analytics](docs/analytics.md).
- For content negotiation or Pages routing, follow
  [Markdown negotiation](docs/markdown-negotiation.md).
- For public dataset/API discovery, follow [API discovery](docs/api-discovery.md).

## Data and Compatibility

- `packages/web/public/releases.json` is crawler-owned canonical release data.
  Consume it and existing shared selectors; do not manually duplicate release facts.
- Publish only source-supported or mechanically derived facts. Missing information
  must remain missing, including platform requirements and compatibility claims.
- Preserve public JSON fields, canonical trailing-slash HTML URLs, Markdown
  alternates, RSS, sitemap, verification files, and useful internal links.
- Edit source files, not generated HTML/Markdown, feeds, LLM files, or generated
  worker/routing files. Run the owning generator to update representations.
- Prefer existing dependencies and conventions. Do not add a dependency, replace
  infrastructure, or change automation unless the task requires it.

## Validation

Use Bun and the existing scripts. For code, UI, content, or generation changes,
run the applicable checks from the repository root:

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
bun run test:theme
bun run test:analytics
git diff --check
```

Use the additional crawler checks in `docs/crawler.md` when appropriate. Test
Pages handlers with the real local Pages runtime, not only Vite preview. Check
essential generated content without JavaScript. For documentation-only edits,
verify references and run `git diff --check`; a rebuild is not normally needed.
Report failed or unavailable checks honestly rather than treating them as passes.

## Documentation and Publishing

- Update the relevant README and focused documentation when architecture,
  setup, dependencies, automation, or maintenance instructions change. Keep
  contributor guidance current instead of adding redundant research documents.
- Inspect the current diff and preserve unrelated user changes. Before cleanup,
  report deletion candidates and their usage evidence, then obtain user approval.
- Do not commit or push unless the user authorizes it. Every push to `main`
  triggers deployment and may start data workflows. Review generated churn,
  secrets, and temporary files before staging, and preserve newer crawler commits.
- When publishing is requested, verify the workflow outcome and affected live
  responses. State whether work is local, committed, pushed, or deployed.

This is repository guidance for coding tools, not a public website resource.
