#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'packages', 'web', 'dist');
const FAQ_HTML = path.join(DIST_DIR, 'faq', 'index.html');
const CHANGELOG_HTML = path.join(DIST_DIR, 'changelog', 'index.html');
const SITEMAP = path.join(DIST_DIR, 'sitemap.xml');

function read(filePath) {
  assert.ok(fs.existsSync(filePath), `${filePath} should exist`);
  return fs.readFileSync(filePath, 'utf8');
}

function includes(html, text, label) {
  assert.ok(html.includes(text), `${label} should include ${text}`);
}

const faqHtml = read(FAQ_HTML);
const changelogHtml = read(CHANGELOG_HTML);
const sitemapXml = read(SITEMAP);

includes(faqHtml, '<h1>FlutterReleases FAQ</h1>', 'FAQ page');
includes(faqHtml, '<link rel="canonical" href="https://flutterreleases.com/faq/" />', 'FAQ page');
includes(faqHtml, '"@type": "FAQPage"', 'FAQ structured data');
includes(faqHtml, 'Flutter Dart compatibility checker', 'FAQ internal links');
includes(sitemapXml, '<loc>https://flutterreleases.com/faq/</loc>', 'sitemap');

includes(changelogHtml, '<h1>FlutterReleases changelog</h1>', 'changelog page');
includes(changelogHtml, '<link rel="canonical" href="https://flutterreleases.com/changelog/" />', 'changelog page');
assert.ok(!sitemapXml.includes('<loc>https://flutterreleases.com/changelog/</loc>'), 'changelog should not be promoted in sitemap');

console.log('Site page validation passed.');
