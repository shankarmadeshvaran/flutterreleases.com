# Markdown Content Negotiation

Clients can explicitly request `text/markdown` at an HTML page URL. Ordinary
browser requests retain HTML. Accept selects the representation, not bot identity.

| HTML URL | Generated Markdown |
|---|---|
| `/` | `/index.md` |
| `/release/<version>/` | `/release/<version>.md` |
| `/flutter-versions/` | `/flutter-versions.md` |
| `/tools/flutter-version-checker/` | `/flutter-dart-compatibility.md` |
| `/faq/` | `/faq.md` |
| `/blog/` | `/blog.md` |
| `/blog/<slug>/` | `/blog/<slug>.md` |

The checker representation is a static compatibility reference, not an execution
of a lookup or unsaved browser input. Query parameters do not change generated
Markdown; use a specific release URL or JSON dataset when selecting a version.

## Generation and Delivery

`generate-release-pages.js` creates HTML and Markdown from `releases.json` and
existing content, then packages an advanced-mode Pages `_worker.js` with its
route map, `_routes.json`, and exact release redirects in `dist/_redirects`.
Only successfully generated Markdown is registered.

The runtime source is `scripts/markdown-negotiation.js`. It reads assets through
the built-in `env.ASSETS` binding. It does not scrape HTML, convert at runtime,
fetch upstream sources, or create another release database.

Normal and crawler deployment workflows validate the generated handler before
the existing `wrangler pages deploy` command. No new dependency, secret, binding,
or paid Cloudflare Markdown-conversion setting is needed. The scheduled crawler,
its JSON schema, and discovery logic remain unchanged. New releases are included
on the next generation/deployment.

The old `/release/:version` redirect also matched `.md` filenames. Public
redirects now contain legacy aliases only; the generator adds exact release
slash redirects. Function code preserves those behaviors because Pages does not
automatically apply `_redirects` to Function-handled requests.

## Negotiation Rules

- Absent Accept, browser Accept, and wildcards retain HTML.
- Explicit Markdown with positive quality is eligible; a higher HTML preference
  selects HTML. Equal preferences select explicit Markdown.
- `text/markdown;q=0` never selects Markdown.
- Markdown responses use `Content-Type: text/markdown; charset=utf-8`.
- Negotiable page responses merge `Vary: Accept` with existing Vary values.
- Markdown responses advertise canonical HTML through a Link header.
- Successful homepage HTML and Markdown responses also append API discovery
  Link headers generated from the catalog definitions. Existing links are retained.
- GET and HEAD are supported; HEAD returns headers without a body.
- HTML validators/ranges are not reused to validate a Markdown representation.
- Unknown release/Markdown routes return 404, not a mislabeled SPA fallback.
- Direct `.md` files remain supported; accidental `.md/` routes redirect to `.md`.
- JSON, RSS, sitemap, robots, verification files, and static assets retain their
  existing delivery routes. Known blog cover images are explicitly excluded.
- Token counts are omitted because there is no authoritative tokenizer.
- HTML remains canonical; no machine URLs are added to the sitemap, and no
  robots, noindex, or training-policy changes are introduced.

Negotiable page responses use `Cache-Control: private, no-store`. This prevents
shared caches from mixing HTML and Markdown at the same URL, at the cost of
outer-response browser/CDN caching. Asset subrequests retain Pages delivery and
direct Markdown resources keep their short cache. Do not add Cache Everything
rules over these routes without testing representation isolation.

## Hosting Implications

Function routing uses paths rather than Accept headers. Browsers on supported
routes also invoke the Function. Requests count toward the shared Workers/Pages
Functions allowance; other static resources remain outside the handler.

Choose fail-open in Pages Runtime settings if static HTML should remain available
when the allowance is exhausted. Negotiation may temporarily stop in this state;
direct Markdown files and exact static redirects remain available.

## Local Checks

```sh
bun run build:web
SITE_URL=https://flutterreleases.com node scripts/generate-release-pages.js
bun run test:markdown-negotiation
npx --yes wrangler@4 pages dev packages/web/dist --port 4175 --compatibility-date 2026-10-13
```

Then, in another terminal:

```sh
curl -i http://localhost:4175/release/3.47.7/ -H 'Accept: text/markdown'
curl -I http://localhost:4175/release/3.47.7.md
curl -I http://localhost:4175/release/3.47.7/
```

Select any current dataset version; the example is illustrative. Vite dev/preview
does not execute `_worker.js`. Run lint, type checking, and existing static/data
checks before publishing. Verify preview/production with alternating HTML and
Markdown requests, redirects, HEAD, missing files, and unaffected JSON/XML.

References:

- [Negotiation skill](https://isitagentready.com/.well-known/agent-skills/markdown-negotiation/SKILL.md)
- [Cloudflare Markdown for Agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/)
- [Pages advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/)
- [Pages routing](https://developers.cloudflare.com/pages/functions/routing/)
- [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/)
