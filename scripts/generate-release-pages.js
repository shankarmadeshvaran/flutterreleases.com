#!/usr/bin/env node
// scripts/generate-release-pages.js
// Generates static HTML pages for every release in releases.json.
// Also regenerates sitemap.xml with per-release URLs and writes llms-full.txt.
// Run after build: node scripts/generate-release-pages.js
// Usage: node scripts/generate-release-pages.js [--dry-run] [--stable-only]

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const STABLE_ONLY = ARGS.includes('--stable-only');

const SITE_URL = process.env.SITE_URL || 'https://flutterreleases.com';
const DIST_DIR = path.join(process.cwd(), 'packages', 'web', 'dist');
const PUBLIC_DIR = path.join(process.cwd(), 'packages', 'web', 'public');

// Read from dist first (post-build), fall back to public (pre-build / dev)
function readReleasesJson() {
  const distPath = path.join(DIST_DIR, 'releases.json');
  const publicPath = path.join(PUBLIC_DIR, 'releases.json');
  const src = fs.existsSync(distPath) ? distPath : publicPath;
  const raw = fs.readFileSync(src, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : (parsed.items || []);
}

function xmlEscape(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlEscape(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeWrite(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function channelLabel(channel) {
  const map = { stable: 'Stable', beta: 'Beta', dev: 'Dev', main: 'Main' };
  return map[channel] || channel;
}

function platformLabel(key) {
  const map = {
    macos_arm64: 'macOS (Apple Silicon)',
    macos_x64: 'macOS (Intel)',
    windows_x64: 'Windows (x64)',
    linux_x64: 'Linux (x64)',
    linux_arm64: 'Linux (arm64)',
  };
  return map[key] || key;
}

function buildPageTitle(release) {
  const dart = release.dart_version ? ` — Dart ${release.dart_version}` : '';
  return `Flutter ${release.version}${dart} | FlutterReleases`;
}

function buildPageDescription(release) {
  const ch = channelLabel(release.channel);
  const dart = release.dart_version ? ` Dart SDK ${release.dart_version}.` : '';
  const date = release.released ? ` Released ${release.released}.` : '';
  const type = release.release_type ? ` ${release.release_type} release.` : '';
  return `Flutter ${release.version} ${ch} release.${type}${dart}${date} Download for macOS, Linux, and Windows.`;
}

function buildStructuredData(release, pageUrl) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `Flutter ${release.version}`,
    version: release.version,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'macOS, Windows, Linux',
    url: pageUrl,
    downloadUrl: release.platforms?.macos_arm64 || release.platforms?.macos_x64 || release.platforms?.windows_x64 || null,
    softwareVersion: release.version,
    datePublished: release.released || undefined,
    description: buildPageDescription(release),
  };
  if (release.dart_version) {
    data.runtimePlatform = `Dart ${release.dart_version}`;
  }
  return JSON.stringify(data, null, '\t\t\t');
}

function buildDownloadsHtml(release) {
  const platforms = release.platforms || {};
  const entries = Object.entries(platforms).filter(([, url]) => url);
  if (!entries.length) return '<p>No direct download links available for this release.</p>';
  const rows = entries.map(([key, url]) => {
    const label = htmlEscape(platformLabel(key));
    const safeUrl = htmlEscape(url);
    return `<li><a href="${safeUrl}">${label}</a></li>`;
  }).join('\n          ');
  return `<ul>\n          ${rows}\n        </ul>`;
}

function buildRequiresHtml(release) {
  const req = release.requires || {};
  const entries = Object.entries(req).filter(([, v]) => v);
  if (!entries.length) return '';
  const labelMap = {
    macos: 'macOS', xcode: 'Xcode', windows: 'Windows',
    visual_studio: 'Visual Studio', linux: 'Linux', android_sdk: 'Android SDK',
  };
  const rows = entries.map(([k, v]) => {
    const label = htmlEscape(labelMap[k] || k);
    return `<li><strong>${label}:</strong> ${htmlEscape(v)}</li>`;
  }).join('\n          ');
  return `<ul>\n          ${rows}\n        </ul>`;
}

function buildReleaseNotesHtml(release) {
  const rn = release.release_notes || {};
  const base = rn.base || release.ref_url;
  if (!base) return '';
  return `<a href="${htmlEscape(base)}" target="_blank" rel="noopener">View release notes →</a>`;
}

function buildBreadcrumbLd(release, pageUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Flutter Releases', item: SITE_URL + '/' },
      { '@type': 'ListItem', position: 2, name: `Flutter ${release.version}`, item: pageUrl },
    ],
  }, null, '\t\t\t');
}

function buildPageHtml(release) {
  const version = release.version;
  const channel = release.channel;
  const slug = encodeURIComponent(version);
  const pageUrl = `${SITE_URL}/release/${slug}`;
  const title = buildPageTitle(release);
  const desc = buildPageDescription(release);
  const chLabel = channelLabel(channel);
  const structuredData = buildStructuredData(release, pageUrl);
  const breadcrumbLd = buildBreadcrumbLd(release, pageUrl);
  const downloadsHtml = buildDownloadsHtml(release);
  const requiresHtml = buildRequiresHtml(release);
  const releaseNotesHtml = buildReleaseNotesHtml(release);
  const summary = release.summary ? htmlEscape(release.summary) : '';
  const dartDisplay = release.dart_version ? htmlEscape(release.dart_version) : 'N/A';
  const dateDisplay = release.released || 'Unknown';
  const typeDisplay = release.release_type ? htmlEscape(release.release_type) : '';
  const refUrl = release.ref_url ? htmlEscape(release.ref_url) : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(desc)}" />
  <meta name="theme-color" content="#054D8E" />
  <!-- Open Graph -->
  <meta property="og:title" content="${htmlEscape(`Flutter ${version} — ${chLabel} | FlutterReleases`)}" />
  <meta property="og:description" content="${htmlEscape(desc)}" />
  <meta property="og:url" content="${htmlEscape(pageUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${SITE_URL}/og-image.png" />
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${htmlEscape(`Flutter ${version} — ${chLabel}`)}" />
  <meta name="twitter:description" content="${htmlEscape(desc)}" />
  <meta name="twitter:image" content="${SITE_URL}/og-image.png" />
  <!-- Canonical -->
  <link rel="canonical" href="${htmlEscape(pageUrl)}" />
  <!-- RSS autodiscovery -->
  <link rel="alternate" type="application/rss+xml" title="Flutter Releases Feed" href="${SITE_URL}/feed.xml" />
  <!-- JSON-LD -->
  <script type="application/ld+json">
    ${structuredData}
  </script>
  <script type="application/ld+json">
    ${breadcrumbLd}
  </script>
  <!-- Redirect to main SPA for interactive experience -->
  <script>
    // Redirect to SPA root — the React app handles /release/:version routing
    if (typeof window !== 'undefined') {
      var v = window.location.pathname.replace('/release/', '').replace(/\/$/, '');
      window.location.replace('/?v=' + encodeURIComponent(v) + '#release');
    }
  </script>
</head>
<body>
  <!-- Static content for crawlers (no JS required) -->
  <nav>
    <a href="${SITE_URL}/">← All Flutter Releases</a>
  </nav>
  <main>
    <h1>Flutter ${htmlEscape(version)}</h1>
    <p><strong>Channel:</strong> ${htmlEscape(chLabel)}${typeDisplay ? ` &mdash; ${typeDisplay}` : ''}</p>
    <p><strong>Released:</strong> ${htmlEscape(dateDisplay)}</p>
    <p><strong>Dart SDK:</strong> ${dartDisplay}</p>
    ${summary ? `<p>${summary}</p>` : ''}
    ${releaseNotesHtml ? `<section><h2>Release Notes</h2><p>${releaseNotesHtml}</p></section>` : ''}
    <section>
      <h2>Downloads</h2>
      ${downloadsHtml}
    </section>
    ${requiresHtml ? `<section><h2>System Requirements</h2>${requiresHtml}</section>` : ''}
    ${refUrl ? `<p><a href="${refUrl}" target="_blank" rel="noopener">View on GitHub →</a></p>` : ''}
    <p><a href="${SITE_URL}/">Browse all Flutter releases →</a></p>
  </main>
</body>
</html>`;
}

// Build sitemap with per-release URLs
function buildSitemapXml(items, generatedAt) {
  const baseUrl = SITE_URL.replace(/\/$/, '');
  const lm = (generatedAt ? new Date(generatedAt) : new Date()).toISOString();
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  // Homepage
  lines.push('  <url>');
  lines.push(`    <loc>${baseUrl}/</loc>`);
  lines.push(`    <lastmod>${lm}</lastmod>`);
  lines.push('    <changefreq>daily</changefreq>');
  lines.push('    <priority>1.0</priority>');
  lines.push('  </url>');

  // Feed, JSON, llms
  for (const [path_, freq, pri] of [
    ['/feed.xml', 'daily', '0.5'],
    ['/releases.json', 'daily', '0.6'],
    ['/llms.txt', 'monthly', '0.3'],
    ['/llms-full.txt', 'daily', '0.4'],
  ]) {
    lines.push('  <url>');
    lines.push(`    <loc>${baseUrl}${path_}</loc>`);
    if (freq === 'daily') lines.push(`    <lastmod>${lm}</lastmod>`);
    lines.push(`    <changefreq>${freq}</changefreq>`);
    lines.push(`    <priority>${pri}</priority>`);
    lines.push('  </url>');
  }

  // Per-release pages — stable first (priority 0.8), beta 0.6, others 0.4
  const priorityMap = { stable: '0.8', beta: '0.6', dev: '0.4', main: '0.3' };
  const changeMap = { stable: 'monthly', beta: 'weekly', dev: 'weekly', main: 'daily' };

  for (const r of items) {
    const slug = encodeURIComponent(r.version);
    const pri = priorityMap[r.channel] || '0.4';
    const freq = changeMap[r.channel] || 'monthly';
    const lastmod = r.released ? new Date(r.released).toISOString() : lm;
    lines.push('  <url>');
    lines.push(`    <loc>${baseUrl}/release/${slug}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push(`    <changefreq>${freq}</changefreq>`);
    lines.push(`    <priority>${pri}</priority>`);
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  return lines.join('\n');
}

// Build llms-full.txt — full stable release index for LLMs
function buildLlmsFullTxt(items, generatedAt) {
  const stable = items.filter(r => r.channel === 'stable');
  const date = generatedAt ? new Date(generatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  const lines = [];
  lines.push('# FlutterReleases.com — Full stable release index');
  lines.push('');
  lines.push('> Complete list of all Flutter stable releases with Dart SDK versions, dates, and download links.');
  lines.push(`> Source: ${SITE_URL}/releases.json`);
  lines.push(`> Updated: ${date}`);
  lines.push(`> Total stable releases: ${stable.length}`);
  lines.push('');
  lines.push('## Stable Releases');
  lines.push('');
  lines.push('| Version | Dart SDK | Released | Type | macOS arm64 | Windows | Linux |');
  lines.push('|---------|----------|----------|------|------------|---------|-------|');

  for (const r of stable) {
    const v = r.version || '';
    const dart = r.dart_version || 'N/A';
    const date_ = r.released || 'N/A';
    const type = r.release_type || 'Release';
    const mac = r.platforms?.macos_arm64 || '—';
    const win = r.platforms?.windows_x64 || '—';
    const linux = r.platforms?.linux_x64 || '—';
    lines.push(`| ${v} | ${dart} | ${date_} | ${type} | ${mac} | ${win} | ${linux} |`);
  }

  lines.push('');
  lines.push('## Data access');
  lines.push('');
  lines.push(`- JSON (all channels): ${SITE_URL}/releases.json`);
  lines.push(`- RSS (stable + beta): ${SITE_URL}/feed.xml`);
  lines.push(`- Sitemap: ${SITE_URL}/sitemap.xml`);
  lines.push(`- Schema docs: ${SITE_URL}/llms.txt`);
  lines.push('');
  lines.push('## Source');
  lines.push('');
  lines.push('GitHub: https://github.com/shankarmadeshvaran/flutterreleases.com');
  lines.push(`Live site: ${SITE_URL}`);

  return lines.join('\n');
}

async function run() {
  console.log('Reading releases.json...');
  let items;
  try {
    items = readReleasesJson();
  } catch (e) {
    console.error('Could not read releases.json:', e.message);
    process.exit(1);
  }

  const toProcess = STABLE_ONLY
    ? items.filter(r => r.channel === 'stable')
    : items;

  console.log(`Processing ${toProcess.length} releases (${items.filter(r => r.channel === 'stable').length} stable)...`);

  if (DRY_RUN) {
    console.log('Dry-run: skipping file writes.');
    console.log(`Would generate ${toProcess.length} HTML pages`);
    console.log(`Would update sitemap.xml with ${toProcess.length + 5} URLs`);
    return;
  }

  // Generate per-release HTML pages into dist/release/<version>/index.html
  let generated = 0;
  let errors = 0;
  for (const _release of toProcess) {
    // Normalise: some older crawler items use flutter_version instead of version
    const release = { ..._release };
    if (!release.version && release.flutter_version) release.version = release.flutter_version;
    if (!release.version) { errors++; continue; }
    try {
      const slug = release.version; // use raw version as dir name
      const html = buildPageHtml(release);
      const outPath = path.join(DIST_DIR, 'release', slug, 'index.html');
      safeWrite(outPath, html);
      generated++;
    } catch (e) {
      console.error(`  Error generating page for ${release.version}:`, e.message);
      errors++;
    }
  }
  console.log(`Generated ${generated} HTML pages (${errors} errors)`);

  // Update sitemap.xml in both dist and public
  const generatedAt = new Date().toISOString();
  const sitemapXml = buildSitemapXml(items, generatedAt);

  const sitemapDist = path.join(DIST_DIR, 'sitemap.xml');
  const sitemapPublic = path.join(PUBLIC_DIR, 'sitemap.xml');
  if (fs.existsSync(DIST_DIR)) safeWrite(sitemapDist, sitemapXml);
  safeWrite(sitemapPublic, sitemapXml);

  const urlCount = items.length + 5;
  console.log(`Updated sitemap.xml with ${urlCount} URLs`);

  // Generate llms-full.txt in both dist and public
  const llmsFullTxt = buildLlmsFullTxt(items, generatedAt);
  if (fs.existsSync(DIST_DIR)) safeWrite(path.join(DIST_DIR, 'llms-full.txt'), llmsFullTxt);
  safeWrite(path.join(PUBLIC_DIR, 'llms-full.txt'), llmsFullTxt);
  console.log(`Generated llms-full.txt (${items.filter(r => r.channel === 'stable').length} stable releases)`);

  console.log('Done.');
}

run().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
