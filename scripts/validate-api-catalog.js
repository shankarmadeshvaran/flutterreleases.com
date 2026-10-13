import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildApiCatalog, buildOpenApi, buildDiscoveryLinkHeader } from './api-catalog.js';

const dist = 'packages/web/dist';
const read = name => fs.readFileSync(path.join(dist, name), 'utf8');
const catalog = JSON.parse(read('.well-known/api-catalog'));
const spec = JSON.parse(read('openapi.json'));
const dataset = JSON.parse(read('releases.json'));
const docs = JSON.parse(fs.readFileSync('packages/web/src/web/data/api-docs.json', 'utf8'));
const base = spec.servers[0].url;
assert.deepEqual(catalog, buildApiCatalog(base));
assert.deepEqual(spec, buildOpenApi(base));
assert.equal(spec.openapi, '3.1.1');
assert.deepEqual(Object.keys(spec.paths), ['/releases.json']);
assert.deepEqual(Object.keys(spec.paths['/releases.json']), ['get']);
assert.deepEqual(spec.security, []);
assert.equal(catalog.linkset.length, 1);
assert.ok(!('status' in catalog.linkset[0]));
for (const link of [catalog.linkset[0].anchor, catalog.linkset[0]['service-desc'][0].href, catalog.linkset[0]['service-doc'][0].href]) {
  const url = new URL(link);
  assert.equal(url.origin, new URL(base).origin);
  const file = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname;
  assert.ok(fs.existsSync(path.join(dist, file)), `${link} should reference a real file`);
}

// Validate the JSON Schema keywords used by this intentionally small contract.
function assertSchema(value, schema, label = '$') {
  if (schema.$ref) return assertSchema(value, spec.components.schemas[schema.$ref.split('/').at(-1)], label);
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  assert.ok(types.includes(type) || (types.includes('integer') && Number.isInteger(value)), `${label}: unexpected ${type}`);
  if (schema.minimum !== undefined) assert.ok(value >= schema.minimum, label);
  if (schema.format === 'date-time') assert.ok(Number.isFinite(Date.parse(value)), label);
  if (type === 'object') {
    for (const key of schema.required || []) assert.ok(Object.hasOwn(value, key), `${label}.${key} required`);
    for (const [key, field] of Object.entries(value)) {
      const child = schema.properties?.[key] || (typeof schema.additionalProperties === 'object' ? schema.additionalProperties : null);
      if (child) assertSchema(field, child, `${label}.${key}`);
    }
  }
  if (type === 'array') value.forEach((item, index) => assertSchema(item, schema.items, `${label}[${index}]`));
}
assertSchema(dataset, spec.components.schemas.ReleaseDataset);
assert.equal(dataset.meta.count, dataset.items.length);
assertSchema({ version: 'main', channel: 'main', dart_version: null, new_optional_field: true }, spec.components.schemas.Release);
assert.throws(() => assertSchema({ channel: 'stable' }, spec.components.schemas.Release));
assert.throws(() => assertSchema({ version: 'main', channel: 'main', dart_version: 42 }, spec.components.schemas.Release));
for (const field of docs.fields) assert.ok(field.name in spec.components.schemas.Release.properties, field.name);
const html = read('api-docs/index.html');
for (const file of fs.readdirSync(dist, { recursive: true }).filter(file => file.endsWith('.html') && file !== 'index.html')) {
  const footer = read(file).match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0];
  assert.ok(footer?.includes(`href="${base}/api-docs/">API Docs</a>`), `${file}: static footer should link to API Docs`);
}
assert.ok(html.includes(`<h1>${docs.title}</h1>`));
assert.ok(html.includes(`rel="canonical" href="${base}/api-docs/"`));
assert.ok(!html.includes('"@type": "FAQPage"'), 'API docs are not a FAQ');
for (const section of docs.sections) assert.ok(html.includes(section.text.replaceAll("'", '&#39;')), section.id);
const sitemap = read('sitemap.xml');
assert.ok(sitemap.includes(`${base}/api-docs/`));
assert.ok(!sitemap.includes(`${base}/openapi.json`));
assert.ok(!sitemap.includes(`${base}/.well-known/api-catalog`));
const headers = read('_headers');
const block = headers.split('\n\n').find(block => block.startsWith('/.well-known/api-catalog\n'));
assert.ok(block?.includes('Content-Type: application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"'));
assert.ok(block.includes('rel="api-catalog"'));
assert.equal(buildApiCatalog('https://example.com/').linkset[0].anchor, 'https://example.com/releases.json');
assert.equal(buildOpenApi('https://example.com/').servers[0].url, 'https://example.com');
const routes = JSON.parse(read('_routes.json'));
for (const route of ['/.well-known/api-catalog', '/openapi.json', '/api-docs/']) {
  assert.ok(!routes.include.some(rule => rule === route || (rule.endsWith('*') && route.startsWith(rule.slice(0, -1)))), `${route} should remain a static asset`);
}

const liveBase = process.argv.find(arg => arg.startsWith('--base-url='))?.slice('--base-url='.length);
if (liveBase) {
  for (const method of ['GET', 'HEAD']) {
    for (const accept of ['text/html', 'text/markdown']) {
      const response = await fetch(`${liveBase}/`, { method, headers: { Accept: accept } });
      assert.equal(response.status, 200);
      assert.ok(response.headers.get('Link')?.includes(buildDiscoveryLinkHeader(base)), 'Homepage discovery links');
      assert.ok(response.headers.get('Content-Type')?.startsWith(accept));
      if (accept === 'text/markdown') assert.ok(response.headers.get('Link').includes('rel="canonical"'));
      if (method === 'HEAD') assert.equal(await response.text(), '');
    }
  }
  for (const [route, type] of [['/.well-known/api-catalog', 'application/linkset+json'], ['/openapi.json', 'application/json'], ['/api-docs/', 'text/html']]) {
    for (const method of ['GET', 'HEAD']) {
      const response = await fetch(`${liveBase}${route}`, { method, headers: { Accept: type }, redirect: 'manual' });
      assert.equal(response.status, 200, `${method} ${route}`);
      assert.ok(response.headers.get('Content-Type')?.startsWith(type), `${route}: Content-Type`);
      if (route === '/.well-known/api-catalog') assert.ok(response.headers.get('Link')?.includes('rel="api-catalog"'));
      if (method === 'HEAD') assert.equal(await response.text(), '');
      else if (route === '/.well-known/api-catalog') assert.deepEqual(await response.json(), catalog);
      else if (route === '/openapi.json') assert.deepEqual(await response.json(), spec);
      else assert.ok((await response.text()).includes(docs.title));
    }
  }
  const redirect = await fetch(`${liveBase}/api-docs`, { redirect: 'manual' });
  assert.equal(redirect.status, 301);
  assert.equal(new URL(redirect.headers.get('Location'), liveBase).pathname, '/api-docs/');
  console.log('Live GET/HEAD, content types, catalog Link header, and docs redirect passed.');
}
console.log(`API catalog, OpenAPI contract (${dataset.items.length} records), and static documentation passed.`);
