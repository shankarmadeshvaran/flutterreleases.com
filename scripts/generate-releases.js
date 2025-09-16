// scripts/generate-releases.js
// Generates public/releases.json, public/feed.xml, public/sitemap.xml
// and public/data/releases.generated.json
//
// Usage:
// SITE_URL="https://flutterreleases.pages.dev" node scripts/generate-releases.js
//
// Note: In GitHub Actions, use the built-in GITHUB_TOKEN: it's available as process.env.GITHUB_TOKEN.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- fetch setup: use global fetch if available, else dynamic import node-fetch ----
let _fetch = global.fetch;
if (!_fetch) {
  try {
    const mod = await import('node-fetch');
    _fetch = mod.default;
  } catch (e) {
    console.error('No global fetch available and failed to import node-fetch. Install node-fetch or use Node 18+.');
    process.exit(1);
  }
}

// ---- config ----
const OUT_DIR = path.join(process.cwd(), 'public');
const DATA_DIR = path.join(OUT_DIR, 'data');
const SOURCE_FILE = path.join(DATA_DIR, 'releases.json'); // optional manual override file
const OUTPUT_CANONICAL = path.join(DATA_DIR, 'releases.generated.json');
const OUTPUT_API = path.join(OUT_DIR, 'releases.json');
const OUTPUT_RSS = path.join(OUT_DIR, 'feed.xml');
const OUTPUT_SITEMAP = path.join(OUT_DIR, 'sitemap.xml');

const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '') || 'https://flutterreleases.pages.dev';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

// channels to try
const CHANNELS = ['stable', 'beta', 'dev', 'main'];

// manifest URL templates to try (may change over time)
const CHANNEL_MANIFEST_URLS = [
  (ch) => `https://storage.googleapis.com/flutter_infra_release/releases/releases_${ch}.json`,
  // add more templates here if you discover other manifests
];

// ---- helpers ----
function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function fetchJsonRest(url, opts = {}) {
  try {
    const headers = Object.assign({}, opts.headers || {});
    if (GITHUB_TOKEN) headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    headers['Accept'] = headers['Accept'] || 'application/vnd.github.v3+json';
    const res = await _fetch(url, { ...opts, headers });
    const rateLimit = res.headers?.get?.('x-ratelimit-remaining');
    if (rateLimit) {
      console.debug(`GitHub REST rate remaining: ${rateLimit}`);
    }
    if (!res.ok) {
      // return null to indicate fallback possible
      console.warn(`fetchJsonRest: ${res.status} ${res.statusText} - ${url}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn('fetchJsonRest error', err.message || err);
    return null;
  }
}

async function fetchGraphql(query, variables = {}) {
  try {
    const url = 'https://api.github.com/graphql';
    const headers = { 'Content-Type': 'application/json' };
    if (GITHUB_TOKEN) headers['Authorization'] = `bearer ${GITHUB_TOKEN}`;
    const res = await _fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      console.warn('fetchGraphql: non-ok', res.status, await res.text());
      return null;
    }
    const json = await res.json();
    if (json.errors) console.warn('GraphQL errors:', json.errors);
    return json.data || null;
  } catch (err) {
    console.warn('fetchGraphql error', err.message || err);
    return null;
  }
}

// try to fetch a URL and parse JSON (no auth)
async function fetchJsonNoAuth(url) {
  try {
    const res = await _fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

// ---- fetchers ----
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
    if (!manifests[ch]) {
      console.warn(`No manifest found for channel ${ch}`);
    }
  }
  return manifests;
}

async function fetchGithubReleases() {
  // REST fetch releases (per_page up to 200)
  const url = 'https://api.github.com/repos/flutter/flutter/releases?per_page=200';
  const data = await fetchJsonRest(url);
  if (!data) {
    // fallback: try GraphQL minimal query to fetch tags (rare)
    console.warn('Falling back: GitHub releases REST API failed or unauthenticated.');
    return [];
  }
  return Array.isArray(data) ? data : [];
}

// ---- normalization & merge ----
function normalizeFromManifests(manifests) {
  const itemsByVersion = new Map();

  for (const [channel, info] of Object.entries(manifests)) {
    if (!info || !info.json) continue;
    const json = info.json;
    // typical manifest shape: { releases: [ ... ] }
    if (Array.isArray(json.releases)) {
      for (const r of json.releases) {
        const version = r.version || r.flutter_version || r.name || (r.archive && r.archive.version);
        if (!version) continue;
        const key = version;
        const current = itemsByVersion.get(key) || {
          flutter_version: version,
          channel,
          released: r.release_date || r.date || r.published || null,
          dart_version: r.dart_sdk_version || r.dart_version || (r.dart_sdk && r.dart_sdk.version) || null,
          engine_revision: r.engine || r.engine_revision || null,
          devtools_version: r.devtools_version || null,
          requires: {},
          platforms: {},
          notes_url: r.release_notes || null,
          ref_url: null,
          summary: r.summary || r.notes || null,
          verified: false
        };

        // archives or files
        if (r.archive && typeof r.archive === 'object') {
          for (const [k, v] of Object.entries(r.archive)) {
            if (!v) continue;
            current.platforms[k] = typeof v === 'string' ? v : v.url || v.path || JSON.stringify(v);
          }
        }
        if (r.files && Array.isArray(r.files)) {
          for (const f of r.files) {
            if (!f) continue;
            const name = f.name || f.archive || f.path || '';
            const url = f.url || f.archive_url || f.download_url || f.path;
            if (!url) continue;
            if (/mac/i.test(name) && /arm/i.test(name)) current.platforms.macos_arm64 = url;
            else if (/mac/i.test(name)) current.platforms.macos_x64 = url;
            else if (/win/i.test(name) || /\.exe$/.test(url)) current.platforms.windows_x64 = url;
            else if (/linux/i.test(name) || /\.tar\.gz$/.test(url)) current.platforms.linux_x64 = url;
          }
        }

        itemsByVersion.set(key, current);
      }
    } else {
      // unknown manifest shape - ignore
    }
  }

  return Array.from(itemsByVersion.values());
}

function mergeWithGithub(items, ghReleases) {
  const ghByTag = new Map();
  for (const r of ghReleases) {
    const tag = r.tag_name || r.name;
    if (!tag) continue;
    ghByTag.set(tag, r);
  }

  for (const it of items) {
    const tagsToTry = [it.flutter_version, 'v' + it.flutter_version];
    let gh = null;
    for (const t of tagsToTry) {
      if (ghByTag.has(t)) { gh = ghByTag.get(t); break; }
    }
    if (!gh) {
      for (const [tag, r] of ghByTag.entries()) {
        if (tag.includes(it.flutter_version) || (r.name && r.name.includes(it.flutter_version))) {
          gh = r; break;
        }
      }
    }
    if (gh) {
      it.ref_url = gh.html_url || it.ref_url;
      if (!it.summary && gh.body) {
        const first = gh.body.split('\n').find(l => l.trim().length > 0);
        it.summary = (first && first.length < 400) ? first : (gh.body.slice(0, 400));
      }
      if (!it.released && gh.published_at) it.released = gh.published_at;
      if (!it.engine_revision && gh.body) {
        const m = gh.body.match(/engine revision[: ]*([0-9a-f]{7,40})/i) || gh.body.match(/engine[: ]*([0-9a-f]{7,40})/i);
        if (m) it.engine_revision = m[1];
      }
      // if GitHub assets include downloadable SDKs, map them (rare)
      if (Array.isArray(gh.assets) && gh.assets.length) {
        for (const a of gh.assets) {
          if (!a || !a.name || !a.browser_download_url) continue;
          const name = a.name.toLowerCase();
          if (name.includes('macos') && name.includes('arm')) it.platforms.macos_arm64 = a.browser_download_url;
          else if (name.includes('macos')) it.platforms.macos_x64 = a.browser_download_url;
          else if (name.includes('windows')) it.platforms.windows_x64 = a.browser_download_url;
          else if (name.includes('linux')) it.platforms.linux_x64 = a.browser_download_url;
        }
      }
    }

    // verification: does any platform link point to official storage.googleapis.com ?
    it.verified = Object.values(it.platforms).some(u => typeof u === 'string' && u.includes('storage.googleapis.com'));
    if (it.released) {
      try { it.released = new Date(it.released).toISOString().split('T')[0]; } catch(e) {}
    }
  }

  return items;
}

// ---- generate outputs ----
function generateRss(items) {
  const lastBuild = new Date().toISOString();
  const rssItems = items.map(it => {
    const title = `Flutter ${it.flutter_version} (${it.channel || 'stable'})`;
    const link = it.ref_url || it.notes_url || `${SITE_URL}/`;
    const pubDate = it.released ? new Date(it.released).toUTCString() : new Date().toUTCString();
    const description = escapeXml(it.summary || `Release ${it.flutter_version}`);
    return `
  <item>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(link)}</link>
    <guid isPermaLink="false">${escapeXml(link)}</guid>
    <pubDate>${pubDate}</pubDate>
    <description>${description}</description>
  </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>FlutterReleases — Unofficial Flutter &amp; Dart releases</title>
  <link>${escapeXml(SITE_URL)}</link>
  <description>Latest Flutter & Dart releases (stable, beta, dev)</description>
  <language>en-US</language>
  <lastBuildDate>${lastBuild}</lastBuildDate>
  ${rssItems}
</channel>
</rss>`;
}

function generateSitemap(items) {
  const urls = [];
  urls.push({
    loc: `${SITE_URL}/`,
    lastmod: new Date().toISOString(),
    changefreq: 'daily',
    priority: '0.8'
  });
  for (const it of items) {
    const loc = `${SITE_URL}/releases/${encodeURIComponent(it.flutter_version)}`;
    urls.push({ loc, lastmod: it.released || new Date().toISOString(), changefreq: 'monthly', priority: '0.6' });
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
    meta: { generated_at: new Date().toISOString(), count: items.length },
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

// ---- main ----
async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // optional manual source
  let manual = null;
  if (fs.existsSync(SOURCE_FILE)) {
    try {
      manual = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
      console.log('Loaded manual source', SOURCE_FILE);
    } catch (e) {
      console.warn('Failed parsing manual source', e.message);
    }
  }

  // fetch manifests
  const manifests = await fetchChannelManifests();

  // build items from manifests
  let items = normalizeFromManifests(manifests);

  // merge github metadata
  const gh = await fetchGithubReleases();
  if (Array.isArray(gh) && gh.length) {
    items = mergeWithGithub(items, gh);
  }

  // merge manual overrides
  if (manual && Array.isArray(manual.items)) {
    const m = new Map(manual.items.map(it => [it.flutter_version, it]));
    items = items.map(it => (m.has(it.flutter_version) ? { ...it, ...m.get(it.flutter_version) } : it));
  }

  // sort by released desc
  items.sort((a,b) => {
    const da = a.released ? new Date(a.released).getTime() : 0;
    const db = b.released ? new Date(b.released).getTime() : 0;
    return db - da;
  });

  // write canonical
  fs.writeFileSync(OUTPUT_CANONICAL, JSON.stringify({ generated_at: new Date().toISOString(), items }, null, 2), 'utf8');
  console.log('Wrote', OUTPUT_CANONICAL);

  // normalized API
  const api = normalizeApi(items);
  fs.writeFileSync(OUTPUT_API, JSON.stringify(api, null, 2), 'utf8');
  console.log('Wrote', OUTPUT_API);

  // RSS
  const rss = generateRss(items);
  fs.writeFileSync(OUTPUT_RSS, rss, 'utf8');
  console.log('Wrote', OUTPUT_RSS);

  // sitemap
  const sitemap = generateSitemap(items);
  fs.writeFileSync(OUTPUT_SITEMAP, sitemap, 'utf8');
  console.log('Wrote', OUTPUT_SITEMAP);

  console.log('Done. Items:', items.length);
}

main().catch(err => {
  console.error('Fatal error', err);
  process.exit(1);
});