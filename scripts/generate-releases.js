// scripts/generate-releases.js
// Drop-in generator for FlutterReleases
// Goals:
// - Time-agnostic, manifest-first enrichment for stable/beta/main/dev
// - Robust fallbacks to GitHub releases
// - Atomic writes, last-good snapshot, generation_status.json
// - Configurable via env and CLI flags: GITHUB_TOKEN, SITE_URL, --dry-run, --validate-only

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OUT_DIR = path.join(process.cwd(), 'public');
const DATA_DIR = path.join(OUT_DIR, 'data');
const GENERATED_PATH = path.join(OUT_DIR, 'releases.generated.json');
const FINAL_PATH = path.join(OUT_DIR, 'releases.json');
const LAST_GOOD = path.join(OUT_DIR, 'releases.last_good.json');
const STATUS_PATH = path.join(OUT_DIR, 'generation_status.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
const SITE_URL = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://flutterreleases.com';
const CHANNELS = ['stable','beta','dev','main'];

// CLI flags
const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const VALIDATE_ONLY = ARGS.includes('--validate-only');

// helpers
async function fetchJson(url, timeout = 10000) {
  const h = {};
  if (GITHUB_TOKEN && url.startsWith('https://api.github.com')) h['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { headers: h, signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    clearTimeout(t);
    return null;
  }
}

async function headOk(url, timeout = 5000) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(t);
    return res.ok;
  } catch (e) {
    return false;
  }
}

function safeWriteAtomic(dst, data) {
  const tmp = dst + '.tmp';
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, dst);
}

function nowIso(){ return new Date().toISOString(); }

function normalizePlatformKey(k){
  return k.replace(/[-\s]/g,'_').toLowerCase();
}

function pushNote(notes, type, title, url){
  if (!url) return;
  if (notes.find(n=>n.url===url)) return;
  notes.push({type,title,url});
}

function docsAnchorFromVersion(version){
  if(!version) return '';
  return version.replace(/\./g,'-').replace(/\s+/g,'-').toLowerCase();
}

// find manifest entry helper
function findManifestEntry(manifest, version){
  if(!manifest) return null;
  const list = Array.isArray(manifest) ? manifest : (manifest.releases || manifest);
  if(!Array.isArray(list)) return null;
  let found = list.find(r => (r.version === version) || (r.name === version));
  if(found) return found;
  // fuzzy: startsWith base version
  const base = version.split('-')[0];
  found = list.find(r => r.version && r.version.startsWith(base));
  return found || null;
}

function buildPlatformUrlsFromManifest(entry, channel){
  const out = {};
  if(!entry) return out;
  const arch = entry.archive || entry.artifacts || entry.files || {};
  for(const [k,v] of Object.entries(arch || {})){
    const filename = typeof v === 'string' ? v : (v.archive || v.file || '');
    if(!filename) continue;
    const url = `https://storage.googleapis.com/flutter_infra_release/releases/${channel}/${filename}`;
    out[normalizePlatformKey(k)] = url;
  }
  return out;
}

async function fetchGithubReleaseByTag(tag){
  const api = `https://api.github.com/repos/flutter/flutter/releases/tags/${encodeURIComponent(tag)}`;
  return await fetchJson(api, 10000);
}

function buildNotesArray(item, manifestEntry, githubRelease){
  const notes = [];
  if(manifestEntry){
    if(manifestEntry.announcement_url) pushNote(notes,'announcement','Announcement',manifestEntry.announcement_url);
    if(manifestEntry.release_notes_url) pushNote(notes,'release-notes','Release notes & changelog',manifestEntry.release_notes_url);
    if(manifestEntry.breaking_changes_url) pushNote(notes,'breaking','Breaking changes & migrations',manifestEntry.breaking_changes_url);
    if(manifestEntry.release_notes) pushNote(notes,'release-notes','Release notes',manifestEntry.release_notes);
  }
  if(githubRelease && githubRelease.html_url) pushNote(notes,'release-notes','Release notes & changelog',githubRelease.html_url);
  if(item.flutter_version){
    const a = docsAnchorFromVersion(item.flutter_version);
    pushNote(notes,'release-notes',`Release notes ${item.flutter_version}`,`https://docs.flutter.dev/release/release-notes#${a}`);
    pushNote(notes,'breaking',`Breaking changes ${item.flutter_version}`,`https://docs.flutter.dev/release/migration-${a}`);
  }
  if(item.notes_url) pushNote(notes,'release-notes','Release notes', item.notes_url);
  // order
  const order = {announcement:0,'release-notes':1,breaking:2};
  notes.sort((a,b)=> (order[a.type]||10) - (order[b.type]||10));
  return notes;
}

function normalizeItemBase(version, channel){
  return {
    flutter_version: version,
    channel: channel || 'stable',
    released: null,
    dart_version: null,
    engine_revision: null,
    commit_ref: null,
    requires: {},
    platforms: {},
    notes_url: null,
    notes: [],
    ref_url: null,
    summary: null,
    verified: false
  };
}

async function enrichItem(item, manifestEntry, channel){
  // manifest preferred
  let githubRelease = null;
  if(manifestEntry){
    if(manifestEntry.dart_sdk_version) item.dart_version = manifestEntry.dart_sdk_version;
    if(manifestEntry.dart_version) item.dart_version = item.dart_version || manifestEntry.dart_version;
    if(manifestEntry.engine) item.engine_revision = manifestEntry.engine;
    if(manifestEntry.engine_revision) item.engine_revision = item.engine_revision || manifestEntry.engine_revision;
    if(manifestEntry.hash) item.commit_ref = manifestEntry.hash || item.commit_ref;
    if(manifestEntry.release_date) item.released = item.released || manifestEntry.release_date.split('T')[0];
    // platform urls
    const p = buildPlatformUrlsFromManifest(manifestEntry, channel);
    item.platforms = Object.assign({}, item.platforms || {}, p);
    if(manifestEntry.release_notes_url) item.notes_url = item.notes_url || manifestEntry.release_notes_url;
  }

  // GitHub fallback for notes and assets
  try{
    const tag = (item.ref_url && item.ref_url.match(/\/releases\/tag\/(.+)$/))?.[1] || item.flutter_version;
    githubRelease = await fetchGithubReleaseByTag(tag);
    if(githubRelease && githubRelease.html_url){
      item.notes_url = item.notes_url || githubRelease.html_url;
      if(!item.summary && githubRelease.body) item.summary = (githubRelease.body||'').split('\n')[0];
      if(!item.released && githubRelease.published_at) item.released = githubRelease.published_at.split('T')[0];
      // assets -> platforms
      for(const a of (githubRelease.assets || [])){
        const name = (a.name||'').toLowerCase();
        const url = a.browser_download_url || a.url;
        if(!url) continue;
        if(name.includes('macos') && name.includes('arm')) item.platforms.macos_arm64 = item.platforms.macos_arm64 || url;
        else if(name.includes('macos') && (name.includes('x64')||name.includes('intel'))) item.platforms.macos_x64 = item.platforms.macos_x64 || url;
        else if(name.includes('windows')) item.platforms.windows_x64 = item.platforms.windows_x64 || url;
        else if(name.includes('linux')) item.platforms.linux_x64 = item.platforms.linux_x64 || url;
        else item.platforms[normalizePlatformKey(name)] = item.platforms[normalizePlatformKey(name)] || url;
      }
    }
  }catch(e){ /* ignore github transient errors */ }

  // build notes array
  item.notes = buildNotesArray(item, manifestEntry, githubRelease);
  if(!item.notes_url){
    const primary = item.notes.find(n=>n.type==='release-notes') || item.notes[0];
    if(primary) item.notes_url = primary.url;
  }

  // verify: manifest metadata or HEAD-confirmed platforms or github assets
  const platformUrls = Object.values(item.platforms || {});
  for(const u of platformUrls.slice(0,5)){
    if(await headOk(u)) { item.verified = true; break; }
  }
  if(!item.verified){
    if(item.dart_version || item.engine_revision || item.commit_ref) item.verified = true;
    else if (githubRelease && (githubRelease.assets || []).length) item.verified = true;
  }

  return item;
}

async function fetchManifests(){
  const map = {};
  for(const c of CHANNELS){
    const url = `https://storage.googleapis.com/flutter_infra_release/releases/releases_${c}.json`;
    const data = await fetchJson(url, 10000);
    map[c] = data;
  }
  return map;
}

async function fetchGithubReleasesPages(pages = 2){
  // simple paginated fetch limited to `pages` pages (30 per page default)
  const all = [];
  for(let p=1;p<=pages;p++){
    const url = `https://api.github.com/repos/flutter/flutter/releases?page=${p}&per_page=30`;
    const res = await fetchJson(url, 10000);
    if(!res || !Array.isArray(res) || res.length===0) break;
    all.push(...res);
  }
  return all;
}

function mergeCandidate(map, key, candidate){
  // map: key->item, avoid duplicates; keep existing data and merge
  if(!map[key]){ map[key] = candidate; return; }
  const existing = map[key];
  existing.notes = Array.isArray(existing.notes)? existing.notes : [];
  existing.notes.push(...(candidate.notes||[]));
  existing.platforms = Object.assign({}, existing.platforms||{}, candidate.platforms||{});
  existing.summary = existing.summary || candidate.summary;
  existing.notes_url = existing.notes_url || candidate.notes_url;
  existing.ref_url = existing.ref_url || candidate.ref_url;
  existing.dart_version = existing.dart_version || candidate.dart_version;
  existing.engine_revision = existing.engine_revision || candidate.engine_revision;
  existing.commit_ref = existing.commit_ref || candidate.commit_ref;
  existing.released = existing.released || candidate.released;
  existing.verified = existing.verified || candidate.verified;
}

async function run(){
  const status = { status: 'ok', generated_at: nowIso(), counts: {}, channels: {}, errors: [] };
  try{
    // ensure directories
    if(!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive:true });
    if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive:true });

    // fetch manifests
    const manifests = await fetchManifests();

    // initial candidates: from manifests
    const candidatesMap = {}; // key -> item

    for(const c of CHANNELS){
      const m = manifests[c];
      if(!m) { status.channels[c] = { found:0 }; continue; }
      const list = Array.isArray(m) ? m : (m.releases || m);
      if(!Array.isArray(list)) { status.channels[c] = { found:0 }; continue; }
      let found = 0;
      for(const entry of list){
        const version = entry.version || entry.name || null;
        if(!version) continue;
        const key = `${c}::${version}`;
        const item = normalizeItemBase(version, c);
        item.released = entry.release_date ? entry.release_date.split('T')[0] : item.released;
        item.dart_version = entry.dart_sdk_version || entry.dart_version || null;
        item.engine_revision = entry.engine || entry.engine_revision || null;
        item.commit_ref = entry.hash || null;
        item.ref_url = `https://github.com/flutter/flutter/releases/tag/${version}`;
        item.platforms = buildPlatformUrlsFromManifest(entry, c);
        // minimal notes
        if(entry.release_notes_url) item.notes_url = entry.release_notes_url;
        mergeCandidate(candidatesMap, key, item);
        found++;
      }
      status.channels[c] = { found }; status.counts[c] = found;
    }

    // add Github recent releases (few pages) as candidates if not present
    const ghReleases = await fetchGithubReleasesPages(3);
    for(const gr of (ghReleases||[])){
      const tag = gr.tag_name || null;
      if(!tag) continue;
      // try to deduce channel: prefer tag that matches manifests earlier
      let channelMatch = null;
      for(const c of CHANNELS){
        const m = manifests[c];
        if(m){
          if(findManifestEntry(m, tag)) { channelMatch = c; break; }
        }
      }
      const channel = channelMatch || 'dev';
      const key = `${channel}::${tag}`;
      const item = normalizeItemBase(tag, channel);
      item.released = gr.published_at ? gr.published_at.split('T')[0] : null;
      item.summary = gr.body ? (gr.body||'').split('\n')[0] : null;
      item.notes_url = gr.html_url || null;
      item.ref_url = gr.html_url || `https://github.com/flutter/flutter/releases/tag/${tag}`;
      // assets map
      if(Array.isArray(gr.assets)){
        for(const a of gr.assets){
          const name = (a.name||'').toLowerCase();
          const url = a.browser_download_url || a.url;
          if(!url) continue;
          if(name.includes('macos') && name.includes('arm')) item.platforms.macos_arm64 = url;
          else if(name.includes('macos') && (name.includes('x64')||name.includes('intel'))) item.platforms.macos_x64 = url;
          else if(name.includes('windows')) item.platforms.windows_x64 = url;
          else if(name.includes('linux')) item.platforms.linux_x64 = url;
          else item.platforms[normalizePlatformKey(name)] = url;
        }
      }
      mergeCandidate(candidatesMap, key, item);
    }

    // enrich all candidates (manifestEntry lookup per-channel)
    const finalItems = [];
    for(const [key,v] of Object.entries(candidatesMap)){
      const [channel, version] = key.split('::');
      const manifestEntry = findManifestEntry(manifests[channel], version) || null;
      const base = normalizeItemBase(version, channel);
      // merge existing v into base
      Object.assign(base, v);
      const enriched = await enrichItem(base, manifestEntry, channel);
      // final sanity: ensure flutter_version present
      if(!enriched.flutter_version) continue;
      finalItems.push(enriched);
    }

    // sanity checks
    if(finalItems.length === 0){
      status.status = 'error'; status.errors.push('No items generated');
      // write status and keep last good
      safeWriteAtomic(STATUS_PATH, JSON.stringify(status, null, 2));
      console.error('Generation failed: no items');
      if(DRY_RUN) return;
      process.exit(1);
    }

    // write generated then atomically move to final
    const out = { meta: { generated_at: nowIso(), count: finalItems.length }, items: finalItems };
    const outStr = JSON.stringify(out, null, 2);

    if(DRY_RUN){
      console.log(`Dry-run: would generate ${finalItems.length} items`);
      safeWriteAtomic(GENERATED_PATH, outStr);
      safeWriteAtomic(STATUS_PATH, JSON.stringify(status, null, 2));
      return;
    }

    // write generated
    safeWriteAtomic(GENERATED_PATH, outStr);

    // backup last good
    if(fs.existsSync(FINAL_PATH)){
      fs.copyFileSync(FINAL_PATH, LAST_GOOD);
    }

    // move generated -> final
    safeWriteAtomic(FINAL_PATH, outStr);

    // write status
    status.generated_at = nowIso();
    status.count = finalItems.length;
    // compute per-channel verification summary
    const byCh = {};
    for(const it of finalItems){
      byCh[it.channel] = byCh[it.channel] || { total:0, verified:0 };
      byCh[it.channel].total++;
      if(it.verified) byCh[it.channel].verified++;
    }
    status.channels = byCh;
    safeWriteAtomic(STATUS_PATH, JSON.stringify(status, null, 2));

    console.log(`Done. Items: ${finalItems.length}`);
    return;

  }catch(err){
    status.status = 'error'; status.errors.push(String(err));
    safeWriteAtomic(STATUS_PATH, JSON.stringify(status, null, 2));
    console.error('Error during generation:', err);
    process.exit(1);
  }
}

// run
run();
