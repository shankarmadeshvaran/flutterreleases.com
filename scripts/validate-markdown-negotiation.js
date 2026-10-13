import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMarkdownWorker, prefersMarkdown } from './markdown-negotiation.js';

for (const [header, expected] of [
  ['', false], ['text/html', false], ['*/*', false], ['text/*', false],
  ['text/markdown', true], ['TEXT/MARKDOWN; charset=utf-8', true],
  ['text/markdown;q=0, text/html', false],
  ['text/markdown;q=0.5,text/html;q=1', false],
  ['text/html;q=0.5,text/markdown;q=1', true],
  ['text/html,text/markdown', true], ['text/markdown;q=0.5,*/*;q=1', false],
  ['text/markdown;q=invalid', false], ['text/markdown;q=2', false],
  ['text/markdown;q=.5,text/html;q=0,*/*;q=1', true],
]) assert.equal(prefersMarkdown(header), expected, header || '(absent Accept)');

const dist = path.join(process.cwd(), 'packages/web/dist');
const routing = JSON.parse(fs.readFileSync(path.join(dist, '_routes.json'), 'utf8'));
for (const rules of [routing.include, routing.exclude]) {
  for (const rule of rules.filter(rule => rule.endsWith('*'))) {
    assert.ok(!rules.some(other => other !== rule && other.startsWith(rule.slice(0, -1))), `Overlapping Pages route: ${rule}`);
  }
}
const { default: worker } = await import(pathToFileURL(path.join(dist, '_worker.js')));
const data = JSON.parse(fs.readFileSync(path.join(dist, 'releases.json'), 'utf8'));
const items = Array.isArray(data) ? data : data.items;
const latest = items.find(item => item.channel === 'stable');
const older = items.filter(item => item.channel === 'stable').at(-1);
const beta = items.find(item => item.channel === 'beta');
const posts = JSON.parse(fs.readFileSync('packages/web/src/web/data/blog-posts.json', 'utf8'));
const files = [];
const env = { ASSETS: { async fetch(request) {
  const url = new URL(request.url);
  const name = decodeURIComponent(url.pathname);
  const file = path.join(dist, name.endsWith('/') ? `${name}index.html` : name);
  files.push({ path: url.pathname, request });
  if (!fs.existsSync(file)) return new Response('<html>SPA fallback</html>', { headers: { 'Content-Type': 'text/html' } });
  const markdown = file.endsWith('.md');
  return new Response(request.method === 'HEAD' ? null : fs.readFileSync(file), {
    headers: { 'Content-Type': markdown ? 'text/markdown; charset=utf-8' : 'text/html; charset=utf-8',
      Vary: 'Accept-Encoding', ETag: markdown ? '"markdown"' : '"html"' },
  });
} } };
const fetchPage = (route, accept, method = 'GET', extra = {}) => worker.fetch(new Request(`https://flutterreleases.com${route}`, {
  method, headers: { ...(accept ? { Accept: accept } : {}), ...extra },
}), env);

for (const [html, markdown] of [
  ['/', '/index.md'], ['/flutter-versions/', '/flutter-versions.md'],
  ['/tools/flutter-version-checker/', '/flutter-dart-compatibility.md'],
  ['/faq/', '/faq.md'], ['/blog/', '/blog.md'],
  ...[latest, older, beta].filter(Boolean).map(item => [`/release/${encodeURIComponent(item.version)}/`, `/release/${encodeURIComponent(item.version)}.md`]),
  ...posts.map(post => [post.href, `${post.href.slice(0, -1)}.md`]),
]) {
  const defaultResponse = await fetchPage(html);
  assert.equal(defaultResponse.status, 200);
  assert.match(defaultResponse.headers.get('Content-Type'), /^text\/html/);
  const response = await fetchPage(html, 'text/markdown');
  assert.equal(response.status, 200, html);
  assert.equal(response.headers.get('Content-Type'), 'text/markdown; charset=utf-8');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(response.headers.get('Vary'), 'Accept-Encoding, Accept');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  const text = await response.text();
  assert.equal(text, fs.readFileSync(path.join(dist, decodeURIComponent(markdown)), 'utf8'));
  assert.ok(!text.includes('<!doctype html>'));
  const head = await fetchPage(html, 'text/markdown', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.match(head.headers.get('Content-Type'), /^text\/markdown/);
  const direct = await fetchPage(markdown);
  assert.equal(direct.status, 200, markdown);
  assert.match(direct.headers.get('Content-Type'), /^text\/markdown/);
}

const releasePath = `/release/${encodeURIComponent(latest.version)}`;
const redirect = await fetchPage(`${releasePath}?source=test`, 'text/markdown');
assert.equal(redirect.status, 301);
assert.equal(redirect.headers.get('Location'), `https://flutterreleases.com${releasePath}/?source=test`);
const alias = await fetchPage('/release/v1.9.1%20hotfix.4/', 'text/markdown');
assert.equal(alias.headers.get('Location'), 'https://flutterreleases.com/release/v1.9.1%2Bhotfix.4/');
assert.equal((await fetchPage('/release/undefined/')).status, 301);
assert.equal((await fetchPage('/release/not-a-release/')).status, 404);
assert.equal((await fetchPage('/release/not-a-release.md')).status, 404);
assert.equal((await fetchPage('/release/%ZZ/')).status, 404);
assert.equal((await fetchPage(releasePath + '.md/')).status, 301);

await fetchPage(releasePath + '/', 'text/markdown', 'GET', {
  'If-None-Match': '"html"', 'If-Modified-Since': 'Tue, 13 Oct 2026 00:00:00 GMT', Range: 'bytes=0-20',
});
assert.equal(files.at(-1).request.headers.get('If-None-Match'), null);
assert.equal(files.at(-1).request.headers.get('Range'), null);
for (const file of ['/releases.json', '/feed.xml', '/sitemap.xml', '/robots.txt', '/assets/test.js']) {
  await fetchPage(file, 'text/markdown');
  assert.equal(files.at(-1).path, file, 'Unrelated resources must pass through');
}
const broken = createMarkdownWorker({ '/example/': '/missing.md' });
assert.equal((await broken.fetch(new Request('https://flutterreleases.com/example/', { headers: { Accept: 'text/markdown' } }), env)).status, 404);
const redirects = fs.readFileSync(path.join(dist, '_redirects'), 'utf8');
assert.ok(!redirects.includes('/release/:version'));
assert.ok(!redirects.split('\n').some(line => line.split(' ')[0]?.endsWith('.md')));
assert.ok(fs.readFileSync(path.join(dist, 'blog/index.html'), 'utf8').includes('href="https://flutterreleases.com/blog.md"'));
console.log('Markdown negotiation, direct routes, headers, redirects, HEAD, validators, and resource isolation passed.');
