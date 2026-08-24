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
const BLOG_POSTS_PATH = path.join(process.cwd(), 'packages', 'web', 'src', 'web', 'data', 'blog-posts.json');
const FAQ_PATH = path.join(process.cwd(), 'packages', 'web', 'src', 'web', 'data', 'faq.json');
const CHANGELOG_PATH = path.join(process.cwd(), 'packages', 'web', 'src', 'web', 'data', 'changelog.json');
const BLOG_CONTENT_DIR = path.join(process.cwd(), 'packages', 'web', 'src', 'web', 'content', 'blog');

// Read from dist first (post-build), fall back to public (pre-build / dev)
function readReleasesJson() {
  const distPath = path.join(DIST_DIR, 'releases.json');
  const publicPath = path.join(PUBLIC_DIR, 'releases.json');
  const src = fs.existsSync(distPath) ? distPath : publicPath;
  const raw = fs.readFileSync(src, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : (parsed.items || []);
}

function readBlogPosts() {
  const raw = fs.readFileSync(BLOG_POSTS_PATH, 'utf8');
  return JSON.parse(raw);
}

function readFaqItems() {
  const raw = fs.readFileSync(FAQ_PATH, 'utf8');
  return JSON.parse(raw);
}

function readChangelogItems() {
  const raw = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  return JSON.parse(raw);
}

function readBlogArticles() {
  if (!fs.existsSync(BLOG_CONTENT_DIR)) return [];
  return fs.readdirSync(BLOG_CONTENT_DIR)
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const raw = fs.readFileSync(path.join(BLOG_CONTENT_DIR, file), 'utf8');
      return parseBlogMarkdown(raw, file);
    });
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

function xmlEscape(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugifyHeading(text) {
  return String(text)
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseFrontMatterValue(value) {
  const trimmed = String(value || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseBlogMarkdown(raw, fileName) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  let body = raw;
  if (match) {
    body = match[2];
    const lines = match[1].split('\n');
    let currentArrayKey = null;
    for (const line of lines) {
      const arrayItem = line.match(/^\s+-\s+(.*)$/);
      if (arrayItem && currentArrayKey) {
        meta[currentArrayKey].push(parseFrontMatterValue(arrayItem[1]));
        continue;
      }
      const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!kv) continue;
      currentArrayKey = null;
      const key = kv[1];
      const value = kv[2];
      if (value === '') {
        meta[key] = [];
        currentArrayKey = key;
      } else {
        meta[key] = parseFrontMatterValue(value);
      }
    }
  }
  const fallbackSlug = `/blog/${fileName.replace(/\.md$/, '')}/`;
  return {
    meta: {
      ...meta,
      slug: meta.slug || fallbackSlug,
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      secondary_keywords: Array.isArray(meta.secondary_keywords) ? meta.secondary_keywords : [],
    },
    body,
  };
}

function renderInlineMarkdown(text) {
  let out = htmlEscape(text);
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/(?<!href=")(https?:\/\/[^\s<"]+)/g, url => {
    const cleanUrl = url.replace(/[).,]+$/, '');
    const suffix = url.slice(cleanUrl.length);
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>${htmlEscape(suffix)}`;
  });
  return out;
}

function highlightCode(code, lang) {
  const escaped = htmlEscape(code);
  if (lang === 'bash') {
    return escaped.replace(/\b(flutter|pod)\b/g, '<span class="code-command">$1</span>');
  }
  if (lang === 'ruby') {
    return escaped
      .replace(/\b(do|end)\b/g, '<span class="code-keyword">$1</span>')
      .replace(/\|([^|]+)\|/g, '<span class="code-var">|$1|</span>');
  }
  return escaped;
}

const migrationCallouts = [
  {
    test: text => /CocoaPods trunk will become read-only on December 2, 2026/i.test(text),
    text: 'CocoaPods becomes read-only on December 2, 2026.',
  },
  {
    test: text => /new Firebase releases will no longer be published through CocoaPods after October 2026/i.test(text),
    text: 'Firebase stops publishing new CocoaPods releases in October 2026.',
  },
  {
    test: text => /Starting with \*\*Flutter 3\.44\.0\*\*, Swift Package Manager becomes the default dependency manager/i.test(text),
    text: 'Flutter 3.44 introduces Swift Package Manager by default.',
  },
  {
    test: text => /Do not start by deleting the `Podfile`/i.test(text),
    text: "Don't delete the Podfile immediately.",
  },
];

function renderMigrationCallouts(paragraph) {
  return migrationCallouts
    .filter(callout => callout.test(paragraph))
    .map(callout => `<aside class="callout"><strong>Migration note</strong><p>${htmlEscape(callout.text)}</p></aside>`)
    .join('\n');
}

function renderBlogArticleMarkdown(body) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  const toc = [];
  let paragraph = [];
  let list = null;
  let code = null;
  let codeIndex = 0;

  function flushParagraph() {
    if (!paragraph.length) return;
    const text = paragraph.join(' ');
    const callouts = renderMigrationCallouts(text);
    html.push(`${callouts}${callouts ? '\n' : ''}<p>${renderInlineMarkdown(text)}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!list) return;
    const tag = list.ordered ? 'ol' : 'ul';
    html.push(`<${tag}${list.checklist ? ' class="checklist"' : ''}>${list.items.join('')}</${tag}>`);
    list = null;
  }

  function flushCode() {
    if (!code) return;
    const id = `code-${++codeIndex}`;
    const language = code.lang || 'text';
    html.push(`<div class="code-block">
      <div class="code-toolbar"><span>${htmlEscape(language)}</span><button type="button" data-copy-code="${id}">Copy</button></div>
      <pre><code id="${id}" class="language-${htmlEscape(language)}">${highlightCode(code.lines.join('\n'), language)}</code></pre>
    </div>`);
    code = null;
  }

  for (const line of lines) {
    const fence = line.match(/^```([A-Za-z0-9_-]*)\s*$/);
    if (fence) {
      if (code) {
        flushCode();
      } else {
        flushParagraph();
        flushList();
        code = { lang: fence[1] || 'text', lines: [] };
      }
      continue;
    }

    if (code) {
      code.lines.push(line);
      continue;
    }

    if (/^\s*$/.test(line)) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^---\s*$/.test(line)) {
      flushParagraph();
      flushList();
      html.push('<hr />');
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const rawText = heading[2].trim();
      const id = slugifyHeading(rawText);
      toc.push({ id, level, text: rawText.replace(/\*\*/g, '').replace(/`/g, '') });
      html.push(`<h${level} id="${id}"><a class="heading-anchor" href="#${id}" aria-label="Link to ${htmlEscape(rawText)}">#</a>${renderInlineMarkdown(rawText)}</h${level}>`);
      continue;
    }

    const checklistItem = line.match(/^- \[ \]\s+(.+)$/);
    if (checklistItem) {
      flushParagraph();
      if (!list || list.ordered || !list.checklist) {
        flushList();
        list = { ordered: false, checklist: true, items: [] };
      }
      list.items.push(`<li><label><input type="checkbox" /> <span>${renderInlineMarkdown(checklistItem[1])}</span></label></li>`);
      continue;
    }

    const bullet = line.match(/^-\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (!list || list.ordered || list.checklist) {
        flushList();
        list = { ordered: false, checklist: false, items: [] };
      }
      const itemText = bullet[1];
      const callouts = renderMigrationCallouts(itemText);
      if (callouts) html.push(callouts);
      list.items.push(`<li>${renderInlineMarkdown(itemText)}</li>`);
      continue;
    }

    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, checklist: false, items: [] };
      }
      list.items.push(`<li>${renderInlineMarkdown(numbered[1])}</li>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushCode();

  return { html: html.join('\n'), toc };
}

function safeWrite(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function buildAppAssetTags() {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) return '';
  const html = fs.readFileSync(indexPath, 'utf8');
  const tags = [];
  for (const match of html.matchAll(/<script\b[^>]*type="module"[^>]*><\/script>/g)) {
    tags.push(match[0]);
  }
  for (const match of html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)) {
    tags.push(match[0]);
  }
  return tags.join('\n  ');
}

function channelLabel(channel) {
  const map = { stable: 'Stable', beta: 'Beta', dev: 'Dev', main: 'Main' };
  return map[channel] || channel;
}

function siteBaseUrl() {
  return SITE_URL.replace(/\/$/, '');
}

function formatChangelogDate(value) {
  if (!value) return '';
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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
  if (release.channel === 'stable') {
    const dart = release.dart_version ? ` — Dart ${release.dart_version}` : '';
    return `Flutter ${release.version} Release${dart}, Downloads & Release Notes`;
  }
  const dart = release.dart_version ? ` — Dart ${release.dart_version}` : '';
  return `Flutter ${release.version}${dart} | FlutterReleases`;
}

function buildPageDescription(release) {
  if (release.channel === 'stable') {
    return `Flutter ${release.version} release details including Dart SDK version, release date, downloads, requirements and release notes.`;
  }
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

function buildStableIntroHtml(release) {
  if (release.channel !== 'stable') return '';
  const date = release.released ? ` published on ${htmlEscape(release.released)}` : '';
  const dart = release.dart_version ? ` and includes Dart ${htmlEscape(release.dart_version)}` : '';
  return `<p>Flutter ${htmlEscape(release.version)} is a stable Flutter SDK release${date}${dart}.</p>`;
}

function buildStableInternalLinksHtml(release, items) {
  if (release.channel !== 'stable') return '';
  const context = findStableContext(items, release);
  const related = context.sameSeries.slice(0, 8);

  const previousHtml = context.previous
    ? `<li><strong>Previous stable:</strong> <a href="${releaseUrl(context.previous)}">Flutter ${htmlEscape(context.previous.version)}</a></li>`
    : '';
  const nextHtml = context.next
    ? `<li><strong>Next stable:</strong> <a href="${releaseUrl(context.next)}">Flutter ${htmlEscape(context.next.version)}</a></li>`
    : '';
  const seriesHtml = context.series
    ? `<li><a href="${seriesUrl(context.series)}">View all Flutter ${htmlEscape(context.series)} releases</a></li>`
    : '';
  const relatedHtml = related.length
    ? `<section>
      <h2>Related stable releases</h2>
      <ul>
        ${related.map(r => `<li><a href="${releaseUrl(r)}">Flutter ${htmlEscape(r.version)}</a>${r.dart_version ? ` — Dart ${htmlEscape(r.dart_version)}` : ''}${r.released ? ` — ${htmlEscape(r.released)}` : ''}</li>`).join('\n        ')}
      </ul>
    </section>`
    : '';

  return `<section>
      <h2>Stable release navigation</h2>
      <ul>
        ${previousHtml}
        ${nextHtml}
        ${seriesHtml}
        <li><a href="${siteBaseUrl()}/flutter-versions/">View all Flutter versions</a></li>
      </ul>
    </section>
    ${relatedHtml}`;
}

function buildBreadcrumbLd(release, pageUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Flutter Releases', item: siteBaseUrl() + '/' },
      { '@type': 'ListItem', position: 2, name: `Flutter ${release.version}`, item: pageUrl },
    ],
  }, null, '\t\t\t');
}

function semverGroup(version) {
  const match = String(version || '').match(/^v?(\d+)\.(\d+)\./);
  return match ? `${match[1]}.${match[2]}` : null;
}

function seriesId(series) {
  return `flutter-${String(series).replace(/\./g, '-')}`;
}

function seriesUrl(series) {
  return `${siteBaseUrl()}/flutter-versions/#${seriesId(series)}`;
}

function releasePath(release) {
  return `/release/${encodeURIComponent(release.version)}/`;
}

function releaseUrl(release) {
  return `${siteBaseUrl()}${releasePath(release)}`;
}

function toRfc822(dateValue) {
  try {
    const dt = dateValue ? new Date(dateValue) : new Date();
    const valid = Number.isNaN(dt.getTime()) ? new Date() : dt;
    return valid.toUTCString();
  } catch {
    return new Date().toUTCString();
  }
}

function latestByChannel(items, channel) {
  return items.find(r => r.channel === channel && r.version);
}

function stableReleases(items) {
  return items.filter(r => r.channel === 'stable' && r.version);
}

function versionedReleases(items) {
  return items.filter(r => r.version && semverGroup(r.version));
}

function groupReleasesBySeries(items) {
  const groups = new Map();
  for (const release of items) {
    const group = semverGroup(release.version);
    if (!group) continue;
    const rows = groups.get(group) || [];
    rows.push(release);
    groups.set(group, rows);
  }
  return Array.from(groups.entries());
}

function findStableContext(items, release) {
  const stable = stableReleases(items);
  const index = stable.findIndex(r => r.version === release.version);
  const series = semverGroup(release.version);
  const sameSeries = series
    ? stable.filter(r => semverGroup(r.version) === series)
    : [];

  return {
    series,
    previous: index >= 0 ? stable[index + 1] || null : null,
    next: index > 0 ? stable[index - 1] || null : null,
    sameSeries: sameSeries.filter(r => r.version !== release.version),
  };
}

function buildFlutterVersionsBreadcrumbLd(pageUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Flutter Releases', item: siteBaseUrl() + '/' },
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

function buildVersionCheckerBreadcrumbLd(pageUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Flutter Releases', item: siteBaseUrl() + '/' },
      { '@type': 'ListItem', position: 2, name: 'Flutter Versions & Releases', item: siteBaseUrl() + '/flutter-versions/' },
      { '@type': 'ListItem', position: 3, name: 'Flutter & Dart Version Compatibility Checker', item: pageUrl },
    ],
  }, null, '\t\t\t');
}

function buildVersionCheckerWebPageLd(pageUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Flutter & Dart Version Compatibility Checker',
    url: pageUrl,
    description: 'Check which Dart SDK version ships with any Flutter release and find Flutter versions compatible with a specific Dart version.',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Flutter Releases',
      url: SITE_URL + '/',
    },
  }, null, '\t\t\t');
}

function buildBlogBreadcrumbLd(pageUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Flutter Releases', item: siteBaseUrl() + '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: pageUrl },
    ],
  }, null, '\t\t\t');
}

function buildBlogWebPageLd(pageUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Flutter Releases Blog',
    url: pageUrl,
    description: 'Read Flutter release guides for latest Flutter versions, Dart SDK compatibility, release notes, SDK downloads, and version history.',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Flutter Releases',
      url: SITE_URL + '/',
    },
  }, null, '\t\t\t');
}

function buildBlogCardHtml(post) {
  return `<article class="blog-card">
      <a href="${htmlEscape(post.href)}">
        <img src="${htmlEscape(post.image)}" alt="" width="720" height="405" loading="lazy" />
        <span>${htmlEscape(post.category)}</span>
        <h2>${htmlEscape(post.title)}</h2>
        <p>${htmlEscape(post.description)}</p>
        <strong>Open resource →</strong>
      </a>
    </article>`;
}

function buildBlogPageHtml(posts, appAssetTags = '') {
  const pageUrl = `${siteBaseUrl()}/blog/`;
  const title = 'Flutter Releases Blog | Flutter Versions, Dart Compatibility & SDK Guides';
  const desc = 'Read Flutter release guides for latest Flutter versions, Dart SDK compatibility, release notes, SDK downloads, and version history.';
  const breadcrumbLd = buildBlogBreadcrumbLd(pageUrl);
  const webPageLd = buildBlogWebPageLd(pageUrl);
  const postsHtml = posts.length > 0
    ? posts.map(buildBlogCardHtml).join('\n        ')
    : `<section class="empty-state">
        <h2>Articles are coming soon</h2>
        <p>Add your article metadata and links to publish posts in this grid.</p>
      </section>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(desc)}" />
  <meta name="theme-color" content="#054D8E" />
  <meta name="msvalidate.01" content="B2298FC723DFA6F8AC3DF5D162CC845C" />
  <meta name="yandex-verification" content="2b9226ee6947f0c0" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta property="og:title" content="${htmlEscape(title)}" />
  <meta property="og:description" content="${htmlEscape(desc)}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${SITE_URL}/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${htmlEscape(title)}" />
  <meta name="twitter:description" content="${htmlEscape(desc)}" />
  <meta name="twitter:image" content="${SITE_URL}/og-image.png" />
  <link rel="canonical" href="${pageUrl}" />
  <link rel="alternate" type="application/rss+xml" title="Flutter Releases Feed" href="${SITE_URL}/feed.xml" />
  ${appAssetTags}
  <script type="application/ld+json">
    ${breadcrumbLd}
  </script>
  <script type="application/ld+json">
    ${webPageLd}
  </script>
  <script>
    (function () {
      try {
        var saved = localStorage.getItem('theme');
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if ((saved && saved === 'dark') || (!saved && prefersDark)) {
          document.documentElement.classList.add('dark');
        }
      } catch {}
    })();
  </script>
  <style>
    :root { color-scheme: light; --bg: #fafafa; --surface: #ffffff; --subtle: #f4f4f5; --border: #e4e4e7; --text: #18181b; --secondary: #71717a; --muted: #71717a; --accent: #0ea5e9; --row-hover: #f9fafb; }
    .dark { color-scheme: dark; --bg: #09090b; --surface: #111113; --subtle: #18181b; --border: #27272a; --text: #fafafa; --secondary: #a1a1aa; --muted: #52525b; --accent: #38bdf8; --row-hover: #18181b; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); line-height: 1.55; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    header, footer, .hero { background: var(--surface); border-color: var(--border); }
    header { border-bottom: 1px solid var(--border); }
    .site-nav, main, footer > div { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
    .site-nav { min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .site-nav .links { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; }
    .brand { color: var(--text); }
    .hero { border-bottom: 1px solid var(--border); }
    .hero-inner { max-width: 1200px; margin: 0 auto; padding: 2.5rem 1.5rem; }
    .eyebrow { color: var(--accent); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; font-weight: 700; margin: 0 0 0.75rem; }
    h1 { font-size: 1.875rem; line-height: 1.2; margin: 0 0 0.5rem; }
    .intro { max-width: 44rem; color: var(--secondary); margin: 0; }
    main { padding-top: 2rem; padding-bottom: 2rem; }
    .blog-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
    .blog-card { overflow: hidden; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); }
    .blog-card:hover { border-color: var(--accent); }
    .blog-card a { display: block; color: inherit; }
    .blog-card img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-bottom: 1px solid var(--border); background: var(--subtle); }
    .blog-card span { display: block; margin: 1rem 1rem 0.5rem; color: var(--accent); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; font-weight: 700; }
    .blog-card h2 { margin: 0 1rem 0.5rem; color: var(--text); font-size: 1rem; line-height: 1.35; }
    .blog-card p { margin: 0 1rem 1rem; color: var(--secondary); font-size: 0.875rem; }
    .blog-card strong { display: inline-block; margin: 0 1rem 1rem; color: var(--accent); font-size: 0.875rem; }
    .empty-state { grid-column: 1 / -1; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 1.5rem; }
    .empty-state h2 { margin: 0 0 0.5rem; font-size: 1.125rem; color: var(--text); }
    .empty-state p { margin: 0; max-width: 42rem; color: var(--secondary); font-size: 0.875rem; }
    .js #static-seo { display: none; }
    footer { border-top: 1px solid var(--border); }
    footer > div { padding-top: 1.25rem; padding-bottom: 1.25rem; font-size: 0.8125rem; }
    @media (max-width: 860px) { .blog-grid { grid-template-columns: 1fr; } .site-nav { align-items: flex-start; padding-top: 1rem; padding-bottom: 1rem; flex-direction: column; } }
  </style>
</head>
<body>
  <script>document.documentElement.classList.add('js');</script>
  <div id="root"></div>
  <div id="static-seo">
    <header>
      <nav class="site-nav">
        <a class="brand" href="${SITE_URL}/"><strong>Flutter Releases</strong></a>
        <div class="links">
          <a href="${SITE_URL}/">Releases</a>
          <a href="${SITE_URL}/flutter-versions/">Flutter Versions</a>
          <a href="${SITE_URL}/tools/flutter-version-checker/">Compatibility Tool</a>
          <a href="${SITE_URL}/blog/">Blog</a>
        </div>
      </nav>
    </header>
    <section class="hero">
      <div class="hero-inner">
        <p class="eyebrow">Flutter Releases Blog</p>
        <h1>Flutter release guides</h1>
        <p class="intro">${htmlEscape(desc)}</p>
      </div>
    </section>
    <main>
      <section class="blog-grid">
        ${postsHtml}
      </section>
    </main>
    <footer>
      <div>
        <p><a href="${SITE_URL}/">FlutterReleases.com</a> &mdash; <a href="${SITE_URL}/flutter-versions/">Flutter versions</a> &mdash; <a href="${SITE_URL}/tools/flutter-version-checker/">Flutter Dart compatibility checker</a></p>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

function buildFaqBreadcrumbLd(pageUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Flutter Releases', item: siteBaseUrl() + '/' },
      { '@type': 'ListItem', position: 2, name: 'FAQ', item: pageUrl },
    ],
  }, null, '\t\t\t');
}

function buildFaqPageLd(pageUrl, items) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: 'FlutterReleases FAQ',
    url: pageUrl,
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }, null, '\t\t\t');
}

function buildFaqLinkHtml(link) {
  const href = String(link.href || '');
  const external = /^https?:\/\//.test(href);
  return `<a href="${htmlEscape(external ? href : `${siteBaseUrl()}${href}`)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${htmlEscape(link.label)}</a>`;
}

function buildFaqItemHtml(item) {
  const links = Array.isArray(item.links) && item.links.length
    ? `<div class="resource-links">${item.links.map(buildFaqLinkHtml).join('')}</div>`
    : '';
  return `<article class="info-card">
      <h2>${htmlEscape(item.question)}</h2>
      <p>${htmlEscape(item.answer)}</p>
      ${links}
    </article>`;
}

function buildFaqPageHtml(items, appAssetTags = '') {
  const pageUrl = `${siteBaseUrl()}/faq/`;
  const title = 'FlutterReleases FAQ | Flutter Versions, Dart Compatibility & Downloads';
  const desc = 'Answers about Flutter release data, latest stable versions, Dart SDK compatibility, downloads, release notes, and how FlutterReleases updates automatically.';
  const breadcrumbLd = buildFaqBreadcrumbLd(pageUrl);
  const faqLd = buildFaqPageLd(pageUrl, items);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(desc)}" />
  <meta name="theme-color" content="#054D8E" />
  <meta name="msvalidate.01" content="B2298FC723DFA6F8AC3DF5D162CC845C" />
  <meta name="yandex-verification" content="2b9226ee6947f0c0" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta property="og:title" content="${htmlEscape(title)}" />
  <meta property="og:description" content="${htmlEscape(desc)}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${SITE_URL}/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${htmlEscape(title)}" />
  <meta name="twitter:description" content="${htmlEscape(desc)}" />
  <meta name="twitter:image" content="${SITE_URL}/og-image.png" />
  <link rel="canonical" href="${pageUrl}" />
  <link rel="alternate" type="application/rss+xml" title="Flutter Releases Feed" href="${SITE_URL}/feed.xml" />
  ${appAssetTags}
  <script type="application/ld+json">
    ${breadcrumbLd}
  </script>
  <script type="application/ld+json">
    ${faqLd}
  </script>
  <script>
    (function () {
      try {
        var saved = localStorage.getItem('theme');
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if ((saved && saved === 'dark') || (!saved && prefersDark)) {
          document.documentElement.classList.add('dark');
        }
      } catch {}
    })();
  </script>
  <style>
    :root { color-scheme: light; --bg: #fafafa; --surface: #ffffff; --subtle: #f4f4f5; --border: #e4e4e7; --text: #18181b; --secondary: #71717a; --muted: #71717a; --accent: #0ea5e9; }
    .dark { color-scheme: dark; --bg: #09090b; --surface: #111113; --subtle: #18181b; --border: #27272a; --text: #fafafa; --secondary: #a1a1aa; --muted: #52525b; --accent: #38bdf8; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); line-height: 1.55; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    header, footer, .hero { background: var(--surface); border-color: var(--border); }
    header { border-bottom: 1px solid var(--border); }
    .site-nav, main, footer > div { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
    .site-nav { min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .site-nav .links { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; }
    .brand { color: var(--text); }
    .hero { border-bottom: 1px solid var(--border); }
    .hero-inner { max-width: 1200px; margin: 0 auto; padding: 2.5rem 1.5rem; }
    .eyebrow { color: var(--accent); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; font-weight: 700; margin: 0 0 0.75rem; }
    h1 { font-size: 1.875rem; line-height: 1.2; margin: 0 0 0.5rem; }
    .intro { max-width: 44rem; color: var(--secondary); margin: 0; }
    main { padding-top: 2rem; padding-bottom: 2rem; }
    .faq-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
    .info-card { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 1.25rem; }
    .info-card h2 { margin: 0; font-size: 1rem; line-height: 1.4; color: var(--text); }
    .info-card p { margin: 0.75rem 0 0; color: var(--secondary); font-size: 0.875rem; }
    .resource-links { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1rem; font-size: 0.875rem; font-weight: 600; }
    .js #static-seo { display: none; }
    footer { border-top: 1px solid var(--border); }
    footer > div { padding-top: 1.25rem; padding-bottom: 1.25rem; font-size: 0.8125rem; }
    @media (max-width: 860px) { .faq-grid { grid-template-columns: 1fr; } .site-nav { align-items: flex-start; padding-top: 1rem; padding-bottom: 1rem; flex-direction: column; } }
  </style>
</head>
<body>
  <script>document.documentElement.classList.add('js');</script>
  <div id="root"></div>
  <div id="static-seo">
    <header>
      <nav class="site-nav">
        <a class="brand" href="${SITE_URL}/"><strong>Flutter Releases</strong></a>
        <div class="links">
          <a href="${SITE_URL}/">Releases</a>
          <a href="${SITE_URL}/flutter-versions/">Flutter Versions</a>
          <a href="${SITE_URL}/tools/flutter-version-checker/">Compatibility Tool</a>
          <a href="${SITE_URL}/blog/">Blog</a>
          <a href="${SITE_URL}/faq/">FAQ</a>
        </div>
      </nav>
    </header>
    <section class="hero">
      <div class="hero-inner">
        <p class="eyebrow">Help</p>
        <h1>FlutterReleases FAQ</h1>
        <p class="intro">${htmlEscape(desc)}</p>
      </div>
    </section>
    <main>
      <section class="faq-grid">
        ${items.map(buildFaqItemHtml).join('\n        ')}
      </section>
    </main>
    <footer>
      <div>
        <p><a href="${SITE_URL}/">FlutterReleases.com</a> &mdash; <a href="${SITE_URL}/flutter-versions/">Flutter versions</a> &mdash; <a href="${SITE_URL}/tools/flutter-version-checker/">Flutter Dart compatibility checker</a></p>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

function buildChangelogBreadcrumbLd(pageUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Flutter Releases', item: siteBaseUrl() + '/' },
      { '@type': 'ListItem', position: 2, name: 'Changelog', item: pageUrl },
    ],
  }, null, '\t\t\t');
}

function buildChangelogItemHtml(item) {
  return `<li class="info-card">
      <time datetime="${htmlEscape(item.date)}">${htmlEscape(formatChangelogDate(item.date))}</time>
      <h2>${htmlEscape(item.title)}</h2>
      <p>${htmlEscape(item.summary)}</p>
    </li>`;
}

function buildChangelogPageHtml(items, appAssetTags = '') {
  const pageUrl = `${siteBaseUrl()}/changelog/`;
  const title = 'FlutterReleases Changelog';
  const desc = 'Site updates for FlutterReleases.com.';
  const breadcrumbLd = buildChangelogBreadcrumbLd(pageUrl);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(desc)}" />
  <meta name="theme-color" content="#054D8E" />
  <meta name="msvalidate.01" content="B2298FC723DFA6F8AC3DF5D162CC845C" />
  <meta name="yandex-verification" content="2b9226ee6947f0c0" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta property="og:title" content="${htmlEscape(title)}" />
  <meta property="og:description" content="${htmlEscape(desc)}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${SITE_URL}/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${htmlEscape(title)}" />
  <meta name="twitter:description" content="${htmlEscape(desc)}" />
  <meta name="twitter:image" content="${SITE_URL}/og-image.png" />
  <link rel="canonical" href="${pageUrl}" />
  ${appAssetTags}
  <script type="application/ld+json">
    ${breadcrumbLd}
  </script>
  <script>
    (function () {
      try {
        var saved = localStorage.getItem('theme');
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if ((saved && saved === 'dark') || (!saved && prefersDark)) {
          document.documentElement.classList.add('dark');
        }
      } catch {}
    })();
  </script>
  <style>
    :root { color-scheme: light; --bg: #fafafa; --surface: #ffffff; --subtle: #f4f4f5; --border: #e4e4e7; --text: #18181b; --secondary: #71717a; --muted: #71717a; --accent: #0ea5e9; }
    .dark { color-scheme: dark; --bg: #09090b; --surface: #111113; --subtle: #18181b; --border: #27272a; --text: #fafafa; --secondary: #a1a1aa; --muted: #52525b; --accent: #38bdf8; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); line-height: 1.55; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    header, footer, .hero { background: var(--surface); border-color: var(--border); }
    header { border-bottom: 1px solid var(--border); }
    .site-nav, main, footer > div { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
    .site-nav { min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .site-nav .links { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; }
    .brand { color: var(--text); }
    .hero { border-bottom: 1px solid var(--border); }
    .hero-inner { max-width: 1200px; margin: 0 auto; padding: 2.5rem 1.5rem; }
    .eyebrow { color: var(--accent); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; font-weight: 700; margin: 0 0 0.75rem; }
    h1 { font-size: 1.875rem; line-height: 1.2; margin: 0 0 0.5rem; }
    .intro { max-width: 44rem; color: var(--secondary); margin: 0; }
    main { max-width: 900px; padding-top: 2rem; padding-bottom: 2rem; }
    ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; }
    .info-card { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 1.25rem; }
    .info-card time { color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; font-weight: 700; }
    .info-card h2 { margin: 0.5rem 0 0; font-size: 1rem; line-height: 1.4; color: var(--text); }
    .info-card p { margin: 0.5rem 0 0; color: var(--secondary); font-size: 0.875rem; }
    .js #static-seo { display: none; }
    footer { border-top: 1px solid var(--border); }
    footer > div { padding-top: 1.25rem; padding-bottom: 1.25rem; font-size: 0.8125rem; }
    @media (max-width: 860px) { .site-nav { align-items: flex-start; padding-top: 1rem; padding-bottom: 1rem; flex-direction: column; } }
  </style>
</head>
<body>
  <script>document.documentElement.classList.add('js');</script>
  <div id="root"></div>
  <div id="static-seo">
    <header>
      <nav class="site-nav">
        <a class="brand" href="${SITE_URL}/"><strong>Flutter Releases</strong></a>
        <div class="links">
          <a href="${SITE_URL}/">Releases</a>
          <a href="${SITE_URL}/flutter-versions/">Flutter Versions</a>
          <a href="${SITE_URL}/tools/flutter-version-checker/">Compatibility Tool</a>
          <a href="${SITE_URL}/blog/">Blog</a>
        </div>
      </nav>
    </header>
    <section class="hero">
      <div class="hero-inner">
        <p class="eyebrow">Site updates</p>
        <h1>FlutterReleases changelog</h1>
        <p class="intro">${htmlEscape(desc)}</p>
      </div>
    </section>
    <main>
      <ol>
        ${items.map(buildChangelogItemHtml).join('\n        ')}
      </ol>
    </main>
    <footer>
      <div>
        <p><a href="${SITE_URL}/">FlutterReleases.com</a> &mdash; <a href="${SITE_URL}/flutter-versions/">Flutter versions</a> &mdash; <a href="${SITE_URL}/tools/flutter-version-checker/">Flutter Dart compatibility checker</a></p>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

function buildBlogArticleBreadcrumbLd(article, pageUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Flutter Releases', item: siteBaseUrl() + '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: siteBaseUrl() + '/blog/' },
      { '@type': 'ListItem', position: 3, name: article.meta.title, item: pageUrl },
    ],
  }, null, '\t\t\t');
}

function buildBlogArticleLd(article, pageUrl, generatedAt) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.meta.title,
    description: article.meta.meta_description || article.meta.subtitle || '',
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    image: `${siteBaseUrl()}/blog/flutter-cocoapods-to-swift-package-manager-migration.svg`,
    datePublished: generatedAt,
    dateModified: generatedAt,
    author: {
      '@type': 'Person',
      name: 'Shankar Madeshvaran',
      url: 'https://amshankar.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Flutter Releases',
      logo: {
        '@type': 'ImageObject',
        url: `${siteBaseUrl()}/android-chrome-512x512.png`,
      },
    },
    keywords: [
      article.meta.primary_keyword,
      ...(article.meta.secondary_keywords || []),
      ...(article.meta.tags || []),
    ].filter(Boolean),
  }, null, '\t\t\t');
}

function buildTocHtml(toc) {
  const items = toc
    .filter(item => item.level > 1 && item.level < 4)
    .map(item => `<li class="toc-level-${item.level}"><a href="#${htmlEscape(item.id)}">${htmlEscape(item.text)}</a></li>`)
    .join('\n');
  return `<nav class="toc" aria-label="Table of contents">
      <h2>Table of contents</h2>
      <ol>
${items}
      </ol>
    </nav>`;
}

function buildBlogArticlePageHtml(article, generatedAt) {
  const pageUrl = `${siteBaseUrl()}${article.meta.slug}`;
  const title = article.meta.meta_title || article.meta.title;
  const desc = article.meta.meta_description || article.meta.subtitle || '';
  const body = article.body.replace(new RegExp(`^\\s*#\\s+${article.meta.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n+`), '');
  const rendered = renderBlogArticleMarkdown(body);
  const breadcrumbLd = buildBlogArticleBreadcrumbLd(article, pageUrl);
  const articleLd = buildBlogArticleLd(article, pageUrl, generatedAt);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(desc)}" />
  <meta name="theme-color" content="#054D8E" />
  <meta name="msvalidate.01" content="B2298FC723DFA6F8AC3DF5D162CC845C" />
  <meta name="yandex-verification" content="2b9226ee6947f0c0" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta property="og:title" content="${htmlEscape(title)}" />
  <meta property="og:description" content="${htmlEscape(desc)}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:image" content="${SITE_URL}/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${htmlEscape(title)}" />
  <meta name="twitter:description" content="${htmlEscape(desc)}" />
  <meta name="twitter:image" content="${SITE_URL}/og-image.png" />
  <link rel="canonical" href="${pageUrl}" />
  <link rel="alternate" type="application/rss+xml" title="Flutter Releases Feed" href="${SITE_URL}/feed.xml" />
  <script type="application/ld+json">
    ${breadcrumbLd}
  </script>
  <script type="application/ld+json">
    ${articleLd}
  </script>
  <script>
    (function () {
      try {
        var saved = localStorage.getItem('theme');
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if ((saved && saved === 'dark') || (!saved && prefersDark)) {
          document.documentElement.classList.add('dark');
        }
      } catch {}
    })();
  </script>
  <style>
    :root { color-scheme: light; --bg: #fafafa; --surface: #ffffff; --subtle: #f4f4f5; --border: #e4e4e7; --text: #18181b; --secondary: #52525b; --muted: #71717a; --accent: #0ea5e9; --accent-hover: #0284c7; --code-bg: #0b1220; --code-text: #e5e7eb; --callout-bg: #e0f2fe; --callout-border: #0ea5e9; --callout-text: #0c4a6e; }
    .dark { color-scheme: dark; --bg: #09090b; --surface: #111113; --subtle: #18181b; --border: #27272a; --text: #fafafa; --secondary: #a1a1aa; --muted: #71717a; --accent: #38bdf8; --accent-hover: #7dd3fc; --code-bg: #020617; --code-text: #e5e7eb; --callout-bg: #082f49; --callout-border: #38bdf8; --callout-text: #bae6fd; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { color: var(--accent-hover); text-decoration: underline; }
    header, footer, .article-hero { background: var(--surface); border-color: var(--border); }
    header { border-bottom: 1px solid var(--border); }
    .site-nav, footer > div, .article-hero > div, main { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
    .site-nav { min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .site-nav .links { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; }
    .brand { color: var(--text); }
    .article-hero { border-bottom: 1px solid var(--border); }
    .article-hero > div { padding-top: 2.75rem; padding-bottom: 2.75rem; }
    .eyebrow { color: var(--accent); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; font-weight: 700; margin: 0 0 0.75rem; }
    h1 { max-width: 820px; font-size: clamp(2rem, 4vw, 3.5rem); line-height: 1.05; margin: 0 0 1rem; letter-spacing: -0.02em; }
    .subtitle { max-width: 760px; color: var(--secondary); margin: 0 0 1rem; font-size: 1rem; }
    .meta { display: flex; flex-wrap: wrap; gap: 0.75rem; color: var(--muted); font-size: 0.875rem; }
    main { display: grid; grid-template-columns: minmax(0, 220px) minmax(0, 760px); gap: 3rem; padding-top: 2rem; padding-bottom: 3rem; align-items: start; }
    .toc { position: sticky; top: 5rem; display: block; max-height: calc(100vh - 7rem); overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 1rem; }
    .toc h2 { font-size: 0.875rem; margin: 0 0 0.75rem; color: var(--text); }
    .toc ol { list-style: none; margin: 0; padding: 0; }
    .toc li { margin: 0.45rem 0; font-size: 0.8125rem; line-height: 1.35; }
    .toc-level-3 { padding-left: 0.75rem; }
    article { min-width: 0; }
    article h2, article h3, article h4 { line-height: 1.25; margin: 2rem 0 0.75rem; letter-spacing: -0.01em; }
    article h2 { font-size: 1.55rem; }
    article h3 { font-size: 1.2rem; }
    article h4 { font-size: 1rem; }
    .heading-anchor { float: left; width: 1.25rem; margin-left: -1.25rem; opacity: 0; color: var(--accent); }
    h2:hover .heading-anchor, h3:hover .heading-anchor, h4:hover .heading-anchor { opacity: 1; }
    article p, article li { color: var(--secondary); }
    article p { margin: 0 0 1rem; }
    article ul, article ol { padding-left: 1.25rem; margin: 0 0 1.25rem; }
    article code:not(pre code) { border: 1px solid var(--border); border-radius: 5px; background: var(--subtle); padding: 0.1rem 0.3rem; font-size: 0.9em; color: var(--text); }
    hr { border: 0; border-top: 1px solid var(--border); margin: 2rem 0; }
    .callout { border: 1px solid var(--callout-border); border-left-width: 4px; border-radius: 8px; background: var(--callout-bg); color: var(--callout-text); padding: 1rem; margin: 1.25rem 0; }
    .callout strong { display: block; margin-bottom: 0.25rem; color: var(--callout-text); }
    .callout p { margin: 0; color: var(--callout-text); }
    .code-block { overflow: hidden; border: 1px solid var(--border); border-radius: 8px; margin: 1rem 0 1.5rem; background: var(--code-bg); }
    .code-toolbar { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.12); padding: 0.5rem 0.75rem; color: #94a3b8; font-size: 0.75rem; }
    .code-toolbar button { border: 1px solid rgba(255,255,255,0.18); border-radius: 6px; background: rgba(255,255,255,0.06); color: #e5e7eb; cursor: pointer; font-size: 0.75rem; padding: 0.25rem 0.55rem; }
    pre { overflow-x: auto; margin: 0; padding: 1rem; color: var(--code-text); }
    pre code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, ui-monospace, monospace; font-size: 0.875rem; }
    .code-command { color: #7dd3fc; font-weight: 700; }
    .code-keyword { color: #c084fc; font-weight: 700; }
    .code-var { color: #facc15; }
    .checklist { list-style: none; padding-left: 0; }
    .checklist li { margin: 0.5rem 0; }
    .checklist label { display: flex; align-items: flex-start; gap: 0.55rem; }
    .checklist input { margin-top: 0.35rem; accent-color: var(--accent); }
    footer { border-top: 1px solid var(--border); }
    footer > div { padding-top: 1.25rem; padding-bottom: 1.25rem; color: var(--muted); font-size: 0.8125rem; }
    @media (max-width: 900px) { main { display: block; } .toc { position: static; max-height: none; margin-bottom: 2rem; } .site-nav { align-items: flex-start; padding-top: 1rem; padding-bottom: 1rem; flex-direction: column; } }
  </style>
</head>
<body>
  <header>
    <nav class="site-nav">
      <a class="brand" href="${SITE_URL}/"><strong>Flutter Releases</strong></a>
      <div class="links">
        <a href="${SITE_URL}/">Releases</a>
        <a href="${SITE_URL}/flutter-versions/">Flutter Versions</a>
        <a href="${SITE_URL}/tools/flutter-version-checker/">Compatibility Tool</a>
        <a href="${SITE_URL}/blog/">Blog</a>
      </div>
    </nav>
  </header>
  <section class="article-hero">
    <div>
      <p class="eyebrow">${htmlEscape(article.meta.primary_keyword || 'Flutter iOS migration')}</p>
      <h1>${htmlEscape(article.meta.title)}</h1>
      <p class="subtitle">${htmlEscape(article.meta.subtitle || '')}</p>
      <div class="meta">
        ${article.meta.reading_time ? `<span>${htmlEscape(article.meta.reading_time)} read</span>` : ''}
      </div>
    </div>
  </section>
  <main>
    ${buildTocHtml(rendered.toc)}
    <article>
${rendered.html}
    </article>
  </main>
  <footer>
    <div>
      <p><a href="${SITE_URL}/">FlutterReleases.com</a> &mdash; <a href="${SITE_URL}/blog/">Blog</a> &mdash; <a href="${SITE_URL}/flutter-versions/">Flutter versions</a></p>
    </div>
  </footer>
  <script>
    for (const button of document.querySelectorAll('[data-copy-code]')) {
      button.addEventListener('click', async () => {
        const target = document.getElementById(button.getAttribute('data-copy-code'));
        if (!target) return;
        try {
          await navigator.clipboard.writeText(target.textContent || '');
          button.textContent = 'Copied';
          window.setTimeout(() => { button.textContent = 'Copy'; }, 1400);
        } catch {
          button.textContent = 'Copy failed';
          window.setTimeout(() => { button.textContent = 'Copy'; }, 1400);
        }
      });
    }
  </script>
</body>
</html>`;
}

const COMPAT_CHANNEL_ORDER = { stable: 0, beta: 1, dev: 2, main: 3 };

function releaseTime(release) {
  const time = release.released ? new Date(release.released).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function sortReleasesForCompatibility(items) {
  return [...items].sort((a, b) => {
    const channelDelta = (COMPAT_CHANNEL_ORDER[a.channel] ?? 4) - (COMPAT_CHANNEL_ORDER[b.channel] ?? 4);
    if (channelDelta !== 0) return channelDelta;
    return releaseTime(b) - releaseTime(a);
  });
}

function getDartVersionForFlutter(items, flutterVersion) {
  return items.find(r => r.version === flutterVersion);
}

function getFlutterVersionsForDart(items, dartVersion) {
  return sortReleasesForCompatibility(items.filter(r => r.dart_version === dartVersion));
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

function buildCompatibilityRowsHtml(items) {
  return items.map(release => `<tr>
          <td><a href="${releaseUrl(release)}">Flutter ${htmlEscape(release.version)}</a></td>
          <td>${htmlEscape(release.dart_version || 'Unavailable')}</td>
          <td>${htmlEscape(channelLabel(release.channel))}</td>
          <td>${htmlEscape(release.released || 'Unknown')}</td>
        </tr>`).join('\n');
}

function buildVersionCheckerPageHtml(items, generatedAt, appAssetTags = '') {
  const pageUrl = `${siteBaseUrl()}/tools/flutter-version-checker/`;
  const sorted = sortReleasesForCompatibility(items.filter(r => r.version));
  const stable = sorted.filter(r => r.channel === 'stable');
  const prerelease = sorted.filter(r => r.channel !== 'stable');
  const latestStable = stable[0];
  const exampleRelease = latestStable || sorted[0];
  const exampleDart = exampleRelease?.dart_version || '';
  const matchingFlutter = exampleDart ? getFlutterVersionsForDart(items, exampleDart) : [];
  const compatibility = exampleRelease && exampleDart
    ? checkFlutterDartCompatibility(items, exampleRelease.version, exampleDart)
    : null;
  const generatedDate = generatedAt ? new Date(generatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const breadcrumbLd = buildVersionCheckerBreadcrumbLd(pageUrl);
  const webPageLd = buildVersionCheckerWebPageLd(pageUrl);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flutter &amp; Dart Version Compatibility Checker | FlutterReleases</title>
  <meta name="description" content="Check which Dart SDK version ships with any Flutter release and find Flutter versions compatible with a specific Dart version." />
  <meta name="theme-color" content="#054D8E" />
  <meta name="msvalidate.01" content="B2298FC723DFA6F8AC3DF5D162CC845C" />
  <meta name="yandex-verification" content="2b9226ee6947f0c0" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta property="og:title" content="Flutter &amp; Dart Version Compatibility Checker | FlutterReleases" />
  <meta property="og:description" content="Check which Dart SDK version ships with any Flutter release and find Flutter versions compatible with a specific Dart version." />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${SITE_URL}/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Flutter &amp; Dart Version Compatibility Checker | FlutterReleases" />
  <meta name="twitter:description" content="Check which Dart SDK version ships with any Flutter release and find Flutter versions compatible with a specific Dart version." />
  <meta name="twitter:image" content="${SITE_URL}/og-image.png" />
  <link rel="canonical" href="${pageUrl}" />
  <link rel="alternate" type="application/rss+xml" title="Flutter Releases Feed" href="${SITE_URL}/feed.xml" />
  ${appAssetTags}
  <script type="application/ld+json">
    ${breadcrumbLd}
  </script>
  <script type="application/ld+json">
    ${webPageLd}
  </script>
  <script>
    (function () {
      try {
        var saved = localStorage.getItem('theme');
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if ((saved && saved === 'dark') || (!saved && prefersDark)) {
          document.documentElement.classList.add('dark');
        }
      } catch {}
    })();
  </script>
  <style>
    :root { color-scheme: light; --bg: #fafafa; --surface: #ffffff; --subtle: #f4f4f5; --border: #e4e4e7; --text: #18181b; --secondary: #71717a; --muted: #71717a; --accent: #0ea5e9; --accent-hover: #0284c7; --row-hover: #f9fafb; }
    .dark { color-scheme: dark; --bg: #09090b; --surface: #111113; --subtle: #18181b; --border: #27272a; --text: #fafafa; --secondary: #a1a1aa; --muted: #52525b; --accent: #38bdf8; --accent-hover: #7dd3fc; --row-hover: #18181b; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); line-height: 1.55; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    header, footer, .hero { background: var(--surface); border-color: var(--border); }
    header { border-bottom: 1px solid var(--border); }
    nav, main, footer > div { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
    nav { min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .brand { color: var(--text); }
    nav .links { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; }
    .hero { border-bottom: 1px solid var(--border); }
    .hero-inner { max-width: 1200px; margin: 0 auto; padding: 2.5rem 1.5rem; }
    h1 { font-size: 1.875rem; line-height: 1.2; margin: 0 0 0.5rem; }
    h2 { font-size: 1.125rem; margin: 0 0 0.75rem; }
    h3 { font-size: 1rem; margin: 2rem 0 0.75rem; }
    .intro { max-width: 44rem; color: var(--secondary); margin: 0; }
    .eyebrow { color: var(--accent); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; font-weight: 700; margin: 0 0 0.75rem; }
    main { padding-top: 2rem; padding-bottom: 2rem; }
    .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
    .muted { color: var(--secondary); }
    .mono { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, ui-monospace, monospace; }
    .badge { display: inline-flex; align-items: center; border-radius: 999px; background: var(--subtle); color: var(--secondary); padding: 0.125rem 0.5rem; font-size: 0.75rem; }
    .section-head { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .section-head p, footer p { color: var(--muted); margin: 0.25rem 0 0; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); margin-bottom: 2rem; }
    table { border-collapse: collapse; width: 100%; min-width: 640px; }
    th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
    th { color: var(--muted); background: var(--subtle); text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.75rem; }
    tr:hover td { background: var(--row-hover); }
    .js #static-seo { display: none; }
    footer { border-top: 1px solid var(--border); }
    footer > div { padding-top: 1.25rem; padding-bottom: 1.25rem; font-size: 0.8125rem; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } nav { align-items: flex-start; padding-top: 1rem; padding-bottom: 1rem; flex-direction: column; } }
  </style>
</head>
<body>
  <script>document.documentElement.classList.add('js');</script>
  <div id="root"></div>
  <div id="static-seo">
  <header>
    <nav>
      <a class="brand" href="${SITE_URL}/"><strong>Flutter Releases</strong></a>
      <div class="links">
        <a href="${SITE_URL}/">Releases</a>
        <a href="${SITE_URL}/flutter-versions/">Flutter Versions</a>
        <a href="${SITE_URL}/tools/flutter-version-checker/">Compatibility Tool</a>
      </div>
    </nav>
  </header>
  <section class="hero">
    <div class="hero-inner">
      <p class="eyebrow">Flutter Dart Compatibility</p>
      <h1>Flutter &amp; Dart Version Compatibility Checker</h1>
      <p class="intro">Flutter releases bundle a specific Dart SDK. This tool maps Flutter versions to Dart versions and Dart versions back to Flutter releases using the FlutterReleases dataset.</p>
    </div>
  </section>
  <main>
    <section class="panel">
      <h2>Flutter to Dart lookup</h2>
      ${exampleRelease ? `<div class="grid">
        <div>
          <p class="muted">Example Flutter release</p>
          <p class="mono"><a href="${releaseUrl(exampleRelease)}">Flutter ${htmlEscape(exampleRelease.version)}</a></p>
        </div>
        <div>
          <p class="muted">Bundled Dart SDK</p>
          <p class="mono">${htmlEscape(exampleRelease.dart_version || 'Unavailable')}</p>
        </div>
        <div>
          <p class="muted">Channel</p>
          <p><span class="badge">${htmlEscape(channelLabel(exampleRelease.channel))}</span></p>
        </div>
        <div>
          <p class="muted">Released</p>
          <p>${htmlEscape(exampleRelease.released || 'Unknown')}</p>
        </div>
      </div>` : '<p class="muted">No Flutter release data is available.</p>'}
    </section>
    <section class="panel">
      <h2>Dart to Flutter lookup</h2>
      ${exampleDart ? `<p class="muted">Dart ${htmlEscape(exampleDart)} is bundled with ${matchingFlutter.length} Flutter release${matchingFlutter.length === 1 ? '' : 's'} in the current dataset.</p>
      <ul>
        ${matchingFlutter.slice(0, 8).map(release => `<li><a href="${releaseUrl(release)}">Flutter ${htmlEscape(release.version)}</a> <span class="badge">${htmlEscape(channelLabel(release.channel))}</span></li>`).join('\n        ')}
      </ul>` : '<p class="muted">No Dart SDK data is available.</p>'}
    </section>
    <section class="panel">
      <h2>Compatibility result example</h2>
      <p>${compatibility?.compatible ? `Compatible: Flutter ${htmlEscape(exampleRelease.version)} ships with Dart ${htmlEscape(exampleDart)}.` : 'Compatibility is determined by the Dart SDK bundled with each Flutter release.'}</p>
      <p class="muted">Flutter releases ship with a specific Dart SDK. This page does not imply arbitrary Dart SDK versions can be swapped into a Flutter installation.</p>
    </section>
    <section>
      <div class="section-head">
        <div>
          <h2>Stable Flutter and Dart Compatibility</h2>
          <p>Stable Flutter releases appear first in source order and visual order. Generated from releases.json on ${generatedDate}.</p>
        </div>
        <p>${stable.length} stable releases</p>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Flutter</th><th>Dart</th><th>Channel</th><th>Released</th></tr>
          </thead>
          <tbody>
${buildCompatibilityRowsHtml(stable)}
          </tbody>
        </table>
      </div>
    </section>
    <section>
      <div class="section-head">
        <div>
          <h2>Beta and Prerelease Flutter Versions</h2>
          <p>Non-stable releases are included for developers tracing beta, dev, main, or prerelease Dart SDK adoption.</p>
        </div>
        <p>${prerelease.length} non-stable releases</p>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Flutter</th><th>Dart</th><th>Channel</th><th>Released</th></tr>
          </thead>
          <tbody>
${buildCompatibilityRowsHtml(prerelease)}
          </tbody>
        </table>
      </div>
    </section>
    <section class="panel">
      <h2>Related Flutter version resources</h2>
      <ul>
        <li><a href="${SITE_URL}/flutter-versions/">All Flutter versions</a></li>
        ${latestStable ? `<li><a href="${releaseUrl(latestStable)}">Flutter ${htmlEscape(latestStable.version)} release</a></li>` : ''}
        <li><a href="${SITE_URL}/releases.json">Flutter release JSON dataset</a></li>
      </ul>
    </section>
  </main>
  <footer>
    <div>
      <p><a href="${SITE_URL}/">FlutterReleases.com</a> &mdash; <a href="${SITE_URL}/flutter-versions/">Flutter versions</a> &mdash; <a href="${SITE_URL}/tools/flutter-version-checker/">Flutter Dart compatibility checker</a></p>
    </div>
  </footer>
  </div>
</body>
</html>`;
}

function buildFlutterVersionsPageHtml(items, generatedAt) {
  const pageUrl = `${siteBaseUrl()}/flutter-versions/`;
  const latestStable = latestByChannel(items, 'stable');
  const latestBeta = latestByChannel(items, 'beta');
  const latestDev = latestByChannel(items, 'dev') || latestByChannel(items, 'main');
  const stable = stableReleases(items);
  const prerelease = versionedReleases(items).filter(r => r.channel !== 'stable');
  const stableGroups = groupReleasesBySeries(stable);
  const prereleaseGroups = groupReleasesBySeries(prerelease);
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

  function renderGroupTable(group, releases) {
    const rows = releases.map(renderReleaseRow).join('\n');
    return `<section id="${htmlEscape(seriesId(group))}">
      <h3>Flutter ${htmlEscape(group)}</h3>
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
  }

  const stableHistoryHtml = stableGroups.map(([group, releases]) => renderGroupTable(group, releases)).join('\n');
  const prereleaseHistoryHtml = prereleaseGroups.map(([group, releases]) => renderGroupTable(group, releases)).join('\n');
  const compatibilityRows = stable.map(renderReleaseRow).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flutter Versions &amp; Releases — Latest Stable Flutter SDK</title>
  <meta name="description" content="See the latest Flutter stable, beta and dev versions, complete Flutter version history, Dart SDK compatibility and release details." />
  <meta name="theme-color" content="#054D8E" />
  <meta name="msvalidate.01" content="B2298FC723DFA6F8AC3DF5D162CC845C" />
  <meta name="yandex-verification" content="2b9226ee6947f0c0" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
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
  <script>
    (function () {
      try {
        var saved = localStorage.getItem('theme');
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if ((saved && saved === 'dark') || (!saved && prefersDark)) {
          document.documentElement.classList.add('dark');
        }
      } catch {}
    })();
  </script>
  <style>
    :root { color-scheme: light; --bg: #fafafa; --surface: #ffffff; --subtle: #f4f4f5; --border: #e4e4e7; --text: #18181b; --secondary: #71717a; --muted: #71717a; --accent: #0ea5e9; --accent-hover: #0284c7; --row-hover: #f9fafb; }
    .dark { color-scheme: dark; --bg: #09090b; --surface: #111113; --subtle: #18181b; --border: #27272a; --text: #fafafa; --secondary: #a1a1aa; --muted: #52525b; --accent: #38bdf8; --accent-hover: #7dd3fc; --row-hover: #18181b; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); line-height: 1.55; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    header, footer, .hero { background: var(--surface); border-color: var(--border); }
    header { border-bottom: 1px solid var(--border); }
    nav, main, footer > div { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
    nav { height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .brand { color: var(--text); }
    nav .right { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    nav .links { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem; }
    .theme-toggle { width: 2.25rem; height: 2.25rem; border: 1px solid var(--border); border-radius: 6px; background: transparent; color: var(--secondary); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
    .theme-toggle:hover { border-color: var(--accent); color: var(--accent); }
    .theme-toggle .sun { display: none; }
    .dark .theme-toggle .sun { display: inline; }
    .dark .theme-toggle .moon { display: none; }
    .hero { border-bottom: 1px solid var(--border); }
    .hero-inner { max-width: 1200px; margin: 0 auto; padding: 2.5rem 1.5rem; }
    h1 { font-size: 1.875rem; line-height: 1.2; margin: 0 0 0.5rem; }
    h2 { font-size: 1.125rem; margin: 0 0 0.75rem; }
    h3 { font-size: 1rem; margin: 2rem 0 0.75rem; }
    .intro { max-width: 44rem; color: var(--muted); margin: 0; }
    .eyebrow { color: var(--accent); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; font-weight: 700; margin: 0 0 0.75rem; }
    .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin-top: 1.5rem; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; }
    .card:hover { border-color: var(--accent); }
    dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; margin: 1rem 0; }
    dt { color: var(--muted); font-size: 0.75rem; }
    dd { margin: 0; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, ui-monospace, monospace; font-size: 0.875rem; }
    main { padding-top: 2rem; padding-bottom: 2rem; }
    .section-head { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .section-head p, footer p { color: var(--muted); margin: 0.25rem 0 0; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); }
    table { border-collapse: collapse; width: 100%; min-width: 640px; }
    th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
    th { color: var(--muted); background: var(--subtle); text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.75rem; }
    tr:hover td { background: var(--row-hover); }
    footer { border-top: 1px solid var(--border); }
    footer > div { padding-top: 1.25rem; padding-bottom: 1.25rem; font-size: 0.8125rem; }
    @media (max-width: 760px) { .cards { grid-template-columns: 1fr; } nav { align-items: flex-start; height: auto; padding-top: 1rem; padding-bottom: 1rem; flex-direction: column; } nav .right { align-items: flex-start; } }
  </style>
</head>
<body>
  <header>
    <nav>
      <a class="brand" href="${SITE_URL}/"><strong>Flutter Releases</strong></a>
      <div class="right">
        <div class="links">
          <a href="${SITE_URL}/">Home</a>
          <a href="${SITE_URL}/links.html">All releases</a>
          <a href="${SITE_URL}/tools/flutter-version-checker/">Compatibility Tool</a>
        </div>
        <button class="theme-toggle" type="button" aria-label="Toggle theme" title="Toggle theme">
          <svg class="moon" aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3a6 6 0 0 0 9 7.5A9 9 0 1 1 12 3Z"></path>
          </svg>
          <svg class="sun" aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
          </svg>
        </button>
      </div>
    </nav>
  </header>
  <section class="hero">
    <div class="hero-inner">
      <p class="eyebrow">Flutter version history</p>
      <h1>Flutter Versions &amp; Releases</h1>
      <p class="intro">See the latest Flutter stable, beta and dev versions, complete Flutter version history, Dart SDK compatibility and release details.</p>
      <p class="intro" style="margin-top: 0.75rem;">Need to map Flutter to Dart? Use the <a href="${SITE_URL}/tools/flutter-version-checker/">Flutter &amp; Dart Version Compatibility Checker</a>.</p>
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
          <h2>Stable Flutter Version History</h2>
          <p>Stable Flutter SDK releases grouped by major and minor version. Generated from releases.json on ${generatedDate}.</p>
        </div>
        <p>${stable.length} stable releases</p>
      </div>
      ${stableHistoryHtml}
    </section>
    <section>
      <div class="section-head">
        <div>
          <h2>Flutter ↔ Dart compatibility</h2>
          <p>Stable Flutter versions with Dart SDK compatibility. Every version links to its release details page.</p>
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
    <section>
      <div class="section-head">
        <div>
          <h2>Beta and prerelease history</h2>
          <p>Prerelease Flutter SDK versions remain crawlable, but stable releases are prioritized above.</p>
        </div>
        <p>${prerelease.length} prereleases</p>
      </div>
      ${prereleaseHistoryHtml}
    </section>
  </main>
  <footer>
    <div>
        <p><a href="${SITE_URL}/">FlutterReleases.com</a> &mdash; <a href="${SITE_URL}/flutter-versions/">Flutter versions</a> &mdash; <a href="${SITE_URL}/sitemap.xml">Sitemap</a></p>
    </div>
  </footer>
  <script>
    (function () {
      var button = document.querySelector('.theme-toggle');
      if (!button) return;
      button.addEventListener('click', function () {
        var dark = !document.documentElement.classList.contains('dark');
        document.documentElement.classList.toggle('dark', dark);
        try {
          localStorage.setItem('theme', dark ? 'dark' : 'light');
        } catch {}
      });
    })();
  </script>
</body>
</html>`;
}

function buildPageHtml(release, items = []) {
  const version = release.version;
  const channel = release.channel;
  const pageUrl = releaseUrl(release);
  const title = buildPageTitle(release);
  const desc = buildPageDescription(release);
  const chLabel = channelLabel(channel);
  const structuredData = buildStructuredData(release, pageUrl);
  const breadcrumbLd = buildBreadcrumbLd(release, pageUrl);
  const downloadsHtml = buildDownloadsHtml(release);
  const requiresHtml = buildRequiresHtml(release);
  const releaseNotesHtml = buildReleaseNotesHtml(release);
  const stableIntroHtml = buildStableIntroHtml(release);
  const stableInternalLinksHtml = buildStableInternalLinksHtml(release, items);
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
  <meta name="msvalidate.01" content="B2298FC723DFA6F8AC3DF5D162CC845C" />
  <meta name="yandex-verification" content="2b9226ee6947f0c0" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
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
</head>
<body>
  <!-- Static content for crawlers (no JS required) -->
  <nav>
    <a href="${SITE_URL}/">← All Flutter Releases</a>
    <a href="${SITE_URL}/flutter-versions/">Flutter versions</a>
  </nav>
  <main>
    <h1>Flutter ${htmlEscape(version)}</h1>
    ${stableIntroHtml}
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
    ${stableInternalLinksHtml}
    ${refUrl ? `<p><a href="${refUrl}" target="_blank" rel="noopener">View on GitHub →</a></p>` : ''}
    <p><a href="${SITE_URL}/flutter-versions/">Browse Flutter version history →</a></p>
    <p><a href="${SITE_URL}/">Browse all Flutter releases →</a></p>
  </main>
</body>
</html>`;
}

// Build sitemap with per-release URLs
function buildSitemapXml(items, generatedAt, blogPosts = []) {
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
    ['/tools/flutter-version-checker/', 'daily', '0.8'],
    ['/blog/', 'weekly', '0.7'],
    ['/faq/', 'monthly', '0.5'],
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

  for (const post of blogPosts) {
    if (!post.href || !post.href.startsWith('/blog/')) continue;
    lines.push('  <url>');
    lines.push(`    <loc>${baseUrl}${post.href}</loc>`);
    lines.push(`    <lastmod>${lm}</lastmod>`);
    lines.push('    <changefreq>monthly</changefreq>');
    lines.push('    <priority>0.6</priority>');
    lines.push('  </url>');
  }

  // Per-release pages — stable first (priority 0.8), beta 0.6, others 0.4
  const priorityMap = { stable: '0.8', beta: '0.6', dev: '0.4', main: '0.3' };
  const changeMap = { stable: 'monthly', beta: 'weekly', dev: 'weekly', main: 'daily' };

  for (const r of items.filter(r => r.version)) {
    const pri = priorityMap[r.channel] || '0.4';
    const freq = changeMap[r.channel] || 'monthly';
    const lastmod = r.released ? new Date(r.released).toISOString() : lm;
    lines.push('  <url>');
    lines.push(`    <loc>${releaseUrl(r)}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push(`    <changefreq>${freq}</changefreq>`);
    lines.push(`    <priority>${pri}</priority>`);
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  return lines.join('\n');
}

function buildRssXml(items, generatedAt) {
  const baseUrl = siteBaseUrl();
  const feedItems = items
    .filter(r => r.channel === 'stable' || r.channel === 'beta')
    .sort((a, b) => new Date(b.released || 0) - new Date(a.released || 0))
    .slice(0, 50);
  const pubDate = toRfc822(generatedAt || new Date());
  const lines = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<?xml-stylesheet type="text/xsl" href="/feed.xsl"?>');
  lines.push('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
  lines.push('<channel>');
  lines.push(`  <atom:link href="${xmlEscape(baseUrl + '/feed.xml')}" rel="self" type="application/rss+xml" />`);
  lines.push('  <title>FlutterReleases — Flutter &amp; Dart releases</title>');
  lines.push(`  <link>${xmlEscape(baseUrl + '/')}</link>`);
  lines.push('  <description>Browse the latest Flutter releases with matching Dart SDK versions, release notes, and direct download links — updated across stable, beta, and dev channels.</description>');
  lines.push('  <language>en-US</language>');
  lines.push(`  <pubDate>${xmlEscape(pubDate)}</pubDate>`);
  lines.push('  <ttl>60</ttl>');

  for (const release of feedItems) {
    const title = `Flutter ${release.version} (${release.channel})`;
    const pub = toRfc822(release.released || generatedAt || new Date());
    const descParts = [];
    if (release.dart_version) descParts.push(`<p><strong>Dart SDK:</strong> ${xmlEscape(release.dart_version)}</p>`);
    if (release.summary) descParts.push(`<p>${xmlEscape(release.summary)}</p>`);
    if (release.released) descParts.push(`<p>Released: ${xmlEscape(release.released)}</p>`);
    const link = releaseUrl(release);

    lines.push('  <item>');
    lines.push(`    <title>${xmlEscape(title)}</title>`);
    lines.push(`    <link>${xmlEscape(link)}</link>`);
    lines.push(`    <guid isPermaLink="true">${xmlEscape(link)}</guid>`);
    lines.push(`    <pubDate>${xmlEscape(pub)}</pubDate>`);
    lines.push(`    <description><![CDATA[${descParts.join('\n')}]]></description>`);
    lines.push('  </item>');
    lines.push('');
  }

  lines.push('</channel>');
  lines.push('</rss>');
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
      const dart = r.dart_version ? ` (Dart ${htmlEscape(r.dart_version)})` : '';
      const date_ = r.released ? ` — ${htmlEscape(r.released)}` : '';
      return `    <li><a href="${releaseUrl(r)}">${htmlEscape(r.version)}</a>${dart}${date_}</li>`;
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
  <meta name="msvalidate.01" content="B2298FC723DFA6F8AC3DF5D162CC845C" />
  <meta name="yandex-verification" content="2b9226ee6947f0c0" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
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
  const blogPosts = readBlogPosts();
  const blogArticles = readBlogArticles();
  const faqItems = readFaqItems();
  const changelogItems = readChangelogItems();
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
    console.log(`Would update sitemap.xml with ${items.filter(r => r.version).length + 9 + blogPosts.length} URLs`);
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
      const html = buildPageHtml(release, items);
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
  const sitemapXml = buildSitemapXml(items, generatedAt, blogPosts);

  const sitemapDist = path.join(DIST_DIR, 'sitemap.xml');
  const sitemapPublic = path.join(PUBLIC_DIR, 'sitemap.xml');
  if (fs.existsSync(DIST_DIR)) safeWrite(sitemapDist, sitemapXml);
  safeWrite(sitemapPublic, sitemapXml);

  const urlCount = items.filter(r => r.version).length + 9 + blogPosts.length;
  console.log(`Updated sitemap.xml with ${urlCount} URLs`);

  // Generate Flutter versions SEO page in dist only. It is a route page, so
  // Cloudflare serves this static HTML while the SPA handles JS navigation.
  const flutterVersionsHtml = buildFlutterVersionsPageHtml(items, generatedAt);
  if (fs.existsSync(DIST_DIR)) {
    safeWrite(path.join(DIST_DIR, 'flutter-versions', 'index.html'), flutterVersionsHtml);
  }
  console.log('Generated flutter-versions/index.html');

  const versionCheckerHtml = buildVersionCheckerPageHtml(items, generatedAt, buildAppAssetTags());
  if (fs.existsSync(DIST_DIR)) {
    safeWrite(path.join(DIST_DIR, 'tools', 'flutter-version-checker', 'index.html'), versionCheckerHtml);
  }
  console.log('Generated tools/flutter-version-checker/index.html');

  const blogHtml = buildBlogPageHtml(blogPosts, buildAppAssetTags());
  if (fs.existsSync(DIST_DIR)) {
    safeWrite(path.join(DIST_DIR, 'blog', 'index.html'), blogHtml);
  }
  console.log('Generated blog/index.html');

  const faqHtml = buildFaqPageHtml(faqItems, buildAppAssetTags());
  if (fs.existsSync(DIST_DIR)) {
    safeWrite(path.join(DIST_DIR, 'faq', 'index.html'), faqHtml);
  }
  console.log('Generated faq/index.html');

  const changelogHtml = buildChangelogPageHtml(changelogItems, buildAppAssetTags());
  if (fs.existsSync(DIST_DIR)) {
    safeWrite(path.join(DIST_DIR, 'changelog', 'index.html'), changelogHtml);
  }
  console.log('Generated changelog/index.html');

  let generatedBlogArticles = 0;
  for (const article of blogArticles) {
    const slug = String(article.meta.slug || '').replace(/^\/+|\/+$/g, '');
    if (!slug) continue;
    const articleHtml = buildBlogArticlePageHtml(article, generatedAt);
    if (fs.existsSync(DIST_DIR)) {
      safeWrite(path.join(DIST_DIR, slug, 'index.html'), articleHtml);
      generatedBlogArticles++;
    }
  }
  console.log(`Generated ${generatedBlogArticles} blog article pages`);

  // Generate llms-full.txt in both dist and public
  const llmsFullTxt = buildLlmsFullTxt(items, generatedAt);
  if (fs.existsSync(DIST_DIR)) safeWrite(path.join(DIST_DIR, 'llms-full.txt'), llmsFullTxt);
  safeWrite(path.join(PUBLIC_DIR, 'llms-full.txt'), llmsFullTxt);
  console.log(`Generated llms-full.txt (${items.filter(r => r.channel === 'stable').length} stable releases)`);

  // Generate RSS feed in both dist and public with canonical release URLs
  const rssXml = buildRssXml(items, generatedAt);
  if (fs.existsSync(DIST_DIR)) safeWrite(path.join(DIST_DIR, 'feed.xml'), rssXml);
  safeWrite(path.join(PUBLIC_DIR, 'feed.xml'), rssXml);
  console.log('Generated feed.xml with canonical release URLs');

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
