#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'packages', 'web', 'dist');
const FAQ_HTML = path.join(DIST_DIR, 'faq', 'index.html');
const CHANGELOG_HTML = path.join(DIST_DIR, 'changelog', 'index.html');
const FAQ_MD = path.join(DIST_DIR, 'faq.md');
const FLUTTER_VERSIONS_MD = path.join(DIST_DIR, 'flutter-versions.md');
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
const faqMarkdown = read(FAQ_MD);
const flutterVersionsMarkdown = read(FLUTTER_VERSIONS_MD);
const sitemapXml = read(SITEMAP);
const robotsSource = read(path.join(ROOT, 'packages', 'web', 'public', 'robots.txt'));
const robotsOutput = read(path.join(DIST_DIR, 'robots.txt'));
assert.equal(robotsOutput, robotsSource, 'Built robots.txt should preserve the source policy');
assert.match(robotsOutput, /^User-agent: \*\r?\nContent-Signal: ai-train=no, search=yes, ai-input=yes\r?\nAllow: \/$/m, 'Public content should permit crawling, search, and AI retrieval but decline training');
assert.match(robotsOutput, /^Sitemap: https:\/\/flutterreleases\.com\/sitemap\.xml$/m);
assert.ok(!/^Disallow:\s*\//m.test(robotsOutput), 'Public content should not be blocked');

includes(faqHtml, '<h1>FlutterReleases FAQ</h1>', 'FAQ page');
includes(faqHtml, '<link rel="canonical" href="https://flutterreleases.com/faq/" />', 'FAQ page');
includes(faqHtml, '<link rel="alternate" type="text/markdown" href="https://flutterreleases.com/faq.md" />', 'FAQ page');
includes(faqHtml, '"@type": "FAQPage"', 'FAQ structured data');
includes(faqHtml, 'Flutter Dart compatibility checker', 'FAQ internal links');
includes(sitemapXml, '<loc>https://flutterreleases.com/faq/</loc>', 'sitemap');
includes(faqMarkdown, '# FlutterReleases FAQ', 'FAQ Markdown');
assert.ok(!faqMarkdown.includes('<!doctype html>'), 'FAQ Markdown should not contain HTML boilerplate');
includes(flutterVersionsMarkdown, '# Flutter Versions & Releases', 'Flutter versions Markdown');
assert.ok(!flutterVersionsMarkdown.includes('<!doctype html>'), 'Flutter versions Markdown should not contain HTML boilerplate');

includes(changelogHtml, '<h1>FlutterReleases changelog</h1>', 'changelog page');
includes(changelogHtml, '<link rel="canonical" href="https://flutterreleases.com/changelog/" />', 'changelog page');
assert.ok(!sitemapXml.includes('<loc>https://flutterreleases.com/changelog/</loc>'), 'changelog should not be promoted in sitemap');

console.log('Site page validation passed.');
