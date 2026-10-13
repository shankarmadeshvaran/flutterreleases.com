# Public API Discovery

FlutterReleases exposes one public, read-only interface: `GET /releases.json`.
It returns the canonical `{ meta, items }` snapshot. There is no separate API
backend, API key, server-side filtering, pagination, or write operation.

## Generated Resources

The existing post-build `scripts/generate-release-pages.js` writes:

- `/.well-known/api-catalog`: an RFC 9727 Linkset containing the dataset endpoint
  and its `service-desc` and `service-doc` links.
- `/openapi.json`: an OpenAPI 3.1.1 description of the existing GET endpoint.
- `/api-docs/`: static HTML documentation, with the existing React theme and
  components when JavaScript runs. Essential content is present without JS.

`scripts/api-catalog.js` owns the interface description and catalog builders.
`packages/web/src/web/data/api-docs.json` holds shared documentation copy for
static HTML and the React page, not release facts. URLs are generated from
`SITE_URL` using the existing URL utility. The SPA uses `website.config.json`.
Keep those production base URLs aligned when changing hosting.

No release facts, current versions, or timestamps are manually duplicated in
the contract. New release records automatically remain covered by the contract.
Optional fields can be missing or null; additional properties are allowed for
backwards-compatible additions. Unknown requirements must remain unknown.
The schema is a conservative description, not a guarantee of dataset freshness,
upstream link health, service uptime, or a fixed rate-limit policy.

## Hosting

Successful homepage GET and HEAD responses advertise the catalog (`api-catalog`),
OpenAPI specification (`service-desc`), and API documentation (`service-doc`).
Service links use the dataset URL as their `anchor`, rather than implying the
homepage is an API endpoint. `buildDiscoveryLinkHeader()` consumes the catalog
definitions at generation time; the generated Pages worker appends the result.
HTML and negotiated Markdown retain their existing bodies, content types,
caching, and `Vary: Accept`. Existing Link values, including Markdown's canonical
HTML link, are preserved. No `describedby` relation is added without a distinct
descriptive resource that needs it.

No Transform Rule is needed. `_headers` alone is not the owner of these
Function-handled responses. If Pages falls back to static hosting because the
Function is unavailable, these homepage discovery headers may be absent.

These resources remain static assets outside the Markdown negotiation worker's
route scope. Cloudflare Pages `_headers` assigns the catalog
`application/linkset+json` with the RFC profile and an `api-catalog` Link header
on GET and HEAD. `/releases.json` and `/api-docs/` also advertise the catalog.
`_redirects` normalizes `/api-docs` to `/api-docs/`.

Only canonical HTML documentation goes into the sitemap. The catalog and
OpenAPI description do not. No health endpoint is advertised: the generated
status file is an internal pipeline artifact, not live service health. RSS,
Markdown, and sitemap files are not presented as separate APIs.

The Resources footer links to API Docs beside the direct JSON API download.
Generated static page footers also link to the docs, including release and blog
pages, so discovery does not depend on JavaScript. React footer clicks reuse
the existing navigation analytics.

No new dependencies, secrets, dashboard settings, or runtime service are needed.
Deployment and crawler deployment workflows generate and validate these files
before uploading, without changing the crawl schedule or update logic.
Both sitemap generators retain the canonical documentation URL on subsequent
automated updates.

## Validation

```sh
bun run build:web
SITE_URL=https://flutterreleases.com node scripts/generate-release-pages.js
bun run test:api-catalog
```

The check validates the dataset against the schema keywords used in the contract,
catalog links, optional/null/additive fields, static content, headers, and route
isolation. It is not a general-purpose OpenAPI validator.

For real HTTP validation, start the local Pages runtime as described in
[markdown-negotiation.md](markdown-negotiation.md), then run:

```sh
bun run test:api-catalog --base-url=http://127.0.0.1:4176
```

This checks GET/HEAD status, content types, the catalog Link header, and the
documentation redirect. After deployment, use the production base URL and run
the requested agent-readiness scan:

```sh
curl -X POST https://isitagentready.com/api/scan \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://flutterreleases.com"}'
```

Check `checks.discovery.apiCatalog.status`. A scanner result is supplementary;
correct links and responses are the contract.

Also check `checks.discoverability.linkHeaders.status` after deployment.
Local `test:api-catalog --base-url=...` checks homepage discovery on GET/HEAD
for HTML and Markdown, as well as the linked resources. A scan of production
cannot validate uncommitted local changes.

References: [RFC 9727](https://www.rfc-editor.org/info/rfc9727/),
[OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html).
