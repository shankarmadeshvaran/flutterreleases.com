#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import assert from 'assert/strict';

const ROOT = process.cwd();
const PUBLIC_RELEASES = path.join(ROOT, 'packages', 'web', 'public', 'releases.json');
const DIST_PAGE = path.join(ROOT, 'packages', 'web', 'dist', 'tools', 'flutter-version-checker', 'index.html');
const DIST_HOME = path.join(ROOT, 'packages', 'web', 'dist', 'index.html');
const SITE_URL = process.env.SITE_URL || 'https://flutterreleases.com';

const CHANNEL_ORDER = { stable: 0, beta: 1, dev: 2, main: 3 };

function readReleases() {
  const parsed = JSON.parse(fs.readFileSync(PUBLIC_RELEASES, 'utf8'));
  return Array.isArray(parsed) ? parsed : parsed.items || [];
}

function releaseTime(release) {
  const time = release.released ? new Date(release.released).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function sortReleasesForCompatibility(items) {
  return [...items].sort((a, b) => {
    const channelDelta = (CHANNEL_ORDER[a.channel] ?? 4) - (CHANNEL_ORDER[b.channel] ?? 4);
    if (channelDelta !== 0) return channelDelta;
    return releaseTime(b) - releaseTime(a);
  });
}

function getDartVersionForFlutter(items, flutterVersion) {
  return items.find(release => release.version === flutterVersion);
}

function getFlutterVersionsForDart(items, dartVersion) {
  return sortReleasesForCompatibility(items.filter(release => release.dart_version === dartVersion));
}

function checkFlutterDartCompatibility(items, flutterVersion, dartVersion) {
  const flutterRelease = getDartVersionForFlutter(items, flutterVersion);
  const dartReleases = getFlutterVersionsForDart(items, dartVersion);
  const bundledDartVersion = flutterRelease?.dart_version;
  return {
    compatible: Boolean(flutterRelease && dartVersion && bundledDartVersion === dartVersion),
    flutterRelease,
    bundledDartVersion,
    dartReleases,
  };
}

function assertIncludes(haystack, needle, label) {
  assert.ok(haystack.includes(needle), `${label} missing expected content: ${needle}`);
}

const releases = readReleases();
const stable = releases.filter(release => release.channel === 'stable' && release.version && release.dart_version);
const beta = releases.filter(release => release.channel === 'beta' && release.version && release.dart_version);
const latestStable = sortReleasesForCompatibility(stable)[0];
const betaWithStableDart = beta.find(release => stable.some(stableRelease => stableRelease.dart_version === release.dart_version));
const multiMatchDart = releases.find(release => {
  const matches = getFlutterVersionsForDart(releases, release.dart_version || '');
  return release.dart_version && matches.length > 1;
})?.dart_version;

assert.ok(latestStable, 'releases.json must include stable releases with Dart versions');
assert.ok(multiMatchDart, 'releases.json must include at least one Dart version used by multiple Flutter releases');

const latestStableLookup = getDartVersionForFlutter(releases, latestStable.version);
assert.equal(latestStableLookup?.dart_version, latestStable.dart_version, 'Flutter → Dart lookup returns exact Dart version');

const dartMatches = getFlutterVersionsForDart(releases, multiMatchDart);
assert.ok(dartMatches.length > 1, 'Dart → Flutter lookup returns every matching Flutter release');
assert.ok(
  dartMatches.every(release => release.dart_version === multiMatchDart),
  'Dart → Flutter lookup should only return releases with the selected Dart version'
);

if (betaWithStableDart) {
  const mixedMatches = getFlutterVersionsForDart(releases, betaWithStableDart.dart_version);
  const firstBetaIndex = mixedMatches.findIndex(release => release.channel === 'beta');
  const lastStableIndex = mixedMatches.map(release => release.channel).lastIndexOf('stable');
  assert.ok(
    lastStableIndex === -1 || firstBetaIndex === -1 || lastStableIndex < firstBetaIndex,
    'Stable matches should be sorted before beta matches'
  );
}

const compatible = checkFlutterDartCompatibility(releases, latestStable.version, latestStable.dart_version);
assert.equal(compatible.compatible, true, 'Matching Flutter/Dart pair should be compatible');

const differentDart = releases.find(release => release.dart_version && release.dart_version !== latestStable.dart_version)?.dart_version;
assert.ok(differentDart, 'Need a different Dart version to validate incompatible case');
const incompatible = checkFlutterDartCompatibility(releases, latestStable.version, differentDart);
assert.equal(incompatible.compatible, false, 'Mismatched Flutter/Dart pair should be incompatible');
assert.equal(incompatible.bundledDartVersion, latestStable.dart_version, 'Incompatible result should expose bundled Dart version');

const pageHtml = fs.readFileSync(DIST_PAGE, 'utf8');
const homeHtml = fs.readFileSync(DIST_HOME, 'utf8');
const sitemapXml = fs.readFileSync(path.join(ROOT, 'packages', 'web', 'dist', 'sitemap.xml'), 'utf8');
const canonical = `${SITE_URL}/tools/flutter-version-checker/`;
const latestStableUrl = `${SITE_URL}/release/${encodeURIComponent(latestStable.version)}/`;

assertIncludes(pageHtml, '<h1>Flutter &amp; Dart Version Compatibility Checker</h1>', 'checker H1');
assertIncludes(pageHtml, '<title>Flutter &amp; Dart Version Compatibility Checker | FlutterReleases</title>', 'checker title');
assert.match(pageHtml, /<script type="module" crossorigin src="\/assets\/index-[^"]+\.js"><\/script>/, 'checker should include the built SPA script for interactive use');
assertIncludes(pageHtml, 'Check which Dart SDK version ships with any Flutter release and find Flutter versions compatible with a specific Dart version.', 'checker meta description');
assertIncludes(pageHtml, `<link rel="canonical" href="${canonical}" />`, 'checker canonical');
assertIncludes(pageHtml, '<h2>Stable Flutter and Dart Compatibility</h2>', 'stable compatibility heading');
assertIncludes(pageHtml, '<tr><th>Flutter</th><th>Dart</th><th>Channel</th><th>Released</th></tr>', 'compatibility table');
assertIncludes(pageHtml, latestStableUrl, `canonical release link for ${latestStable.version}`);
assertIncludes(pageHtml, `Flutter ${latestStable.version}`, `latest stable row ${latestStable.version}`);
assertIncludes(pageHtml, latestStable.dart_version, `latest stable Dart ${latestStable.dart_version}`);
assertIncludes(pageHtml, '<h2>Beta and Prerelease Flutter Versions</h2>', 'prerelease compatibility heading');
assertIncludes(pageHtml, 'Related Flutter version resources', 'related links');
assertIncludes(pageHtml, `${SITE_URL}/flutter-versions/`, 'Flutter versions internal link');
assertIncludes(pageHtml, '"@type": "WebPage"', 'WebPage structured data');
assertIncludes(pageHtml, '"@type": "BreadcrumbList"', 'Breadcrumb structured data');
assertIncludes(sitemapXml, `<loc>${canonical}</loc>`, 'sitemap checker URL');
assertIncludes(homeHtml, 'href="/tools/flutter-version-checker/"', 'homepage checker link');
assertIncludes(homeHtml, 'Flutter Dart Compatibility Checker', 'homepage checker anchor text');

for (const release of stable) {
  assertIncludes(
    pageHtml,
    `${SITE_URL}/release/${encodeURIComponent(release.version)}/`,
    `stable release link in checker table for ${release.version}`
  );
}

console.log('flutter-version-checker validation passed');
