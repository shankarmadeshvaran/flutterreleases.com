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

function semverGroup(version) {
  const match = String(version || '').match(/^v?(\d+)\.(\d+)\./);
  return match ? `${match[1]}.${match[2]}` : null;
}

function releaseUrl(release) {
  return `${SITE_URL}/release/${encodeURIComponent(release.version)}`;
}

function latestByChannel(items, channel) {
  return items.find(r => r.channel === channel && r.version);
}

function buildFlutterVersionsBreadcrumbLd(pageUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Flutter Releases', item: SITE_URL + '/' },
      { '@type': 'ListItem', position: 2, name: 'Flutter Versions & Releases', item: pageUrl },
    ],
  }, null, '\t\t\t');
}

function buildFlutterVersionsWebPageLd(pageUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Flutter Versions & Releases',
    url: pageUrl,
    description: 'See the latest Flutter stable, beta and dev versions, complete Flutter version history, Dart SDK compatibility and release details.',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Flutter Releases',
      url: SITE_URL + '/',
    },
  }, null, '\t\t\t');
}

function buildLatestCardHtml(title, release) {
  if (!release) {
    return `<article class="card"><p class="eyebrow">${htmlEscape(title)}</p><p>Not available in releases.json.</p></article>`;
  }

  return `<article class="card">
      <p class="eyebrow">${htmlEscape(title)}</p>
      <h2><a href="${releaseUrl(release)}">Flutter ${htmlEscape(release.version)}</a></h2>
      <dl>
        <div><dt>Flutter version</dt><dd>${htmlEscape(release.version)}</dd></div>
        <div><dt>Dart version</dt><dd>${htmlEscape(release.dart_version || 'N/A')}</dd></div>
        <div><dt>Release date</dt><dd>${htmlEscape(release.released || 'Unknown')}</dd></div>
        <div><dt>Channel</dt><dd>${htmlEscape(channelLabel(release.channel))}</dd></div>
      </dl>
      <p><a href="${releaseUrl(release)}">View release details →</a></p>
    </article>`;
}

function buildFlutterVersionsPageHtml(items, generatedAt) {
  const pageUrl = `${SITE_URL.replace(/\/$/, '')}/flutter-versions/`;
  const latestStable = latestByChannel(items, 'stable');
  const latestBeta = latestByChannel(items, 'beta');
  const latestDev = latestByChannel(items, 'dev') || latestByChannel(items, 'main');
  const versioned = items.filter(r => r.version && semverGroup(r.version));
  const groups = new Map();
  for (const release of versioned) {
    const group = semverGroup(release.version);
    const rows = groups.get(group) || [];
    rows.push(release);
    groups.set(group, rows);
  }
  const generatedDate = generatedAt ? new Date(generatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const breadcrumbLd = buildFlutterVersionsBreadcrumbLd(pageUrl);
  const webPageLd = buildFlutterVersionsWebPageLd(pageUrl);

  function renderReleaseRow(release) {
    return `<tr>
          <td><a href="${releaseUrl(release)}">Flutter ${htmlEscape(release.version)}</a></td>
          <td>${htmlEscape(release.dart_version || 'N/A')}</td>
          <td>${htmlEscape(channelLabel(release.channel))}</td>
          <td>${htmlEscape(release.released || 'Unknown')}</td>
        </tr>`;
  }

  const historyHtml = Array.from(groups.entries()).map(([group, releases]) => {
    const rows = releases.map(renderReleaseRow).join('\n');
    return `<section>
      <h3>Flutter ${htmlEscape(group)}.x</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Version</th><th>Dart version</th><th>Channel</th><th>Release date</th></tr>
          </thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </div>
    </section>`;
  }).join('\n');

  const compatibilityRows = versioned.map(renderReleaseRow).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flutter Versions &amp; Releases — Latest Stable Flutter SDK</title>
  <meta name="description" content="See the latest Flutter stable, beta and dev versions, complete Flutter version history, Dart SDK compatibility and release details." />
  <meta name="theme-color" content="#054D8E" />
  <meta property="og:title" content="Flutter Versions &amp; Releases — Latest Stable Flutter SDK" />
  <meta property="og:description" content="See the latest Flutter stable, beta and dev versions, complete Flutter version history, Dart SDK compatibility and release details." />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${SITE_URL}/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Flutter Versions &amp; Releases — Latest Stable Flutter SDK" />
  <meta name="twitter:description" content="See the latest Flutter stable, beta and dev versions, complete Flutter version history, Dart SDK compatibility and release details." />
  <meta name="twitter:image" content="${SITE_URL}/og-image.png" />
  <link rel="canonical" href="${pageUrl}" />
  <link rel="alternate" type="application/rss+xml" title="Flutter Releases Feed" href="${SITE_URL}/feed.xml" />
  <script type="application/ld+json">
    ${breadcrumbLd}
  </script>
  <script type="application/ld+json">
    ${webPageLd}
  </script>
  <style>
    :root { color-scheme: light; --bg: #fafafa; --surface: #ffffff; --subtle: #f4f4f5; --border: #e4e4e7; --text: #18181b; --muted: #71717a; --accent: #0ea5e9; }
    body { margin: 0; font-family: "DM Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); line-height: 1.55; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    header, footer, .hero { background: var(--surface); border-color: var(--border); }
    header { border-bottom: 1px solid var(--border); }
    nav, main, footer > div { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
    nav { height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    nav .links { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; }
    .hero { border-bottom: 1px solid var(--border); }
    .hero-inner { max-width: 1200px; margin: 0 auto; padding: 2.5rem 1.5rem; }
    h1 { font-size: 1.875rem; line-height: 1.2; margin: 0 0 0.5rem; }
    h2 { font-size: 1.125rem; margin: 0 0 0.75rem; }
    h3 { font-size: 1rem; margin: 2rem 0 0.75rem; }
    .intro { max-width: 44rem; color: var(--muted); margin: 0; }
    .eyebrow { color: var(--accent); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; font-weight: 700; margin: 0 0 0.75rem; }
    .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin-top: 1.5rem; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; }
    dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; margin: 1rem 0; }
    dt { color: var(--muted); font-size: 0.75rem; }
    dd { margin: 0; font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.875rem; }
    main { padding-top: 2rem; padding-bottom: 2rem; }
    .section-head { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .section-head p, footer p { color: var(--muted); margin: 0.25rem 0 0; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); }
    table { border-collapse: collapse; width: 100%; min-width: 640px; }
    th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
    th { color: var(--muted); background: var(--subtle); text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.75rem; }
    footer { border-top: 1px solid var(--border); }
    footer > div { padding-top: 1.25rem; padding-bottom: 1.25rem; font-size: 0.8125rem; }
    @media (max-width: 760px) { .cards { grid-template-columns: 1fr; } nav { align-items: flex-start; height: auto; padding-top: 1rem; padding-bottom: 1rem; flex-direction: column; } }
  </style>
</head>
<body>
  <header>
    <nav>
      <a href="${SITE_URL}/"><strong>Flutter Releases</strong></a>
      <div class="links">
        <a href="${SITE_URL}/">Home</a>
        <a href="${SITE_URL}/links.html">All releases</a>
        <a href="${SITE_URL}/releases.json">releases.json</a>
        <a href="${SITE_URL}/feed.xml">RSS</a>
      </div>
    </nav>
  </header>
  <section class="hero">
    <div class="hero-inner">
      <p class="eyebrow">Flutter version history</p>
      <h1>Flutter Versions &amp; Releases</h1>
      <p class="intro">See the latest Flutter stable, beta and dev versions, complete Flutter version history, Dart SDK compatibility and release details.</p>
      <div class="cards">
        ${buildLatestCardHtml('Latest Stable Flutter release', latestStable)}
        ${buildLatestCardHtml('Latest Beta', latestBeta)}
        ${buildLatestCardHtml('Latest Dev', latestDev)}
      </div>
    </div>
  </section>
  <main>
    <section>
      <div class="section-head">
        <div>
          <h2>Flutter Version History</h2>
          <p>Grouped by major and minor Flutter SDK version. Generated from releases.json on ${generatedDate}.</p>
        </div>
        <p>${versioned.length} versions</p>
      </div>
      ${historyHtml}
    </section>
    <section>
      <div class="section-head">
        <div>
          <h2>Flutter ↔ Dart compatibility</h2>
          <p>Every Flutter version links to its existing release details page.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Flutter version</th><th>Dart SDK</th><th>Channel</th><th>Release date</th></tr>
          </thead>
          <tbody>
${compatibilityRows}
          </tbody>
        </table>
      </div>
    </section>
  </main>
  <footer>
    <div>
      <p><a href="${SITE_URL}/">FlutterReleases.com</a> &mdash; <a href="${SITE_URL}/flutter-versions/">Flutter versions</a> &mdash; <a href="${SITE_URL}/sitemap.xml">Sitemap</a></p>
    </div>
  </footer>
</body>
</html>`;
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
      var v = window.location.pathname.replace('/release/', '').replace(/[/]$/, '');
      window.location.replace('/?v=' + encodeURIComponent(v) + '#release');
    }
  </script>
</head>
<body>
  <!-- Static content for crawlers (no JS required) -->
  <nav>
    <a href="${SITE_URL}/">← All Flutter Releases</a>
    <a href="${SITE_URL}/flutter-versions/">Flutter versions</a>
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
    <p><a href="${SITE_URL}/flutter-versions/">Browse Flutter version history →</a></p>
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

  // Feed, JSON, llms, links
  for (const [path_, freq, pri] of [
    ['/flutter-versions/', 'daily', '0.9'],
    ['/feed.xml', 'daily', '0.5'],
    ['/releases.json', 'daily', '0.6'],
    ['/llms.txt', 'monthly', '0.3'],
    ['/llms-full.txt', 'daily', '0.4'],
    ['/links.html', 'daily', '0.4'],
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

// Build links.html — full crawlable index of all release pages (no JS required)
function buildLinksHtml(items, generatedAt) {
  const date = generatedAt ? new Date(generatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const baseUrl = SITE_URL.replace(/\/$/, '');

  const stable = items.filter(r => r.channel === 'stable');
  const beta   = items.filter(r => r.channel === 'beta');
  const dev    = items.filter(r => r.channel === 'dev');
  const main_  = items.filter(r => r.channel === 'main');

  function renderGroup(title, group) {
    if (!group.length) return '';
    const rows = group.map(r => {
      const slug = encodeURIComponent(r.version);
      const dart = r.dart_version ? ` (Dart ${htmlEscape(r.dart_version)})` : '';
      const date_ = r.released ? ` — ${htmlEscape(r.released)}` : '';
      return `    <li><a href="${baseUrl}/release/${slug}">${htmlEscape(r.version)}</a>${dart}${date_}</li>`;
    }).join('\n');
    return `  <section>\n    <h2>${title} (${group.length})</h2>\n    <ul>\n${rows}\n    </ul>\n  </section>\n`;
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>All Flutter Releases — Complete Index | FlutterReleases</title>
  <meta name="description" content="Complete index of all Flutter SDK releases across stable, beta, dev, and main channels. ${items.length} releases total. Updated ${date}." />
  <link rel="canonical" href="${baseUrl}/links.html" />
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; line-height: 1.6; }
    a { color: #054D8E; }
    h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.2rem; margin-top: 2rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem; }
    ul { list-style: none; padding: 0; columns: 2; }
    li { padding: 0.15rem 0; font-size: 0.9rem; break-inside: avoid; }
    .meta { color: #6b7280; font-size: 0.85rem; margin-bottom: 1.5rem; }
    nav { margin-bottom: 1.5rem; font-size: 0.9rem; }
    @media (max-width: 600px) { ul { columns: 1; } }
  </style>
</head>
<body>
  <nav><a href="${baseUrl}/">← Back to FlutterReleases</a></nav>
  <h1>All Flutter Releases</h1>
  <p class="meta">${items.length} total releases &mdash; Generated ${date} &mdash; <a href="${baseUrl}/releases.json">releases.json</a></p>
${renderGroup('Stable', stable)}${renderGroup('Beta', beta)}${renderGroup('Dev', dev)}${renderGroup('Main', main_)}
  <footer>
    <p><a href="${baseUrl}/">FlutterReleases.com</a> &mdash; Updated daily &mdash; <a href="${baseUrl}/sitemap.xml">Sitemap</a> &mdash; <a href="${baseUrl}/feed.xml">RSS</a></p>
  </footer>
</body>
</html>`;
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
    console.log(`Would update sitemap.xml with ${items.length + 6} URLs`);
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

  const urlCount = items.length + 6;
  console.log(`Updated sitemap.xml with ${urlCount} URLs`);

  // Generate Flutter versions SEO page in dist only. It is a route page, so
  // Cloudflare serves this static HTML while the SPA handles JS navigation.
  const flutterVersionsHtml = buildFlutterVersionsPageHtml(items, generatedAt);
  if (fs.existsSync(DIST_DIR)) {
    safeWrite(path.join(DIST_DIR, 'flutter-versions', 'index.html'), flutterVersionsHtml);
  }
  console.log('Generated flutter-versions/index.html');

  // Generate llms-full.txt in both dist and public
  const llmsFullTxt = buildLlmsFullTxt(items, generatedAt);
  if (fs.existsSync(DIST_DIR)) safeWrite(path.join(DIST_DIR, 'llms-full.txt'), llmsFullTxt);
  safeWrite(path.join(PUBLIC_DIR, 'llms-full.txt'), llmsFullTxt);
  console.log(`Generated llms-full.txt (${items.filter(r => r.channel === 'stable').length} stable releases)`);

  // Generate links.html — crawlable full release index in both dist and public
  const linksHtml = buildLinksHtml(items, generatedAt);
  if (fs.existsSync(DIST_DIR)) safeWrite(path.join(DIST_DIR, 'links.html'), linksHtml);
  safeWrite(path.join(PUBLIC_DIR, 'links.html'), linksHtml);
  console.log(`Generated links.html (${items.length} total releases)`);

  console.log('Done.');
}

run().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
