import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const dist = path.join(process.cwd(), 'packages/web/dist');
const home = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const enabled = home.includes('flutterreleases-analytics:start');
if (process.argv.includes('--require-enabled')) assert.ok(enabled, 'Build with VITE_GA_MEASUREMENT_ID to test enabled analytics');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : file.endsWith('.html') ? [file] : [];
  });
}

const files = htmlFiles(dist);
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const tags = html.match(/googletagmanager\.com\/gtag\/js/g) || [];
  assert.equal(tags.length, enabled ? 1 : 0, `${file}: GA4 bootstrap count`);
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/type="(?:module|application\/ld\+json)"|src=/.test(match[1])) continue;
    new vm.Script(match[2], { filename: file });
  }
}

if (enabled) {
  const releases = JSON.parse(fs.readFileSync(path.join(dist, 'releases.json'), 'utf8'));
  const version = (Array.isArray(releases) ? releases : releases.items).find(item => item.channel === 'stable').version;
  const html = fs.readFileSync(path.join(dist, 'release', version, 'index.html'), 'utf8');
  const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .find(match => match[1].includes("document.addEventListener('click'"))?.[1];
  assert.ok(script, 'Static pages need delegated click tracking');
  const events = [];
  let click;
  vm.runInNewContext(script, {
    URL,
    location: new URL('https://flutterreleases.com/release/example/'),
    window: { gtag: (...args) => events.push(args) },
    document: { addEventListener: (name, callback) => { if (name === 'click') click = callback; } },
  });
  function press(href, inReact = false) {
    const link = { href, closest: () => inReact ? {} : null };
    click({ target: { closest: () => link } });
  }
  press('https://flutterreleases.com/release/3.44.9/');
  assert.equal(events.pop()[1], 'release_page_click');
  press('https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/sdk.zip');
  assert.equal(events.pop()[1], 'download_click');
  press('https://github.com/flutter/flutter/blob/stable/CHANGELOG.md#3449');
  assert.equal(events.pop()[1], 'release_notes_click');
  press('https://flutterreleases.com/tools/flutter-version-checker/');
  assert.equal(events.pop()[1], 'navigation_click');
  press('https://flutterreleases.com/release/3.44.9/', true);
  assert.equal(events.length, 0, 'React links must not be counted twice');
  console.log('Static click behavior passed.');
}
console.log(`Analytics validation passed for ${files.length} HTML files (enabled: ${enabled}).`);

// Execute the checker's actual effect callbacks with controlled timers and data.
const checker = fs.readFileSync('packages/web/src/web/pages/flutter-version-checker.tsx', 'utf8');
const effectStart = checker.indexOf('  useEffect(() => {', checker.indexOf('const showResultPanel'));
const effects = checker.slice(effectStart, checker.indexOf('\n  return (', effectStart));
function checkerEvents(inputRevision, overrides = {}) {
  const events = [];
  const timers = [];
  const release = { version: '3.44.9', dartVersion: '3.12.2', channel: 'stable', releaseType: 'Hotfix' };
  const context = {
    inputRevision, loading: false, mode: 'flutter-to-dart', channel: 'stable',
    latestStable: release, initializedDefault: { current: true },
    selectedFlutterRelease: release,
    trackedFlutterLookup: { current: null }, trackedDartLookup: { current: null },
    trackedCompatibility: { current: null },
    dartQuery: '3.12.2', trimmedDartQuery: '3.12.2', trimmedFlutterQuery: '3.44.9',
    dartMatches: [release], compatibilityResultKey: '3.44.9:3.12.2',
    compatibilityResult: { flutterRelease: release, bundledDartVersion: '3.12.2', compatible: true, dartReleases: [release] },
    setFlutterQuery: () => {}, setDartQuery: () => {},
    trackEvent: (name, params) => events.push({ name, params }),
    useEffect: callback => callback(),
    window: { setTimeout: callback => timers.push(callback), clearTimeout: () => {} },
    ...overrides,
  };
  vm.runInNewContext(effects, context);
  assert.equal(events.length, 1, 'Only the viewed event should fire before the debounce');
  timers.forEach(callback => callback());
  return events.filter(event => event.name !== 'Version Checker Viewed');
}
assert.equal(checkerEvents(0).length, 0, 'Auto-filled defaults must not count as lookups');
const edited = checkerEvents(1);
assert.ok(edited.some(event => event.name === 'Checker Compatibility Check' && event.params.compatible));
assert.ok(edited.every(event => event.name.toLowerCase().replaceAll(' ', '_').length < 40));
const unmatched = checkerEvents(1, { selectedFlutterRelease: undefined, compatibilityResult: undefined, dartMatches: [] });
assert.deepEqual(unmatched.map(event => event.name), ['Checker Lookup Unmatched']);
assert.equal(unmatched[0].params.missing_flutter, true);
assert.equal(unmatched[0].params.missing_dart, true);
const reverse = checkerEvents(1, { mode: 'dart-to-flutter' });
assert.deepEqual(reverse.map(event => event.name), ['Version Checker Dart Lookup']);
console.log('Checker analytics defaults, debounce, matched, unmatched, and reverse lookup checks passed.');
