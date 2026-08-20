#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import assert from 'assert/strict';

const ROOT = process.cwd();
const PUBLIC_RELEASES = path.join(ROOT, 'packages', 'web', 'public', 'releases.json');
const DIST_PAGE = path.join(ROOT, 'packages', 'web', 'dist', 'flutter-versions', 'index.html');
const DIST_HOME = path.join(ROOT, 'packages', 'web', 'dist', 'index.html');
const DIST_SITEMAP = path.join(ROOT, 'packages', 'web', 'dist', 'sitemap.xml');
const DIST_LINKS = path.join(ROOT, 'packages', 'web', 'dist', 'links.html');
const DIST_FEED = path.join(ROOT, 'packages', 'web', 'dist', 'feed.xml');
const DIST_REDIRECTS = path.join(ROOT, 'packages', 'web', 'dist', '_redirects');
const SITE_URL = process.env.SITE_URL || 'https://flutterreleases.com';

function readReleases() {
  const parsed = JSON.parse(fs.readFileSync(PUBLIC_RELEASES, 'utf8'));
  return Array.isArray(parsed) ? parsed : parsed.items || [];
}

function latestByChannel(items, channel) {
  return items.find(r => r.channel === channel && r.version);
}

function stableReleases(items) {
  return items.filter(r => r.channel === 'stable' && r.version);
}

function changelogAnchor(version) {
  return String(version)
    .replace(/^v/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function stableChangelogUrl(version) {
  return `https://github.com/flutter/flutter/blob/stable/CHANGELOG.md#${changelogAnchor(version)}`;
}

function isStableFeatureRelease(version) {
  const clean = String(version).replace(/^v/, '');
  if (clean.includes('-') || clean.includes('+')) return false;
  const parts = clean.split('.');
  return parts.length >= 3 && Number.parseInt(parts[2], 10) === 0;
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
const linksHtml = fs.readFileSync(DIST_LINKS, 'utf8');
const feedXml = fs.readFileSync(DIST_FEED, 'utf8');
const redirects = fs.readFileSync(DIST_REDIRECTS, 'utf8');

const latestStable = latestByChannel(releases, 'stable');
const latestBeta = latestByChannel(releases, 'beta');
const latestDev = latestByChannel(releases, 'dev') || latestByChannel(releases, 'main');
const stable = stableReleases(releases);
const latestFeatureStable = stable.find(release => isStableFeatureRelease(release.version));

assert.ok(latestStable, 'releases.json must include a stable release');
assert.ok(latestBeta, 'releases.json must include a beta release');
assert.ok(latestDev, 'releases.json must include a dev or main release');
assert.ok(stable.length > 0, 'releases.json must include stable releases');
assert.ok(latestFeatureStable, 'releases.json must include a stable .0 feature release');

for (const release of stable) {
  if (isStableFeatureRelease(release.version)) continue;
  assert.equal(
    release.release_notes?.base,
    stableChangelogUrl(release.version),
    `stable hotfix release notes should point to Flutter changelog for ${release.version}`
  );
}

assert.match(
  latestFeatureStable.release_notes?.base || '',
  /^https:\/\/docs\.flutter\.dev\/release\/release-notes\/release-notes-/,
  `stable feature release notes should point to Flutter docs for ${latestFeatureStable.version}`
);
assert.equal(
  latestStable.link_status?.release_notes?.ok,
  true,
  `latest stable release notes should be verified for ${latestStable.version}`
);
const latestStableDownloads = Object.entries(latestStable.platforms || {}).filter(([, url]) => url);
assert.ok(latestStableDownloads.length > 0, `latest stable should include download URLs for ${latestStable.version}`);
for (const [platform] of latestStableDownloads) {
  assert.equal(
    latestStable.link_status?.downloads?.[platform],
    true,
    `latest stable ${platform} download should be verified for ${latestStable.version}`
  );
}

assertIncludes(pageHtml, '<h1>Flutter Versions &amp; Releases</h1>', 'flutter versions page');
assertIncludes(pageHtml, '<title>Flutter Versions &amp; Releases — Latest Stable Flutter SDK</title>', 'flutter versions page title');
assertIncludes(pageHtml, `<link rel="canonical" href="${SITE_URL}/flutter-versions/" />`, 'flutter versions canonical');
assertIncludes(pageHtml, `Latest Stable Flutter release`, 'flutter versions page');
assertIncludes(pageHtml, `Flutter ${latestStable.version}`, 'latest stable');
assertIncludes(pageHtml, `Dart version</dt><dd>${latestStable.dart_version || 'N/A'}</dd>`, 'latest stable Dart version');
assertIncludes(pageHtml, `Flutter ${latestBeta.version}`, 'latest beta');
assertIncludes(pageHtml, `Flutter ${latestDev.version}`, 'latest dev');
assertIncludes(pageHtml, '<h2>Stable Flutter Version History</h2>', 'version history heading');
assertIncludes(pageHtml, '<tr><th>Version</th><th>Dart version</th><th>Channel</th><th>Release date</th></tr>', 'version history table');
assertIncludes(pageHtml, '<h2>Flutter ↔ Dart compatibility</h2>', 'Dart compatibility heading');
assertIncludes(pageHtml, '<tr><th>Flutter version</th><th>Dart SDK</th><th>Channel</th><th>Release date</th></tr>', 'Dart compatibility table');
assertIncludes(pageHtml, '<h2>Beta and prerelease history</h2>', 'prerelease history heading');

for (const release of [latestStable, latestBeta, latestDev]) {
  assertIncludes(
    pageHtml,
    `${SITE_URL}/release/${encodeURIComponent(release.version)}/`,
    `release link for ${release.version}`
  );
}

for (const release of stable) {
  const canonicalUrl = `${SITE_URL}/release/${encodeURIComponent(release.version)}/`;
  assertIncludes(pageHtml, canonicalUrl, `stable release link on flutter-versions for ${release.version}`);
  assertIncludes(sitemapXml, `<loc>${canonicalUrl}</loc>`, `sitemap stable URL for ${release.version}`);
  assertIncludes(linksHtml, `href="${canonicalUrl}"`, `links.html stable URL for ${release.version}`);
}
assertIncludes(feedXml, `<link>${SITE_URL}/release/${encodeURIComponent(latestStable.version)}/</link>`, 'RSS latest stable canonical link');

assertIncludes(redirects, '/release/:version /release/:version/ 301', 'release trailing-slash redirect');

assertIncludes(
  sitemapXml,
  `<loc>${SITE_URL}/flutter-versions/</loc>`,
  'sitemap'
);

const sitemapReleaseUrls = [...sitemapXml.matchAll(/<loc>(https:\/\/flutterreleases\.com\/release\/[^<]+)<\/loc>/g)]
  .map(match => match[1]);
assert.ok(sitemapReleaseUrls.length > 0, 'sitemap must include release URLs');
for (const url of sitemapReleaseUrls) {
  assert.ok(url.endsWith('/'), `sitemap release URL must be canonical trailing slash: ${url}`);
}

assertIncludes(homeHtml, 'href="/flutter-versions/"', 'homepage internal link');
assertIncludes(homeHtml, 'Flutter Versions', 'homepage Flutter Versions anchor text');

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
const previousStable = stable[stable.findIndex(r => r.version === latestStable.version) + 1];
assertIncludes(
  releaseHtml,
  `href="${SITE_URL}/flutter-versions/"`,
  `release page backlink for ${latestStable.version}`
);
assertIncludes(
  releaseHtml,
  `<link rel="canonical" href="${SITE_URL}/release/${encodeURIComponent(latestStable.version)}/" />`,
  `release canonical for ${latestStable.version}`
);
assert.ok(
  !releaseHtml.includes('window.location.replace'),
  `release page must not client-side redirect for ${latestStable.version}`
);
assertIncludes(
  releaseHtml,
  `Flutter ${latestStable.version} Release — Dart ${latestStable.dart_version}, Downloads &amp; Release Notes`,
  `stable release title for ${latestStable.version}`
);
assertIncludes(
  releaseHtml,
  `Flutter ${latestStable.version} release details including Dart SDK version, release date, downloads, requirements and release notes.`,
  `stable release meta description for ${latestStable.version}`
);
assertIncludes(
  releaseHtml,
  `Flutter ${latestStable.version} is a stable Flutter SDK release`,
  `stable release contextual copy for ${latestStable.version}`
);
if (previousStable) {
  assertIncludes(
    releaseHtml,
    `Previous stable:</strong> <a href="${SITE_URL}/release/${encodeURIComponent(previousStable.version)}/">Flutter ${previousStable.version}</a>`,
    `previous stable link for ${latestStable.version}`
  );
}

console.log('flutter-versions page validation passed');
