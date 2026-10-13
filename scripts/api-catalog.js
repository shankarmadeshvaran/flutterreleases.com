import { normalizeSiteUrl } from './release-data-utils.js';

const nullableString = description => ({ type: ['string', 'null'], description });
const nullableStringMap = description => ({ type: 'object', description, additionalProperties: { type: ['string', 'null'] } });

export function buildDiscoveryLinkHeader(siteUrl) {
  const base = normalizeSiteUrl(siteUrl);
  const service = buildApiCatalog(base).linkset[0];
  const links = [`<${base}/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`];
  for (const relation of ['service-desc', 'service-doc']) {
    for (const link of service[relation]) {
      links.push(`<${link.href}>; rel="${relation}"; type="${link.type}"; anchor="${service.anchor}"`);
    }
  }
  return links.join(', ');
}

export function buildApiCatalog(siteUrl) {
  const base = normalizeSiteUrl(siteUrl);
  return {
    linkset: [{
      anchor: `${base}/releases.json`,
      'service-desc': [{ href: `${base}/openapi.json`, type: 'application/json' }],
      'service-doc': [{ href: `${base}/api-docs/`, type: 'text/html' }],
    }],
  };
}

export function buildOpenApi(siteUrl) {
  const base = normalizeSiteUrl(siteUrl);
  return {
    openapi: '3.1.1',
    info: {
      title: 'FlutterReleases Release Dataset',
      version: '1.0.0',
      description: 'Public, read-only JSON snapshot of Flutter releases. This version identifies the interface description, not a Flutter SDK version. Fetch the complete dataset and filter locally; no authentication, server-side filtering, or pagination is provided.',
    },
    servers: [{ url: base }],
    externalDocs: { description: 'Dataset documentation', url: `${base}/api-docs/` },
    security: [],
    paths: {
      '/releases.json': {
        get: {
          operationId: 'getReleaseDataset',
          summary: 'Read the complete published Flutter release dataset',
          responses: {
            '200': {
              description: 'Current published snapshot. Optional facts may be absent or null. Additional fields may be added; consumers should tolerate them.',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ReleaseDataset' } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        ReleaseDataset: {
          type: 'object', required: ['meta', 'items'], additionalProperties: true,
          properties: {
            meta: {
              type: 'object', required: ['generated_at', 'count'], additionalProperties: true,
              properties: {
                generated_at: { type: 'string', format: 'date-time', description: 'Dataset generation time, not a release date or guarantee of freshness.' },
                count: { type: 'integer', minimum: 0, description: 'Number of published records.' },
                source: { type: 'string', description: 'Optional pipeline source label.' },
              },
            },
            items: { type: 'array', items: { $ref: '#/components/schemas/Release' } },
          },
        },
        Release: {
          type: 'object', required: ['version', 'channel'], additionalProperties: true,
          properties: {
            version: { type: 'string', description: 'Flutter version identifier. Development records may use main rather than a semantic version.' },
            channel: { type: 'string', description: 'Published upstream channel; do not infer the channel from the version string.' },
            release_type: { type: 'string', description: 'Dataset classification, not an upstream guarantee about the changes included.' },
            released: { type: 'string', description: 'Published release date when available, generally YYYY-MM-DD. Historical records may have an empty value.' },
            dart_version: nullableString('Bundled Dart SDK version when known; not an arbitrary compatibility range.'),
            framework_revision: nullableString('Flutter framework revision when known.'),
            engine_revision: nullableString('Flutter engine revision when known.'),
            git_tag: nullableString('Published Git tag when known.'),
            build: nullableString('Build identifier when known.'),
            requires: { type: 'object', additionalProperties: true, description: 'Requirements only where supported by source evidence. An empty object does not mean that there are no requirements.' },
            platforms: nullableStringMap('Platform keys map to upstream download URLs or null. FlutterReleases does not host binaries.'),
            release_notes: nullableStringMap('Release-note links by category; base is the primary link when available.'),
            ref_url: nullableString('Upstream reference URL.'),
            verified: { type: 'boolean', description: 'Crawler verification flag; not a guarantee that every fact or external URL has been independently validated.' },
            sources: { type: 'array', items: { type: 'string' }, description: 'Source labels. Use source_urls for concrete provenance links.' },
            source_urls: nullableStringMap('Authoritative source links where available.'),
            link_status: { type: 'object', additionalProperties: true, description: 'Optional link-check results recorded by the crawler. Not a live service health endpoint.' },
          },
        },
      },
    },
  };
}
