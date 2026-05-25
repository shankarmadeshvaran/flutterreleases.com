#!/usr/bin/env node
// scripts/crawl-releases.js
// Automatically discovers new Flutter releases and updates public/data/releases.json
//
// Data sources (in priority order):
//   1. Google Flutter SDK Archive  — canonical versions, download URLs, Dart version, commit hash
//   2. GitHub flutter/flutter tags — framework_revision (7-char short sha)
//   3. GitHub flutter/flutter releases — release body for summary extraction
//   4. docs.flutter.dev — release notes URLs (verified with real HEAD requests)
//
// URL Verification:
//   - release_notes.base: HEAD checked — set to null if 404
//   - release_notes section anchors: only set for anchors confirmed to exist in page HTML
//   - ref_url: HEAD checked — falls back to v-prefixed tag if plain version 404s
//   - platforms download URLs: sourced directly from Google's SDK archive (trusted, not re-checked)
//
// Usage:
//   node scripts/crawl-releases.js               # stable only (default)
//   node scripts/crawl-releases.js --all-channels # stable + beta
//   node scripts/crawl-releases.js --dry-run      # preview, no write
//   GITHUB_TOKEN=xxx node scripts/crawl-releases.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CURATED_PATH = path.join(ROOT, 'packages', 'web', 'public', 'releases.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
const DRY_RUN = process.argv.includes('--dry-run');
const ALL_CHANNELS = process.argv.includes('--all-channels');
const CHANNELS = ALL_CHANNELS ? ['stable', 'beta'] : ['stable'];

const BASE_ARCHIVE_URL = 'https://storage.googleapis.com/flutter_infra_release/releases';
const GITHUB_API = 'https://api.github.com';

// Section anchors we attempt to verify on release notes pages
const RELEASE_NOTE_ANCHORS = ['framework', 'material', 'ios', 'android', 'windows', 'linux', 'web', 'tools'];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchJson(url, { silent = false } = {}) {
  const headers = { 'User-Agent': 'FlutterReleasesCrawler/1.0 (+https://flutterreleases.com)' };
  if (GITHUB_TOKEN && url.startsWith(GITHUB_API)) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (!silent) console.warn(`  ⚠ HTTP ${res.status} for ${url}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    if (!silent) console.warn(`  ⚠ fetch failed for ${url}: ${e.message}`);
    return null;
  }
}

// HTTP HEAD check — returns true if URL responds 200
async function urlExists(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'FlutterReleasesCrawler/1.0 (+https://flutterreleases.com)' },
      redirect: 'follow',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Fetch page HTML and return which of the given anchor ids actually exist
async function verifyAnchors(pageUrl, anchors) {
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'FlutterReleasesCrawler/1.0 (+https://flutterreleases.com)' },
    });
    if (!res.ok) return new Set();
    const html = await res.text();
    const found = new Set();
    for (const anchor of anchors) {
      // Match id="anchor" or id='anchor'
      if (new RegExp(`id=["']${anchor}["']`).test(html)) {
        found.add(anchor);
      }
    }
    return found;
  } catch {
    return new Set();
  }
}

function shortSha(hash) {
  return hash ? hash.slice(0, 7) : null;
}

function safeWrite(filePath, content) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

// Detect release type: patch > 0 = Hotfix, patch = 0 = Release
// Also handles legacy formats like v1.12.13+hotfix.9 and v1.5.4-hotfix.2
function detectReleaseType(version) {
  if (version.includes('hotfix') || version.includes('hotfix')) return 'Hotfix';
  const clean = version.replace(/^v/, '');
  const parts = clean.split('.');
  const patch = parseInt(parts[2] || '0', 10);
  return patch > 0 ? 'Hotfix' : 'Release';
}

// Clean dart_sdk_version string like "3.12.0 (build 3.12.0-...)" → "3.12.0"
function cleanDartVersion(raw) {
  if (!raw) return null;
  return raw.split(' ')[0].trim();
}

// Detect minimum requirements based on Flutter version
function detectRequirements(version) {
  const clean = version.replace(/^v/, '');
  const [major, minor] = clean.split('.').map(Number);

  let macos = 'macOS 12+';
  let xcode = 'Xcode 15.0+';

  if (major > 3 || (major === 3 && minor >= 29)) {
    macos = 'macOS 13.5+';
    xcode = 'Xcode 15.1+';
  } else if (major === 3 && minor >= 10) {
    macos = 'macOS 12+';
    xcode = 'Xcode 14.0+';
  } else if (major < 3) {
    macos = 'macOS 10.14+';
    xcode = 'Xcode 12.0+';
  }

  return {
    macos,
    xcode,
    windows: 'Windows 10+',
    visual_studio: 'Visual Studio 2022',
    linux: 'bash, git, curl, unzip',
  };
}

// Build and VERIFY release_notes URLs:
//   - HEAD checks the base URL (set null if 404)
//   - Fetches page HTML once and checks which section anchors actually exist
async function buildReleaseNotes(version, releaseType) {
  // For hotfixes, point to the parent .0 release notes page
  const clean = version.replace(/^v/, '');
  const parts = clean.split('.');
  const baseVersion = `${parts[0]}.${parts[1]}.0`;
  const baseUrl = `https://docs.flutter.dev/release/release-notes/release-notes-${baseVersion}`;

  // HEAD check the base URL
  const baseExists = await urlExists(baseUrl);

  if (!baseExists) {
    // No release notes page exists for this version
    return {
      base: null,
      framework: null,
      material: null,
      ios: null,
      android: null,
      windows: null,
      linux: null,
      web: null,
      tools: null,
    };
  }

  if (releaseType !== 'Release') {
    // Hotfix: base only, no anchors (page is shared with .0)
    return {
      base: baseUrl,
      framework: null,
      material: null,
      ios: null,
      android: null,
      windows: null,
      linux: null,
      web: null,
      tools: null,
    };
  }

  // Major release: verify which anchors actually exist on the page
  const existingAnchors = await verifyAnchors(baseUrl, RELEASE_NOTE_ANCHORS);

  return {
    base: baseUrl,
    framework: existingAnchors.has('framework') ? `${baseUrl}#framework` : null,
    material: existingAnchors.has('material') ? `${baseUrl}#material` : null,
    ios: existingAnchors.has('ios') ? `${baseUrl}#ios` : null,
    android: existingAnchors.has('android') ? `${baseUrl}#android` : null,
    windows: existingAnchors.has('windows') ? `${baseUrl}#windows` : null,
    linux: existingAnchors.has('linux') ? `${baseUrl}#linux` : null,
    web: existingAnchors.has('web') ? `${baseUrl}#web` : null,
    tools: existingAnchors.has('tools') ? `${baseUrl}#tools` : null,
  };
}

// Verify and return the correct GitHub release URL for a version.
// Flutter tags can be bare (3.44.0) or v-prefixed (v1.0.0) — try both.
async function buildRefUrl(version) {
  const bare = `https://github.com/flutter/flutter/releases/tag/${version}`;
  if (await urlExists(bare)) return bare;

  // Try with v prefix for older versions
  const withV = `https://github.com/flutter/flutter/releases/tag/v${version}`;
  if (await urlExists(withV)) return withV;

  return null;
}

// Extract a clean one-line summary from GitHub release body
function extractSummary(body, version, releaseType) {
  if (!body) {
    return releaseType === 'Hotfix'
      ? `Hotfix release with stability improvements for the ${version.replace(/^v/, '').split('.').slice(0, 2).join('.')} series.`
      : `Flutter ${version} stable release.`;
  }

  const lines = body
    .split('\n')
    .map(l => l.trim())
    .filter(l =>
      l.length > 20 &&
      !l.startsWith('#') &&
      !l.startsWith('*') &&
      !l.startsWith('-') &&
      !l.startsWith('>') &&
      !l.startsWith('!') &&
      !l.startsWith('[') &&
      !l.startsWith('http')
    );

  if (lines.length > 0) {
    let summary = lines[0].replace(/\*\*/g, '').replace(/`/g, '').trim();
    if (summary.length > 120) summary = summary.slice(0, 117) + '...';
    return summary;
  }

  return releaseType === 'Hotfix'
    ? `Hotfix release with stability improvements for the ${version.replace(/^v/, '').split('.').slice(0, 2).join('.')} series.`
    : `Flutter ${version} stable release.`;
}

// ── Main data fetching ────────────────────────────────────────────────────────

async function fetchSDKArchive(channel) {
  console.log(`  Fetching SDK archive (${channel})...`);
  const data = await fetchJson(`${BASE_ARCHIVE_URL}/releases_linux.json`);
  if (!data) throw new Error('Failed to fetch Linux SDK archive');

  const macosData = await fetchJson(`${BASE_ARCHIVE_URL}/releases_macos.json`);
  const windowsData = await fetchJson(`${BASE_ARCHIVE_URL}/releases_windows.json`);

  const baseUrl = data.base_url;
  const byVersion = {};

  function addEntry(release, platform) {
    const v = release.version;
    if (release.channel !== channel) return;
    if (!byVersion[v]) {
      byVersion[v] = {
        channel: release.channel,
        release_date: release.release_date,
        dart_sdk_version: release.dart_sdk_version,
        hash: release.hash,
        platforms: {},
      };
    }
    const arch = release.dart_sdk_arch || 'x64';
    byVersion[v].platforms[`${platform}_${arch}`] = `${baseUrl}/${release.archive}`;
  }

  for (const r of data.releases) addEntry(r, 'linux');
  if (macosData) for (const r of macosData.releases) addEntry(r, 'macos');
  if (windowsData) for (const r of windowsData.releases) addEntry(r, 'windows');

  const result = {};
  for (const [version, info] of Object.entries(byVersion)) {
    result[version] = {
      ...info,
      platforms: {
        macos_arm64: info.platforms['macos_arm64'] || null,
        macos_x64: info.platforms['macos_x64'] || null,
        windows_x64: info.platforms['windows_x64'] || null,
        linux_x64: info.platforms['linux_x64'] || null,
      },
    };
  }

  return result;
}

async function fetchGithubTag(version) {
  const data = await fetchJson(
    `${GITHUB_API}/repos/flutter/flutter/git/refs/tags/${encodeURIComponent(version)}`,
    { silent: true }
  );
  if (!data?.object?.sha) return null;
  return shortSha(data.object.sha);
}

async function fetchGithubRelease(version) {
  const data = await fetchJson(
    `${GITHUB_API}/repos/flutter/flutter/releases/tags/${encodeURIComponent(version)}`,
    { silent: true }
  );
  return data;
}

// ── Core logic ────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🕷  Flutter Releases Crawler');
  console.log('━'.repeat(50));
  if (DRY_RUN) console.log('  Mode: DRY RUN (no files will be written)\n');

  if (!fs.existsSync(CURATED_PATH)) {
    console.error(`  ✗ Cannot find ${CURATED_PATH}`);
    process.exit(1);
  }
  const existing = JSON.parse(fs.readFileSync(CURATED_PATH, 'utf8'));
  const existingVersions = new Set((existing.items || []).map(i => i.version));
  console.log(`  Loaded existing releases: ${existingVersions.size} versions\n`);

  const newItems = [];

  for (const channel of CHANNELS) {
    console.log(`📦 Channel: ${channel}`);

    const archiveMap = await fetchSDKArchive(channel);
    const archiveVersions = Object.keys(archiveMap);

    archiveVersions.sort((a, b) =>
      archiveMap[b].release_date.localeCompare(archiveMap[a].release_date)
    );

    const newVersions = archiveVersions.filter(v => !existingVersions.has(v));
    console.log(`  Found ${archiveVersions.length} total, ${newVersions.length} new\n`);

    if (newVersions.length === 0) {
      console.log('  ✓ No new releases to add\n');
      continue;
    }

    for (const version of newVersions) {
      const info = archiveMap[version];
      const releaseType = detectReleaseType(version);
      const dartVersion = cleanDartVersion(info.dart_sdk_version);
      const releaseDate = info.release_date ? info.release_date.split('T')[0] : null;

      process.stdout.write(`  → ${version} (${releaseType}) ...`);

      // framework_revision from git tag sha
      let frameworkRevision = shortSha(info.hash);
      const tagSha = await fetchGithubTag(version);
      if (tagSha) frameworkRevision = tagSha;

      // summary from GitHub release body
      const ghRelease = await fetchGithubRelease(version);
      const summary = extractSummary(ghRelease?.body || null, version, releaseType);

      // Verified release notes URLs (real HEAD check + anchor scrape)
      const releaseNotes = await buildReleaseNotes(version, releaseType);

      // Verified GitHub ref URL (tries bare tag, then v-prefixed)
      const refUrl = await buildRefUrl(version);

      process.stdout.write(` ✓\n`);

      const entry = {
        version,
        channel,
        release_type: releaseType,
        released: releaseDate,
        dart_version: dartVersion,
        framework_revision: frameworkRevision,
        engine_revision: null,
        git_tag: version,
        build: frameworkRevision,
        requires: detectRequirements(version),
        platforms: info.platforms,
        release_notes: releaseNotes,
        summary,
        ref_url: refUrl,
        verified: true,
        sources: ['Flutter SDK Archive', 'GitHub Tags'],
      };

      newItems.push(entry);
    }
  }

  if (newItems.length === 0) {
    console.log('✓ releases.json is already up to date. Nothing to do.\n');
    process.exit(0);
  }

  console.log(`\n📝 Adding ${newItems.length} new release(s):`);
  for (const item of newItems) {
    console.log(`   + ${item.version} (${item.channel} / ${item.release_type}) — Dart ${item.dart_version}`);
  }

  if (DRY_RUN) {
    console.log('\n[dry-run] Would write to:', CURATED_PATH);
    console.log('[dry-run] New entries preview:');
    console.log(JSON.stringify(newItems[0], null, 2));
    process.exit(0);
  }

  // Prepend new items (newest first) and write back
  const updatedItems = [...newItems, ...(existing.items || [])];

  const output = {
    meta: {
      generated_at: new Date().toISOString(),
      source: 'auto-crawled',
      count: updatedItems.length,
    },
    items: updatedItems,
  };

  safeWrite(CURATED_PATH, JSON.stringify(output, null, 2) + '\n');

  console.log(`\n✅ Done. ${CURATED_PATH} updated.`);
  console.log(`   Total releases: ${updatedItems.length} (${newItems.length} new)\n`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const stepSummary = [
      `## 🕷 Crawler Run`,
      `| | |`,
      `|---|---|`,
      `| New releases found | **${newItems.length}** |`,
      `| Total releases | **${updatedItems.length}** |`,
      `| Channels crawled | ${CHANNELS.join(', ')} |`,
      '',
      `### New Releases`,
      ...newItems.map(i => `- **Flutter ${i.version}** (${i.channel} / ${i.release_type}) — Dart ${i.dart_version} — Released ${i.released}`),
    ].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, stepSummary + '\n');
  }
}

run().catch(err => {
  console.error('✗ Crawler failed:', err);
  process.exit(1);
});
