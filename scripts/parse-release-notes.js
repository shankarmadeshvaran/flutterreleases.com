// scripts/parse-release-notes.js
// ESM script. Usage:
//   node scripts/parse-release-notes.js versions.txt
// OR
//   node scripts/parse-release-notes.js 3.35.0 3.32.0 3.29.0
//
// Output: public/data/releases.generated.json
//
// It fetches raw markdown from flutter/website repo and extracts:
//  - released (YYYY-MM-DD)
//  - dart_version
//  - engine_revision
//  - summary (first paragraph)
//  - notes_url and ref_url
//
// It optionally merges public/data/manual_overrides.json (if exists).
//
// Notes: The script is best-effort — markdown formats vary slightly across versions.
// Manual overrides file is useful to patch platform download URLs and verified flags.

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const RAW_BASE = 'https://raw.githubusercontent.com/flutter/website/main/src/content/release/release-notes';

function isoDateFromString(s){
  if(!s) return null;
  // try yyyy-mm-dd
  const iso = s.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if(iso) return iso[1];
  // try Month D, YYYY
  const long = s.match(/\b([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})\b/);
  if(long){
    const d = new Date(long[1]);
    if(!isNaN(d)) return d.toISOString().slice(0,10);
  }
  return null;
}

function extractFirstParagraph(md){
  // split on blank line
  const parts = md.split(/\r?\n\r?\n/).map(p => p.trim()).filter(Boolean);
  // skip heading if present
  for(const p of parts){
    if(!p.startsWith('#')) return p.replace(/\r?\n/g,' ').replace(/\[(.*?)\]\(.*?\)/g,'$1').trim();
  }
  return null;
}

function findDartVersion(md){
  // common patterns:
  // - "Dart SDK 3.7.0"
  // - "Roll Dart SDK to 3.7.0"
  // - "Dart 3.7.0"
  const patterns = [
    /Dart SDK(?: version)?\s*[:–—]?\s*([0-9]+\.[0-9]+\.[0-9]+)/i,
    /Roll(?:ed|) Dart(?: SDK)?(?: to)?\s*([0-9]+\.[0-9]+\.[0-9]+)/i,
    /\bDart\s+([0-9]+\.[0-9]+\.[0-9]+)\b/i
  ];
  for(const re of patterns){
    const m = md.match(re);
    if(m) return m[1];
  }
  return null;
}

function findEngineRevision(md){
  // common patterns:
  // - "Engine revision xxxxxxxx"
  // - "Engine: <sha>"
  const patterns = [
    /Engine revision\s*[:–—]?\s*([0-9a-fA-F]{7,40})/i,
    /Engine\s*[:–—]?\s*([0-9a-fA-F]{7,40})/i,
    /engine:\s*([0-9a-fA-F]{7,40})/i
  ];
  for(const re of patterns){
    const m = md.match(re);
    if(m) return m[1];
  }
  return null;
}

function safeUrlForNotes(version){
  return `https://docs.flutter.dev/release/release-notes/release-notes-${version}`;
}
function safeRefUrl(version){
  return `https://github.com/flutter/flutter/releases/tag/${version}`;
}

async function fetchRawMarkdown(version){
  const url = `${RAW_BASE}/release-notes-${version}.md`;
  const res = await fetch(url, { headers: { 'User-Agent': 'flutterreleases-parser/1.0 (+https://flutterreleases.com)' }});
  if(res.status === 404) {
    // fallback: try without leading "release-notes-"? (older paths)
    // But for now return null
    return { ok:false, status: 404, url };
  }
  if(!res.ok) return { ok:false, status: res.status, url };
  const md = await res.text();
  return { ok:true, md, url };
}

function loadOverrides(){
  const p = path.join(process.cwd(), 'public', 'data', 'manual_overrides.json');
  if(fs.existsSync(p)){
    try{
      const raw = fs.readFileSync(p,'utf8');
      return JSON.parse(raw);
    }catch(e){
      console.warn('manual_overrides.json exists but failed to parse:', e.message);
    }
  }
  return {};
}

async function processVersion(version){
  const fetched = await fetchRawMarkdown(version);
  if(!fetched.ok){
    return {
      flutter_version: version,
      channel: 'stable',
      released: null,
      dart_version: null,
      engine_revision: null,
      commit_ref: null,
      requires: {},
      platforms: {},
      notes_url: safeUrlForNotes(version),
      notes: [{type:'release-notes', title:`Release notes ${version}`, url: safeUrlForNotes(version)}],
      ref_url: safeRefUrl(version),
      summary: null,
      verified: false,
      _meta: { source: fetched.url, ok: false, status: fetched.status }
    };
  }
  const md = fetched.md;

  // Extract release date: look for date-like strings in the first 200 chars or the top of the file
  // Many markdowns have date in the opening paragraph or 'Published' line.
  // We'll search entire file for a date pattern near the top.
  const top = md.split(/\r?\n/).slice(0,60).join('\n');
  let released = isoDateFromString(top);
  if(!released){
    // also try entire file
    released = isoDateFromString(md);
  }

  const summary = extractFirstParagraph(md);
  const dart_version = findDartVersion(md);
  const engine_revision = findEngineRevision(md);

  return {
    flutter_version: version,
    channel: 'stable',
    released,
    dart_version,
    engine_revision,
    commit_ref: null,
    requires: {},
    platforms: {},
    notes_url: safeUrlForNotes(version),
    notes: [{type:'release-notes', title:`Release notes ${version}`, url: safeUrlForNotes(version)}],
    ref_url: safeRefUrl(version),
    summary,
    verified: false,
    _meta: { source: fetched.url, ok: true }
  };
}

function mergeOverrides(items, overrides){
  if(!overrides || !overrides.items) return items;
  const map = new Map();
  for(const it of items) map.set(it.flutter_version, it);
  for(const ov of overrides.items){
    if(!ov.flutter_version) continue;
    if(map.has(ov.flutter_version)){
      // shallow merge: ov fields override items
      const base = map.get(ov.flutter_version);
      map.set(ov.flutter_version, { ...base, ...ov });
    }else{
      map.set(ov.flutter_version, ov);
    }
  }
  return Array.from(map.values()).sort((a,b)=> (a.released||'') < (b.released||'') ? 1 : -1);
}

async function main(){
  const args = process.argv.slice(2);
  let versions = [];
  if(args.length === 0){
    console.error('Usage: node scripts/parse-release-notes.js 3.35.0 3.32.0 ...');
    console.error('Or: node scripts/parse-release-notes.js versions.txt (one per line)');
    process.exit(1);
  }
  // support single argument pointing to a file
  if(args.length === 1 && fs.existsSync(args[0])){
    const data = fs.readFileSync(args[0],'utf8');
    versions = data.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).filter(l=>!l.startsWith('#'));
  }else{
    versions = args.slice();
  }

  if(versions.length === 0){
    console.error('No versions to process.');
    process.exit(1);
  }

  console.log('Versions:', versions.join(', '));
  const outItems = [];
  for(const v of versions){
    try{
      const item = await processVersion(v);
      outItems.push(item);
      console.log('Parsed', v, '=>', { released: item.released, dart: item.dart_version, engine: item.engine_revision });
    }catch(e){
      console.error('Error processing', v, e.message);
    }
  }

  // merge overrides
  const overrides = loadOverrides();
  const merged = mergeOverrides(outItems, overrides);

  const out = {
    meta: { generated_at: new Date().toISOString(), count: merged.length },
    items: merged
  };

  const outDir = path.join(process.cwd(), 'public', 'data');
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'releases.generated.json');
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote', outFile, 'items:', merged.length);
  console.log('If some fields are missing, consider adding manual overrides in public/data/manual_overrides.json');
}

main();