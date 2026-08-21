#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'packages', 'web', 'public');
const RELEASES_PATH = path.join(PUBLIC_DIR, 'releases.json');
const BLOG_POSTS_PATH = path.join(ROOT, 'packages', 'web', 'src', 'web', 'data', 'blog-posts.json');
const DEFAULT_SITE_URL = 'https://flutterreleases.com';
const DEFAULT_INDEXNOW_KEY = '7f5162486aa84ed58a5faca3e760c881';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const siteUrl = normalizeSiteUrl(process.env.SITE_URL || DEFAULT_SITE_URL);
const key = process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY;

function normalizeSiteUrl(value) {
  return String(value || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

function canonicalUrl(pathname) {
  if (/^https?:\/\//.test(pathname)) return pathname;
  return `${siteUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function releaseUrl(version) {
  return canonicalUrl(`/release/${encodeURIComponent(version)}/`);
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function releaseTime(release) {
  const time = release.released ? new Date(release.released).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function latestByChannel(items, channel) {
  return items
    .filter(release => release.version && release.channel === channel)
    .sort((a, b) => releaseTime(b) - releaseTime(a))[0];
}

function recentByChannel(items, channel, limit) {
  return items
    .filter(release => release.version && release.channel === channel)
    .sort((a, b) => releaseTime(b) - releaseTime(a))
    .slice(0, limit);
}

function collectIndexNowUrls() {
  const releasesData = readJson(RELEASES_PATH, { items: [] });
  const releases = Array.isArray(releasesData) ? releasesData : releasesData.items || [];
  const blogPosts = readJson(BLOG_POSTS_PATH, []);
  const urls = new Set([
    canonicalUrl('/'),
    canonicalUrl('/flutter-versions/'),
    canonicalUrl('/tools/flutter-version-checker/'),
    canonicalUrl('/blog/'),
  ]);

  for (const post of Array.isArray(blogPosts) ? blogPosts : []) {
    if (post.href) urls.add(canonicalUrl(post.href));
  }

  for (const release of [
    latestByChannel(releases, 'stable'),
    latestByChannel(releases, 'beta'),
    latestByChannel(releases, 'dev'),
    latestByChannel(releases, 'main'),
    ...recentByChannel(releases, 'stable', 10),
  ]) {
    if (release?.version) urls.add(releaseUrl(release.version));
  }

  return [...urls];
}

async function submitIndexNow() {
  if (process.env.INDEXNOW_DISABLED === 'true') {
    console.log('IndexNow disabled via INDEXNOW_DISABLED=true');
    return;
  }

  if (!key) {
    console.log('No INDEXNOW_KEY configured; skipping IndexNow submission.');
    return;
  }

  const urlList = collectIndexNowUrls();
  const payload = {
    host: new URL(siteUrl).host,
    key,
    keyLocation: canonicalUrl(`/${key}.txt`),
    urlList,
  };

  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    console.log(`IndexNow dry run: ${urlList.length} URLs`);
    return;
  }

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`IndexNow submission failed: ${response.status} ${response.statusText}${body ? `\n${body}` : ''}`);
  }

  console.log(`Submitted ${urlList.length} URLs to IndexNow.`);
}

submitIndexNow().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
