#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import assert from 'assert/strict';

const ROOT = process.cwd();
const PUBLIC_RELEASES = path.join(ROOT, 'packages', 'web', 'public', 'releases.json');
const DIST_PAGE = path.join(ROOT, 'packages', 'web', 'dist', 'flutter-versions', 'index.html');
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
const sitemapXml = fs.readFileSync(DIST_SITEMAP, 'utf8');

const latestStable = latestByChannel(releases, 'stable');
const latestBeta = latestByChannel(releases, 'beta');
const latestDev = latestByChannel(releases, 'dev') || latestByChannel(releases, 'main');

assert.ok(latestStable, 'releases.json must include a stable release');
assert.ok(latestBeta, 'releases.json must include a beta release');
assert.ok(latestDev, 'releases.json must include a dev or main release');

assertIncludes(pageHtml, '<h1>Flutter Versions &amp; Releases</h1>', 'flutter versions page');
assertIncludes(pageHtml, `Latest Stable Flutter release`, 'flutter versions page');
assertIncludes(pageHtml, `Flutter ${latestStable.version}`, 'latest stable');
assertIncludes(pageHtml, `Dart version</dt><dd>${latestStable.dart_version || 'N/A'}</dd>`, 'latest stable Dart version');
assertIncludes(pageHtml, `Flutter ${latestBeta.version}`, 'latest beta');
assertIncludes(pageHtml, `Flutter ${latestDev.version}`, 'latest dev');

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

console.log('flutter-versions page validation passed');
