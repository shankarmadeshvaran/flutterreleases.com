#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
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
const versions = new Set();

assert.ok(releases.length > 50, 'releases.json should contain release records');
for (const release of releases) {
  assert.ok(release.version, 'release record should include version');
  assert.ok(!versions.has(`${release.channel}:${release.version}`), `duplicate release record: ${release.channel}:${release.version}`);
  versions.add(`${release.channel}:${release.version}`);
  assert.ok(!release.summary, `release ${release.version} should not contain unsupported generated summary`);
  assert.deepEqual(release.requires || {}, {}, `release ${release.version} should not contain inferred requirements`);
  assert.ok(release.source_urls && typeof release.source_urls === 'object', `release ${release.version} should include source_urls`);
}

const latestStable = getLatestStable(releases);
const latestBeta = getLatestBeta(releases);
const latestDev = getLatestDev(releases);
assert.ok(latestStable, 'latest stable should be derived from dataset');
assert.ok(latestBeta, 'latest beta should be derived from dataset');
assert.ok(latestDev, 'latest dev/main should be derived from dataset');

assert.equal(getRelease(releases, latestStable.version)?.version, latestStable.version, 'getRelease should return latest stable');
assert.equal(getDartForFlutter(releases, latestStable.version), latestStable.dart_version, 'Flutter to Dart selector should match dataset');
assert.ok(getFlutterVersionsForDart(releases, latestStable.dart_version).some(release => release.version === latestStable.version), 'Dart to Flutter selector should include latest stable');

const context = getStableReleaseContext(releases, latestStable);
assert.ok(context.previous || context.next || context.series, 'stable release context should derive relationships');
assert.ok(sourceLinksForRelease(latestStable).length > 0, 'latest stable should expose source links');

const releaseHtml = fs.readFileSync(path.join(distDir, 'release', latestStable.version, 'index.html'), 'utf8');
const releaseMd = fs.readFileSync(path.join(distDir, 'release', `${latestStable.version}.md`), 'utf8');
const llmsFull = fs.readFileSync(path.join(distDir, 'llms-full.txt'), 'utf8');

assert.ok(releaseHtml.includes(`Flutter ${latestStable.version}`), 'release HTML should include latest stable version');
assert.ok(releaseHtml.includes(`Dart SDK:</strong> ${latestStable.dart_version}`), 'release HTML should include dataset Dart version');
assert.ok(releaseHtml.includes(`href="${releaseMarkdownUrl(latestStable, SITE_URL)}"`), 'release HTML should advertise Markdown alternate');
assert.ok(releaseMd.includes(`# Flutter ${latestStable.version}`), 'release Markdown should include latest stable version');
assert.ok(releaseMd.includes(`- Dart: ${latestStable.dart_version}`), 'release Markdown should include dataset Dart version');
assert.ok(!releaseMd.includes('<html'), 'release Markdown should not contain HTML boilerplate');
assert.ok(llmsFull.includes(`Latest stable: Flutter ${latestStable.version}`), 'llms-full latest stable should match dataset');

console.log('Release consistency validation passed.');
