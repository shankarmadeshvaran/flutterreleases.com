#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  dedupeReleaseItems,
  getDartForFlutter,
  getFlutterVersionsForDart,
  getLatestBeta,
  getLatestDev,
  getLatestStable,
  getRelease,
  getStableReleaseContext,
  releaseMarkdownUrl,
  sourceLinksForRelease,
} from './release-data-utils.js';

const ROOT = process.cwd();
const SITE_URL = process.env.SITE_URL || 'https://flutterreleases.com';
const releasesPath = path.join(ROOT, 'packages', 'web', 'public', 'releases.json');
const distDir = path.join(ROOT, 'packages', 'web', 'dist');

const parsed = JSON.parse(fs.readFileSync(releasesPath, 'utf8'));
const releases = Array.isArray(parsed) ? parsed : parsed.items || [];
const canonicalReleases = dedupeReleaseItems(releases);

assert.ok(releases.length > 50, 'releases.json should contain release records');
for (const release of releases) {
  assert.ok(release.version, 'release record should include version');
  assert.ok(!release.summary, `release ${release.version} should not contain unsupported generated summary`);
  assert.deepEqual(release.requires || {}, {}, `release ${release.version} should not contain inferred requirements`);
  assert.ok(release.source_urls && typeof release.source_urls === 'object', `release ${release.version} should include source_urls`);
}

assert.equal(
  new Set(canonicalReleases.map(release => release.version)).size,
  canonicalReleases.length,
  'canonical release records should contain one record per version'
);
assert.ok(canonicalReleases.every(release => release.version !== 'undefined'), 'placeholder versions must be excluded');
const dedupeFixture = dedupeReleaseItems([
  { version: '3.0.0-0.1.pre', channel: 'dev', verified: false },
  { version: '3.0.0-0.1.pre', channel: 'beta', verified: true, dart_version: '2.17.0' },
  { version: 'undefined', channel: 'stable' },
]);
assert.equal(dedupeFixture.length, 1, 'dedupe selector should remove duplicate and invalid records');
assert.equal(dedupeFixture[0].channel, 'beta', 'dedupe selector should keep the stronger authoritative record');

const latestStable = getLatestStable(canonicalReleases);
const latestBeta = getLatestBeta(canonicalReleases);
const latestDev = getLatestDev(canonicalReleases);
assert.ok(latestStable, 'latest stable should be derived from dataset');
assert.ok(latestBeta, 'latest beta should be derived from dataset');
assert.ok(latestDev, 'latest dev/main should be derived from dataset');
const devMainDates = canonicalReleases
  .filter(release => release.channel === 'dev' || release.channel === 'main')
  .map(release => new Date(release.released || 0).getTime());
assert.equal(new Date(latestDev.released || 0).getTime(), Math.max(...devMainDates), 'latest dev/main should use the newest dated record');

assert.equal(getRelease(canonicalReleases, latestStable.version)?.version, latestStable.version, 'getRelease should return latest stable');
assert.equal(getDartForFlutter(canonicalReleases, latestStable.version), latestStable.dart_version, 'Flutter to Dart selector should match dataset');
assert.ok(getFlutterVersionsForDart(canonicalReleases, latestStable.dart_version).some(release => release.version === latestStable.version), 'Dart to Flutter selector should include latest stable');

const context = getStableReleaseContext(canonicalReleases, latestStable);
assert.ok(context.previous || context.next || context.series, 'stable release context should derive relationships');
assert.ok(sourceLinksForRelease(latestStable).length > 0, 'latest stable should expose source links');

const releaseHtml = fs.readFileSync(path.join(distDir, 'release', latestStable.version, 'index.html'), 'utf8');
const releaseMd = fs.readFileSync(path.join(distDir, 'release', `${latestStable.version}.md`), 'utf8');
const llmsFull = fs.readFileSync(path.join(distDir, 'llms-full.txt'), 'utf8');

assert.ok(releaseHtml.includes(`Flutter ${latestStable.version}`), 'release HTML should include latest stable version');
assert.ok(releaseHtml.includes(`<dt>Dart SDK</dt><dd class="mono">${latestStable.dart_version}</dd>`), 'release HTML should include dataset Dart version');
assert.ok(releaseHtml.includes(`href="${releaseMarkdownUrl(latestStable, SITE_URL)}"`), 'release HTML should advertise Markdown alternate');
assert.match(releaseHtml, /<link\b[^>]*rel="stylesheet"[^>]*>/, 'release HTML should load the compiled site stylesheet');
assert.ok(releaseHtml.includes('class="release-header"'), 'release HTML should include the site header');
assert.ok(releaseHtml.includes('class="release-theme-toggle"'), 'release HTML should include the shared theme control');
assert.ok(releaseMd.includes(`# Flutter ${latestStable.version}`), 'release Markdown should include latest stable version');
assert.ok(releaseMd.includes(`- Dart: ${latestStable.dart_version}`), 'release Markdown should include dataset Dart version');
assert.ok(!releaseMd.includes('<html'), 'release Markdown should not contain HTML boilerplate');
assert.ok(llmsFull.includes(`Latest stable: Flutter ${latestStable.version}`), 'llms-full latest stable should match dataset');

console.log('Release consistency validation passed.');
