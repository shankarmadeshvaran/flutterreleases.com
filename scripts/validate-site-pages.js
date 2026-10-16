#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'packages', 'web', 'dist');
const FAQ_HTML = path.join(DIST_DIR, 'faq', 'index.html');
const CHANGELOG_HTML = path.join(DIST_DIR, 'changelog', 'index.html');
const FAQ_MD = path.join(DIST_DIR, 'faq.md');
const FLUTTER_VERSIONS_MD = path.join(DIST_DIR, 'flutter-versions.md');
const SITEMAP = path.join(DIST_DIR, 'sitemap.xml');

function read(filePath) {
  assert.ok(fs.existsSync(filePath), `${filePath} should exist`);
  return fs.readFileSync(filePath, 'utf8');
}

function includes(html, text, label) {
  assert.ok(html.includes(text), `${label} should include ${text}`);
}

const faqHtml = read(FAQ_HTML);
const changelogHtml = read(CHANGELOG_HTML);
const faqMarkdown = read(FAQ_MD);
const flutterVersionsMarkdown = read(FLUTTER_VERSIONS_MD);
const sitemapXml = read(SITEMAP);
const linksHtml = read(path.join(DIST_DIR, 'links.html'));
includes(linksHtml, '<link rel="canonical" href="https://flutterreleases.com/links" />', 'release index');
includes(read(path.join(DIST_DIR, 'index.html')), 'href="/links"', 'homepage release index link');
const versionsHtml = read(path.join(DIST_DIR, 'flutter-versions', 'index.html'));
includes(versionsHtml, 'href="https://flutterreleases.com/links"', 'versions hub release index link');
for (const html of [linksHtml, versionsHtml, read(path.join(DIST_DIR, 'index.html'))]) {
  assert.ok(!/href="(?:https:\/\/flutterreleases\.com)?\/links\.html"/.test(html), 'Generated links must use the final extensionless release index URL');
}
for (const route of ['/links', '/links.html']) {
  assert.ok(!sitemapXml.includes(`<loc>https://flutterreleases.com${route}</loc>`), 'Helper index sitemap policy should remain unchanged');
}
const robotsSource = read(path.join(ROOT, 'packages', 'web', 'public', 'robots.txt'));
const robotsOutput = read(path.join(DIST_DIR, 'robots.txt'));
assert.equal(robotsOutput, robotsSource, 'Built robots.txt should preserve the source policy');
assert.match(robotsOutput, /^User-agent: \*\r?\nContent-Signal: ai-train=no, search=yes, ai-input=yes\r?\nAllow: \/$/m, 'Public content should permit crawling, search, and AI retrieval but decline training');
assert.match(robotsOutput, /^Sitemap: https:\/\/flutterreleases\.com\/sitemap\.xml$/m);
assert.ok(!/^Disallow:\s*\//m.test(robotsOutput), 'Public content should not be blocked');

includes(faqHtml, '<h1>FlutterReleases FAQ</h1>', 'FAQ page');
includes(faqHtml, '<link rel="canonical" href="https://flutterreleases.com/faq/" />', 'FAQ page');
includes(faqHtml, '<link rel="alternate" type="text/markdown" href="https://flutterreleases.com/faq.md" />', 'FAQ page');
includes(faqHtml, '"@type": "FAQPage"', 'FAQ structured data');
includes(faqHtml, 'Flutter Dart compatibility checker', 'FAQ internal links');
includes(sitemapXml, '<loc>https://flutterreleases.com/faq/</loc>', 'sitemap');
includes(faqMarkdown, '# FlutterReleases FAQ', 'FAQ Markdown');
assert.ok(!faqMarkdown.includes('<!doctype html>'), 'FAQ Markdown should not contain HTML boilerplate');
includes(flutterVersionsMarkdown, '# Flutter Versions & Releases', 'Flutter versions Markdown');
assert.ok(!flutterVersionsMarkdown.includes('<!doctype html>'), 'Flutter versions Markdown should not contain HTML boilerplate');

includes(changelogHtml, '<h1>FlutterReleases changelog</h1>', 'changelog page');
includes(changelogHtml, '<link rel="canonical" href="https://flutterreleases.com/changelog/" />', 'changelog page');
assert.ok(!sitemapXml.includes('<loc>https://flutterreleases.com/changelog/</loc>'), 'changelog should not be promoted in sitemap');

console.log('Site page validation passed.');

const legal = JSON.parse(read(path.join(ROOT, 'packages/web/src/web/data/legal.json')));
for (const page of legal.pages) {
  const html = read(path.join(DIST_DIR, page.slug, 'index.html'));
  includes(html, `<h1>${page.title}</h1>`, page.title);
  includes(html, `rel="canonical" href="https://flutterreleases.com/${page.slug}/"`, page.title);
  includes(html, `mailto:${legal.contact}`, page.title);
  includes(html, `<time datetime="${legal.updated}">`, page.title);
  for (const section of page.sections) includes(html, section.title, page.title);
  assert.ok(!html.includes('"@type": "FAQPage"'), 'Legal pages must not claim FAQ schema');
  includes(sitemapXml, `<loc>https://flutterreleases.com/${page.slug}/</loc>`, 'sitemap');
  includes(faqHtml, `/${page.slug}/`, 'static footer');
  includes(read(path.join(ROOT, 'packages/web/public/_redirects')), `/${page.slug} /${page.slug}/ 301`, 'legal redirect');
}
console.log('Legal page validation passed.');

const notFound = read(path.join(DIST_DIR, '404.html'));
includes(notFound, '<h1>Page not found</h1>', '404 page');
includes(notFound, '<meta name="robots" content="noindex" />', '404 page');
assert.ok(!notFound.includes('rel="canonical"'), 'Error page should not canonicalize a missing URL to another page');
assert.ok(!sitemapXml.includes('/404.html'), 'Error page is not a sitemap entry');
const recovery = JSON.parse(read(path.join(ROOT, 'packages/web/src/web/data/not-found.json')));
for (const link of recovery.links) includes(notFound, `href="${link.href}"`, '404 recovery links');

const baseUrl = process.argv.find(arg => arg.startsWith('--base-url='))?.slice('--base-url='.length);
if (baseUrl) {
  for (const method of ['GET', 'HEAD']) {
    const response = await fetch(`${baseUrl}/links`, { method, redirect: 'manual' });
    assert.equal(response.status, 200, `${method} release index must not redirect`);
    if (method === 'GET') includes(await response.text(), 'rel="canonical" href="https://flutterreleases.com/links"', 'served release index');
    else assert.equal(await response.text(), '');
    const alias = await fetch(`${baseUrl}/links.html`, { method, redirect: 'manual' });
    assert.equal(alias.status, 308, `${method} legacy index alias`);
    assert.equal(new URL(alias.headers.get('Location'), baseUrl).pathname, '/links');
  }
  for (const route of ['/missing-page', '/tools/missing-tool/', '/blog/missing-article/', '/release/not-a-release/']) {
    for (const method of ['GET', 'HEAD']) {
      const response = await fetch(`${baseUrl}${route}`, { method, headers: { Accept: 'text/html' }, redirect: 'manual' });
      assert.equal(response.status, 404, `${method} ${route}`);
      assert.match(response.headers.get('Content-Type'), /^text\/html/);
      const body = await response.text();
      if (method === 'HEAD') assert.equal(body, '');
      else includes(body, '<h1>Page not found</h1>', route);
    }
  }
  for (const route of ['/release', '/release/']) {
    const response = await fetch(`${baseUrl}${route}?source=legacy`, { redirect: 'manual' });
    assert.equal(response.status, 301);
    const destination = new URL(response.headers.get('Location'), baseUrl);
    assert.equal(destination.pathname, '/flutter-versions/');
    assert.equal(destination.search, '?source=legacy');
  }
  for (const link of recovery.links) assert.equal((await fetch(`${baseUrl}${link.href}`)).status, 200, link.href);
  console.log('Live 404 status, recovery links and legacy hub redirects passed.');
}
