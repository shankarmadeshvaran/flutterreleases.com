#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import assert from 'assert/strict';

const ROOT = process.cwd();
const PUBLIC_RELEASES = path.join(ROOT, 'packages', 'web', 'public', 'releases.json');
const DIST_PAGE = path.join(ROOT, 'packages', 'web', 'dist', 'flutter-versions', 'index.html');
const DIST_HOME = path.join(ROOT, 'packages', 'web', 'dist', 'index.html');
const DIST_SITEMAP = path.join(ROOT, 'packages', 'web', 'dist', 'sitemap.xml');
const SITE_URL = process.env.SITE_URL || 'https://flutterreleases.com';

function readReleases() {
  const parsed = JSON.parse(fs.readFileSync(PUBLIC_RELEASES, 'utf8'));
  return Array.isArray(parsed) ? parsed : parsed.items || [];
}

function latestByChannel(items, channel) {
  return items.find(r => r.channel === channel && r.version);
}

function assertIncludes(haystack, needle, label) {
  assert.ok(
    haystack.includes(needle),
    `${label} missing expected content: ${needle}`
  );
}

const releases = readReleases();
const pageHtml = fs.readFileSync(DIST_PAGE, 'utf8');
const homeHtml = fs.readFileSync(DIST_HOME, 'utf8');
const sitemapXml = fs.readFileSync(DIST_SITEMAP, 'utf8');

const latestStable = latestByChannel(releases, 'stable');
const latestBeta = latestByChannel(releases, 'beta');
const latestDev = latestByChannel(releases, 'dev') || latestByChannel(releases, 'main');

assert.ok(latestStable, 'releases.json must include a stable release');
assert.ok(latestBeta, 'releases.json must include a beta release');
assert.ok(latestDev, 'releases.json must include a dev or main release');

assertIncludes(pageHtml, '<h1>Flutter Versions &amp; Releases</h1>', 'flutter versions page');
assertIncludes(pageHtml, '<title>Flutter Versions &amp; Releases — Latest Stable Flutter SDK</title>', 'flutter versions page title');
assertIncludes(pageHtml, `<link rel="canonical" href="${SITE_URL}/flutter-versions/" />`, 'flutter versions canonical');
assertIncludes(pageHtml, `Latest Stable Flutter release`, 'flutter versions page');
assertIncludes(pageHtml, `Flutter ${latestStable.version}`, 'latest stable');
assertIncludes(pageHtml, `Dart version</dt><dd>${latestStable.dart_version || 'N/A'}</dd>`, 'latest stable Dart version');
assertIncludes(pageHtml, `Flutter ${latestBeta.version}`, 'latest beta');
assertIncludes(pageHtml, `Flutter ${latestDev.version}`, 'latest dev');
assertIncludes(pageHtml, '<h2>Flutter Version History</h2>', 'version history heading');
assertIncludes(pageHtml, '<tr><th>Version</th><th>Dart version</th><th>Channel</th><th>Release date</th></tr>', 'version history table');
assertIncludes(pageHtml, '<h2>Flutter ↔ Dart compatibility</h2>', 'Dart compatibility heading');
assertIncludes(pageHtml, '<tr><th>Flutter version</th><th>Dart SDK</th><th>Channel</th><th>Release date</th></tr>', 'Dart compatibility table');

for (const release of [latestStable, latestBeta, latestDev]) {
  assertIncludes(
    pageHtml,
    `${SITE_URL}/release/${encodeURIComponent(release.version)}`,
    `release link for ${release.version}`
  );
}

assertIncludes(
  sitemapXml,
  `<loc>${SITE_URL}/flutter-versions/</loc>`,
  'sitemap'
);

assertIncludes(homeHtml, 'href="/flutter-versions/"', 'homepage internal link');

const releasePage = path.join(
  ROOT,
  'packages',
  'web',
  'dist',
  'release',
  latestStable.version,
  'index.html'
);
const releaseHtml = fs.readFileSync(releasePage, 'utf8');
assertIncludes(
  releaseHtml,
  `href="${SITE_URL}/flutter-versions/"`,
  `release page backlink for ${latestStable.version}`
);

console.log('flutter-versions page validation passed');
