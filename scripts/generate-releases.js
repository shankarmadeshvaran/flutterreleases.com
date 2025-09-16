// scripts/generate-releases.js
// Safe generator for FlutterReleases
// Usage:
//   SITE_URL="https://flutterreleases.pages.dev" node scripts/generate-releases.js
//
// Behavior:
// - Generates: public/data/releases.generated.json, public/releases.json, public/feed.xml, public/sitemap.xml
// - Validates items; if validation fails, does NOT overwrite public/releases.json.
// - Keeps last-good backup at public/releases.last_good.json
// - Writes generation_status.json to show success/failure details.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- fetch setup (use global fetch if available, else node-fetch) ---
let _fetch = global.fetch;
if (!_fetch) {
  try {
    const mod = await import('node-fetch');
    _fetch = mod.default;
  } catch (e) {
    console.error('No global fetch and failed to import node-fetch. Install node-fetch or use Node 18+.');
    process.exit(1);
  }
}

// --- config ---
const OUT_DIR = path.join(process.cwd(), 'public');
const DATA_DIR = path.join(OUT_DIR, 'data');
const SOURCE_FILE = path.join(DATA_DIR, 'releases.json'); // optional manual overrides
const OUTPUT_CANONICAL = path.join(DATA_DIR, 'releases.generated.json');
const OUTPUT_API = path.join(OUT_DIR, 'releases.json');
const OUTPUT_RSS = path.join(OUT_DIR, 'feed.xml');
const OUTPUT_SITEMAP = path.join(OUT_DIR, 'sitemap.xml');
const STATUS_FILE = path.join(OUT_DIR, 'generation_status.json');
const LAST_GOOD = path.join(OUT_DIR, 'releases.last_good.json');

const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '') || 'https://flutterreleases.pages.dev';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// channels & manifest templates (best-effort)
const CHANNELS = ['stable', 'beta', 'dev', 'main'];
const CHANNEL_MANIFEST_URLS = [
  (ch) => `https://storage.googleapis.com/flutter_infra_release/releases/releases_${ch}.json`
];

// --- small helpers ---
function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function atomicWrite(filePath, content) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath); // atomic replace on POSIX
}

function nowIso() {
  return new Date().toISOString();
}

// Minimal validation: ensure items array present and non-empty, first item has a version.
function validateItems(items) {
  if (!Array.isArray(items)) return { ok: false, reason: 'items not an array' };
  if (items.length === 0) return { ok: false, reason: 'items length is 0' };
  if (!items[0] || !items[0].flutter_version) return { ok: false, reason: 'first item missing flutter_version' };
  return { ok: true, reason: 'ok', count: items.length };
}

// --- HTTP utilities ---
async function fetchJsonNoAuth(url) {
  try {
    const res = await _fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function fetchJsonRest(url) {
  try {
    const headers = {};
    if (GITHUB_TOKEN) headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    headers['Accept'] = 'application/vnd.github.v3+json';
    const res = await _fetch(url, { headers });
    if (!res.ok) {
      console.warn(`fetchJsonRest: ${res.status} ${url}`);
      return null;
    }
    const rateRemaining = res.headers?.get?.('x-ratelimit-remaining');
    if (rateRemaining) console.debug(`GitHub REST rate remaining: ${rateRemaining}`);
    return await res.json();
  } catch (e) {
    console.warn('fetchJsonRest error', e.message || e);
    return null;
  }
}

// Try channel manifests (best-effort; may not exist)
async function fetchChannelManifests() {
  const manifests = {};
  for (const ch of CHANNELS) {
    for (const tpl of CHANNEL_MANIFEST_URLS) {
      const url = tpl(ch);
      process.stdout.write(`Trying manifest ${url} ... `);
      const j = await fetchJsonNoAuth(url);
      if (j) {
        console.log('OK');
        manifests[ch] = { url, json: j };
        break;
      } else {
        console.log('no');
      }
    }
    if (!manifests[ch]) console.warn(`No manifest found for channel ${ch}`);
  }
  return manifests;
}

// Primary GitHub releases fetch
async function fetchGithubReleases() {
  const url = 'https://api.github.com/repos/flutter/flutter/releases?per_page=200';
  const data = await fetchJsonRest(url);
  if (!data) {
    console.warn('Failed to fetch GitHub releases');
    return [];
  }
  return Array.isArray(data) ? data : [];
}

// --- Normalizers & fallbacks ---
// Build items from manifests (if available)
function normalizeFromManifests(manifests) {
  const itemsByVersion = new Map();
  for (const [channel, info] of Object.entries(manifests)) {
    if (!info || !info.json || !Array.isArray(info.json.releases)) continue;
    for (const r of info.json.releases) {
      const version = r.version || r.flutter_version || r.name || (r.archive && r.archive.version);
      if (!version) continue;
      const key = version;
      const cur = itemsByVersion.get(key) || {
        flutter_version: version,
        channel,
        released: r.release_date || r.date || r.published || null,
        dart_version: r.dart_sdk_version || r.dart_version || null,
        engine_revision: r.engine || r.engine_revision || null,
        requires: {},
        platforms: {},
        notes_url: r.release_notes || null,
        ref_url: null,
        summary: r.summary || r.notes || null,
        verified: false
      };
      if (r.archive && typeof r.archive === 'object') {
        for (const [k, v] of Object.entries(r.archive)) {
          if (!v) continue;
          cur.platforms[k] = typeof v === 'string' ? v : v.url || v.path || JSON.stringify(v);
        }
      }
      if (r.files && Array.isArray(r.files)) {
        for (const f of r.files) {
          const name = f.name || f.archive || f.path || '';
          const url = f.url || f.archive_url || f.download_url || f.path;
          if (!url) continue;
          if (/mac/i.test(name) && /arm/i.test(name)) cur.platforms.macos_arm64 = url;
          else if (/mac/i.test(name)) cur.platforms.macos_x64 = url;
          else if (/win/i.test(name) || /\.exe$/.test(url)) cur.platforms.windows_x64 = url;
          else if (/linux/i.test(name) || /\.tar\.gz$/.test(url)) cur.platforms.linux_x64 = url;
        }
      }
      itemsByVersion.set(key, cur);
    }
  }
  return Array.from(itemsByVersion.values());
}

// Fallback: map GitHub releases to items
function inferChannelFromTagOrName(tagOrName) {
  if (!tagOrName) return 'stable';
  const s = String(tagOrName).toLowerCase();
  if (s.includes('beta') || s.includes('-beta')) return 'beta';
  if (s.includes('dev') || s.includes('main') || s.includes('-dev') || s.includes('.pre')) return 'dev';
  if (s.includes('rc')) return 'rc';
  return 'stable';
}
function extractDartVersionFromText(text) {
  if (!text) return null;
  const m = text.match(/\bDart(?: SDK)?\s*[:\-]?\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i);
  if (m) return m[1];
  return null;
}
function extractEngineRevisionFromText(text) {
  if (!text) return null;
  const m = text.match(/engine(?:\srevision)?[: ]+([0-9a-f]{7,40})/i) || text.match(/engine[: ]+([0-9a-f]{7,40})/i);
  if (m) return m[1];
  return null;
}
function mapAssetsToPlatforms(assets = []) {
  const platforms = {};
  for (const a of assets || []) {
    if (!a || !a.name || !a.browser_download_url) continue;
    const name = a.name.toLowerCase();
    const url = a.browser_download_url;
    if ((name.includes('macos') || name.includes('darwin')) && name.includes('arm')) platforms.macos_arm64 = url;
    else if (name.includes('macos') || name.includes('darwin')) platforms.macos_x64 = url;
    else if (name.includes('windows') || name.endsWith('.exe') || name.includes('.msi')) platforms.windows_x64 = url;
    else if (name.includes('linux') || name.endsWith('.tar.gz') || name.includes('.deb') || name.includes('.rpm')) platforms.linux_x64 = url;
    else {
      if (name.includes('arm64')) platforms.macos_arm64 = platforms.macos_arm64 || url;
      if (name.includes('x64') || name.includes('x86_64')) platforms.linux_x64 = platforms.linux_x64 || url;
    }
  }
  return platforms;
}
function githubReleasesToItems(ghReleases) {
  if (!Array.isArray(ghReleases)) return [];
  const out = [];
  for (const r of ghReleases) {
    const rawTag = r.tag_name || r.name || '';
    const version = String(rawTag).replace(/^v/, '').trim();
    if (!version) continue;
    const channel = inferChannelFromTagOrName(rawTag || r.name);
    let summary = null;
    if (r.body) {
      const first = r.body.split('\n').find(l => l.trim().length > 0);
      summary = first ? first.trim().slice(0, 800) : null;
    }
    const item = {
      flutter_version: version,
      channel,
      released: r.published_at ? new Date(r.published_at).toISOString().split('T')[0] : null,
      dart_version: extractDartVersionFromText(r.body) || null,
      engine_revision: extractEngineRevisionFromText(r.body) || null,
      requires: {},
      platforms: mapAssetsToPlatforms(r.assets),
      notes_url: null,
      ref_url: r.html_url || null,
      summary,
      verified: false
    };
    item.verified = Object.values(item.platforms).some(u => typeof u === 'string' && u.includes('storage.googleapis.com'));
    out.push(item);
  }
  return out;
}

// Merge GH metadata into manifest-derived items (when manifests exist)
function mergeWithGithub(items, ghReleases) {
  const ghByTag = new Map();
  for (const r of ghReleases) {
    const tag = r.tag_name || r.name;
    if (!tag) continue;
    ghByTag.set(tag.replace(/^v/, ''), r);
    ghByTag.set(tag, r);
  }
  for (const it of items) {
    const candidates = [it.flutter_version, 'v' + it.flutter_version];
    let gh = null;
    for (const t of candidates) {
      if (ghByTag.has(t)) { gh = ghByTag.get(t); break; }
    }
    if (!gh) {
      for (const [tag, r] of ghByTag.entries()) {
        if (tag.includes(it.flutter_version) || (r.name && r.name.includes(it.flutter_version))) { gh = r; break; }
      }
    }
    if (gh) {
      it.ref_url = it.ref_url || gh.html_url;
      it.summary = it.summary || (gh.body && gh.body.split('\n').find(l => l.trim().length > 0));
      it.released = it.released || (gh.published_at ? new Date(gh.published_at).toISOString().split('T')[0] : null);
      it.engine_revision = it.engine_revision || extractEngineRevisionFromText(gh.body);
      const extraPlatforms = mapAssetsToPlatforms(gh.assets);
      it.platforms = { ...(it.platforms || {}), ...extraPlatforms };
      it.verified = it.verified || Object.values(it.platforms).some(u => typeof u === 'string' && u.includes('storage.googleapis.com'));
    }
    if (it.released) {
      try { it.released = new Date(it.released).toISOString().split('T')[0]; } catch(e) {}
    }
  }
  return items;
}

// RSS & sitemap (escape all dynamic content)
function generateRss(items) {
  const lastBuild = nowIso();
  const rssItems = items.map(it => {
    const title = `Flutter ${it.flutter_version} (${it.channel || 'stable'})`;
    const link = it.ref_url || it.notes_url || `${SITE_URL}/`;
    const pubDate = it.released ? new Date(it.released).toUTCString() : new Date().toUTCString();
    const description = it.summary || `Release ${it.flutter_version}`;
    return `
  <item>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(link)}</link>
    <guid isPermaLink="false">${escapeXml(link)}</guid>
    <pubDate>${escapeXml(pubDate)}</pubDate>
    <description>${escapeXml(description)}</description>
  </item>`;
  }).join('\n');

  const channelTitle = 'FlutterReleases — Unofficial Flutter & Dart releases';
  const channelDesc = 'Latest Flutter & Dart releases (stable, beta, dev)';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(channelTitle)}</title>
  <link>${escapeXml(SITE_URL)}</link>
  <description>${escapeXml(channelDesc)}</description>
  <language>en-US</language>
  <lastBuildDate>${escapeXml(lastBuild)}</lastBuildDate>
  ${rssItems}
</channel>
</rss>`;
}

function generateSitemap(items) {
  const urls = [];
  urls.push({
    loc: `${SITE_URL}/`,
    lastmod: nowIso(),
    changefreq: 'daily',
    priority: '0.8'
  });
  for (const it of items) {
    const loc = `${SITE_URL}/releases/${encodeURIComponent(it.flutter_version)}`;
    urls.push({ loc, lastmod: it.released || nowIso(), changefreq: 'monthly', priority: '0.6' });
  }
  const sitemapItems = urls.map(u => `
  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${escapeXml(u.lastmod)}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapItems}
</urlset>`;
}

function normalizeApi(items) {
  return {
    meta: { generated_at: nowIso(), count: items.length },
    items: items.map(it => ({
      flutter_version: it.flutter_version,
      channel: it.channel || 'stable',
      released: it.released || null,
      dart_version: it.dart_version || null,
      engine_revision: it.engine_revision || null,
      requires: it.requires || {},
      platforms: it.platforms || {},
      notes_url: it.notes_url || null,
      ref_url: it.ref_url || null,
      summary: it.summary || null,
      verified: !!it.verified
    }))
  };
}

// --- main workflow ---
async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // load manual source if present (manual overrides)
  let manual = null;
  if (fs.existsSync(SOURCE_FILE)) {
    try { manual = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8')); console.log('Loaded manual source', SOURCE_FILE); }
    catch(e) { console.warn('Failed parsing manual source', e.message); }
  }

  // try manifests (best-effort)
  const manifests = await fetchChannelManifests();

  // build items
  let items = normalizeFromManifests(manifests);

  // fetch GitHub releases
  const gh = await fetchGithubReleases();

  // fallback or merge
  if ((!items || items.length === 0) && Array.isArray(gh) && gh.length) {
    console.log('No manifest items found — creating items directly from GitHub releases');
    items = githubReleasesToItems(gh);
  } else if (Array.isArray(gh) && gh.length) {
    items = mergeWithGithub(items, gh);
  }

  // apply manual overrides (manual is authoritative per-version)
  if (manual && Array.isArray(manual.items)) {
    const overrides = new Map(manual.items.map(it => [it.flutter_version, it]));
    items = items.map(it => overrides.has(it.flutter_version) ? { ...it, ...overrides.get(it.flutter_version) } : it);
  }

  // sort newest first
  items.sort((a,b) => {
    const da = a.released ? new Date(a.released).getTime() : 0;
    const db = b.released ? new Date(b.released).getTime() : 0;
    return db - da;
  });

  // validate
  const check = validateItems(items);
  if (!check.ok) {
    console.error('Generation validation failed:', check.reason);

    // write a failed canonical file for debugging
    atomicWrite(path.join(DATA_DIR, 'releases.failed.json'), JSON.stringify({ generated_at: nowIso(), items }, null, 2));

    // update status file (served publicly)
    atomicWrite(STATUS_FILE, JSON.stringify({ status: 'failed', reason: check.reason, generated_at: nowIso(), count: items.length }, null, 2));

    console.log('Aborting publish; public files left unchanged.');
    return;
  }

  // write canonical and public outputs atomically (rotate last-good)
  try {
    // write canonical generated JSON
    atomicWrite(OUTPUT_CANONICAL, JSON.stringify({ generated_at: nowIso(), items }, null, 2));
    // rotate last-good
    if (fs.existsSync(OUTPUT_API)) fs.copyFileSync(OUTPUT_API, LAST_GOOD);
    // write public API + feeds
    atomicWrite(OUTPUT_API, JSON.stringify(normalizeApi(items), null, 2));
    atomicWrite(OUTPUT_RSS, generateRss(items));
    atomicWrite(OUTPUT_SITEMAP, generateSitemap(items));
    // write success status
    atomicWrite(STATUS_FILE, JSON.stringify({ status: 'ok', generated_at: nowIso(), count: items.length }, null, 2));
    console.log('Wrote outputs successfully. Items:', items.length);
  } catch (e) {
    console.error('Failed to write outputs atomically:', e.message || e);
    // try to write failure debug file
    atomicWrite(path.join(DATA_DIR, 'releases.failed.json'), JSON.stringify({ generated_at: nowIso(), items }, null, 2));
    atomicWrite(STATUS_FILE, JSON.stringify({ status: 'failed', reason: 'write-error', error: String(e), generated_at: nowIso() }, null, 2));
  }
}

main().catch(err => {
  console.error('Fatal error', err);
  process.exit(1);
});