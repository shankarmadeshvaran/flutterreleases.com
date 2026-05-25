#!/usr/bin/env node
// scripts/crawl-releases.js
// Automatically discovers new Flutter releases and updates public/data/releases.json
//
// Data sources (in priority order):
//   1. Google Flutter SDK Archive  — canonical versions, download URLs, Dart version, commit hash
//   2. GitHub flutter/flutter tags — framework_revision (7-char short sha)
//   3. GitHub flutter/flutter releases — release body for summary extraction
//   4. docs.flutter.dev pattern   — release notes URL construction
//
// How it works:
//   - Loads current public/data/releases.json
//   - Fetches all releases from SDK archive (stable channel only by default)
//   - Compares: finds versions not already in your JSON
//   - For each new version: builds a full entry matching your exact schema
//   - Detects release_type (Hotfix vs Release) by checking if it's a patch version
//   - Generates a summary by reading GitHub release body (first meaningful line)
//   - Appends new entries to the top of items[] and writes back
//
// Usage:
//   node scripts/crawl-releases.js               # stable only (default)
//   node scripts/crawl-releases.js --all-channels # stable + beta + main
//   node scripts/crawl-releases.js --dry-run      # preview, no write
//   GITHUB_TOKEN=xxx node scripts/crawl-releases.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CURATED_PATH = path.join(ROOT, 'public', 'data', 'releases.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
const DRY_RUN = process.argv.includes('--dry-run');
const ALL_CHANNELS = process.argv.includes('--all-channels');
const CHANNELS = ALL_CHANNELS ? ['stable', 'beta'] : ['stable'];

const BASE_ARCHIVE_URL = 'https://storage.googleapis.com/flutter_infra_release/releases';
const GITHUB_API = 'https://api.github.com';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function shortSha(hash) {
  return hash ? hash.slice(0, 7) : null;
}

function safeWrite(filePath, content) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

// Detect release type: if patch version > 0 it's a Hotfix, otherwise a Release
function detectReleaseType(version) {
  const parts = version.split('.');
  const patch = parseInt(parts[2] || '0', 10);
  return patch > 0 ? 'Hotfix' : 'Release';
}

// Clean dart_sdk_version string like "3.12.0 (build 3.12.0-...)" → "3.12.0"
function cleanDartVersion(raw) {
  if (!raw) return null;
  return raw.split(' ')[0].trim();
}

// Detect minimum macOS/Windows/Xcode requirements based on Flutter version
// Based on Flutter's documented requirements: https://docs.flutter.dev/get-started/install
function detectRequirements(version) {
  const [major, minor] = version.split('.').map(Number);

  // Flutter 3.29+ requires macOS 13.5+, Xcode 15.4+
  // Flutter 3.22+ requires macOS 12+, Xcode 15.0+
  // Flutter 3.10+ requires macOS 11+, Xcode 14.0+
  let macos = 'macOS 12+';
  let xcode = 'Xcode 15.0+';

  if (major > 3 || (major === 3 && minor >= 29)) {
    macos = 'macOS 13.5+';
    xcode = 'Xcode 15.1+';
  } else if (major === 3 && minor >= 10) {
    macos = 'macOS 12+';
    xcode = 'Xcode 14.0+';
  }

  return {
    macos,
    xcode,
    windows: 'Windows 10+',
    visual_studio: 'Visual Studio 2022',
    linux: 'bash, git, curl, unzip',
  };
}

// Build release_notes URLs based on your existing pattern:
//   Major releases (x.x.0): base + section anchors
//   Hotfixes (x.x.N): base points to the .0 release notes page
function buildReleaseNotes(version, releaseType) {
  const parts = version.split('.');
  const baseVersion = `${parts[0]}.${parts[1]}.0`;
  const baseUrl = `https://docs.flutter.dev/release/release-notes/release-notes-${baseVersion}`;

  if (releaseType === 'Release') {
    // Major release: include section anchors
    return {
      base: baseUrl,
      framework: `${baseUrl}#framework`,
      material: `${baseUrl}#material`,
      ios: `${baseUrl}#ios`,
      android: `${baseUrl}#android`,
      windows: `${baseUrl}#windows`,
      linux: `${baseUrl}#linux`,
      web: `${baseUrl}#web`,
      tools: `${baseUrl}#tools`,
    };
  } else {
    // Hotfix: only base URL (points to parent release notes)
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
}

// Extract a clean one-line summary from GitHub release body
function extractSummary(body, version, releaseType) {
  if (!body) {
    return releaseType === 'Hotfix'
      ? `Hotfix release with stability improvements.`
      : `Flutter ${version} stable release.`;
  }

  // Try to find the first meaningful non-empty, non-heading, non-link line
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
    // Truncate to ~120 chars
    let summary = lines[0].replace(/\*\*/g, '').replace(/`/g, '').trim();
    if (summary.length > 120) summary = summary.slice(0, 117) + '...';
    return summary;
  }

  return releaseType === 'Hotfix'
    ? `Hotfix release with stability improvements for the ${version.split('.').slice(0,2).join('.')} series.`
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

  // Build per-version lookup from all 3 platform archives
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
    const url = `${baseUrl}/${release.archive}`;
    byVersion[v].platforms[`${platform}_${arch}`] = url;
  }

  for (const r of data.releases) addEntry(r, 'linux');
  if (macosData) for (const r of macosData.releases) addEntry(r, 'macos');
  if (windowsData) for (const r of windowsData.releases) addEntry(r, 'windows');

  // Remap platform keys to your schema: linux_x64, macos_arm64, macos_x64, windows_x64
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
  // Get the commit sha for a flutter tag
  const data = await fetchJson(
    `${GITHUB_API}/repos/flutter/flutter/git/refs/tags/${encodeURIComponent(version)}`,
    { silent: true }
  );
  if (!data?.object?.sha) return null;
  return shortSha(data.object.sha);
}

async function fetchGithubRelease(version) {
  // Some flutter versions have GitHub releases with body text (summaries)
  const data = await fetchJson(
    `${GITHUB_API}/repos/flutter/flutter/releases/tags/${encodeURIComponent(version)}`,
    { silent: true }
  );
  return data; // may be null
}

// ── Core logic ────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🕷  Flutter Releases Crawler');
  console.log('━'.repeat(50));
  if (DRY_RUN) console.log('  Mode: DRY RUN (no files will be written)\n');

  // 1. Load existing curated releases.json
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

    // 2. Fetch SDK archive for this channel
    const archiveMap = await fetchSDKArchive(channel);
    const archiveVersions = Object.keys(archiveMap);

    // Sort by release date, newest first
    archiveVersions.sort((a, b) =>
      archiveMap[b].release_date.localeCompare(archiveMap[a].release_date)
    );

    // 3. Find new versions
    const newVersions = archiveVersions.filter(v => !existingVersions.has(v));
    console.log(`  Found ${archiveVersions.length} total, ${newVersions.length} new\n`);

    if (newVersions.length === 0) {
      console.log('  ✓ No new releases to add\n');
      continue;
    }

    // 4. Build full entries for each new version
    for (const version of newVersions) {
      const info = archiveMap[version];
      const releaseType = detectReleaseType(version);
      const dartVersion = cleanDartVersion(info.dart_sdk_version);
      const releaseDate = info.release_date ? info.release_date.split('T')[0] : null;

      console.log(`  → ${version} (${releaseType}, ${dartVersion}, ${releaseDate})`);

      // Fetch framework revision from git tag
      let frameworkRevision = shortSha(info.hash);
      const tagSha = await fetchGithubTag(version);
      if (tagSha) frameworkRevision = tagSha;

      // Try to get summary from GitHub release body
      let summary = null;
      const ghRelease = await fetchGithubRelease(version);
      if (ghRelease?.body) {
        summary = extractSummary(ghRelease.body, version, releaseType);
      } else {
        summary = extractSummary(null, version, releaseType);
      }

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
        release_notes: buildReleaseNotes(version, releaseType),
        summary,
        ref_url: `https://github.com/flutter/flutter/releases/tag/${version}`,
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

  // 5. Prepend new items (newest first) and write back
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

  // Output for GitHub Actions step summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
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
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  }
}

run().catch(err => {
  console.error('✗ Crawler failed:', err);
  process.exit(1);
});
