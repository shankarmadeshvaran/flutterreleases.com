// pages/index.js
import fs from 'fs';
import path from 'path';
import Seo from '../components/Seo';
import ReleaseTable from '../components/ReleaseTable';
import ThemeToggle from '../components/ThemeToggle';

export default function Home({ data }) {
  // Feature flag to control donate button visibility
  const SHOW_DONATE_BUTTON = true;

  const generatedAt = data?.meta?.generated_at || data?.generated_at || null;
  const lastUpdated = generatedAt ? new Date(generatedAt).toLocaleDateString() : 'Unknown';

  // Shared intro (used for both UI and SEO description)
  const INTRO =
    'Browse the latest Flutter releases with matching Dart SDK versions, release notes, and direct download links — updated across stable, beta, and dev channels.(under development)';

  return (
    <>
      <Seo
        title="Flutter Releases — Latest Stable, Beta & Dev"
        description={INTRO}
        url="https://flutterreleases.com"
        extraKeywords="flutter version history, flutter sdk"
      />

      <div className="min-h-screen bg-white dark:bg-flutter-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-flutter-gray-800 border-b border-flutter-gray-200 dark:border-flutter-gray-700">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-flutter-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">F</span>
                  </div>
                  <h1 className="text-2xl font-semibold text-flutter-gray-900 dark:text-white">Flutter Releases</h1>
                </div>
                <p className="text-flutter-gray-600 dark:text-flutter-gray-400 text-base ml-11 mt-1">
                  All Flutter releases in one place
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                {SHOW_DONATE_BUTTON && (
                  <a
                    className="px-3 py-2 bg-flutter-blue-500 text-white rounded-md text-sm hover:bg-flutter-blue-600 transition-colors"
                    href="https://buymeacoffee.com/shankarmadeshvaran"
                    target="_blank"
                    rel="noreferrer"
                  >
                    ☕ Donate
                  </a>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
          {/* Intro paragraph (SEO-friendly) */}
          <div className="mb-6 text-center">
            <p className="text-lg text-flutter-gray-700 dark:text-flutter-gray-300 font-medium">
              {INTRO}
            </p>
          </div>

          {/* Disclaimer */}
          <div className="mb-8 text-center">
            <p className="text-base text-flutter-gray-600 dark:text-flutter-gray-400 mb-2">
              All downloads are hosted by Google. Links on this site take you directly to Flutter's official download pages.
            </p>
            <p className="text-base text-flutter-gray-600 dark:text-flutter-gray-400 mb-2">
              This is not an official Google website. A free resource for the Flutter community.
              {SHOW_DONATE_BUTTON && (
                <span>
                  {' '}<a href="https://buymeacoffee.com/shankarmadeshvaran" target="_blank" rel="noreferrer" className="text-red-500 hover:text-red-600 font-medium">Please consider donating</a>
                  {' '}to help maintain it.
                </span>
              )}
            </p>
            <p className="text-base text-flutter-gray-600 dark:text-flutter-gray-400">
              Stay up-to-date via our{' '}
              <a
                href="/releases.json"
                className="text-red-500 font-medium underline"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="JSON API (opens in new tab)"
              >
                JSON API
              </a>
              <span className="mx-1">,</span>{' '}
              <a
                href="/feed.xml"
                className="text-red-500 font-medium underline"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="RSS feed (opens in new tab)"
              >
                RSS feed
              </a>
              <span className="mx-1">,</span>{' '}
              <a
                href="https://x.com/devinmaking"
                className="text-red-500 font-medium underline"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter) account (opens in new tab)"
              >
                X account
              </a>
              .
            </p>
          </div>

          <hr className="border-flutter-gray-200 dark:border-flutter-gray-700 mb-8" />

          <ReleaseTable data={data} />

          <footer className="mt-16 pt-8 border-t border-flutter-gray-200 dark:border-flutter-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <p className="text-sm text-flutter-gray-500 dark:text-flutter-gray-400">
                flutterreleases.com is under development and maintained by{' '}
                <a
                  href="https://x.com/devinmaking"
                  className="text-flutter-blue-500 hover:text-flutter-blue-600"
                  target="_blank"
                  rel="noreferrer"
                >
                  @devinmaking
                </a>
              </p>
              <div className="text-xs text-flutter-gray-400 dark:text-flutter-gray-500">
                Last updated: {lastUpdated}
              </div>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}

export async function getStaticProps() {
  const tryPaths = [
    path.join(process.cwd(), 'public', 'data', 'releases.json'),
    path.join(process.cwd(), 'public', 'releases.json'),
  ];

  console.log('>>> getStaticProps START (server) —', new Date().toISOString());

  let chosenPath = null;
  let raw = null;
  for (const p of tryPaths) {
    try {
      if (fs.existsSync(p)) {
        chosenPath = p;
        break;
      }
    } catch (e) {
      // ignore and continue
    }
  }

  if (!chosenPath) {
    console.warn('getStaticProps: no releases.json found in public/data or public/');
    return { props: { data: { meta: { generated_at: null, count: 0 }, items: [] } } };
  }

  try {
    const stat = fs.statSync(chosenPath);

    const rawText = fs.readFileSync(chosenPath, 'utf8');
    raw = JSON.parse(rawText);
  } catch (e) {
    return { props: { data: { meta: { generated_at: null, count: 0 }, items: [] } } };
  }

  // raw should look like { meta: {...}, items: [...] } or maybe an array — handle both.
  const rawItems = Array.isArray(raw.items) ? raw.items : (Array.isArray(raw) ? raw : []);

  // Helper: pick first non-empty string among possibilities
  const pick = (...keys) => obj => {
    for (const k of keys) {
      if (!obj) break;
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).toString().trim() !== '') return obj[k];
    }
    return null;
  };

  const normalizeNotes = (rawItem) => {
    // If explicit release_notes object exists, keep only truthy values
    if (rawItem.release_notes && typeof rawItem.release_notes === 'object') {
      const cleaned = Object.entries(rawItem.release_notes)
        .filter(([k, v]) => v !== null && v !== undefined && String(v).trim() !== '')
        .reduce((acc, [k, v]) => { acc[k] = String(v).trim(); return acc; }, {});
      if (Object.keys(cleaned).length) return cleaned;
      return null;
    }

    // prefer notes_url / notesUrl / notes / ref_url
    const fallback = rawItem.notes_url || rawItem.notesUrl || rawItem.release_notes_url || rawItem.ref_url || rawItem.notes || null;
    if (!fallback || String(fallback).trim() === '') return null;

    // if this is a full Release, optionally auto-generate section anchors.
    // Only do this when rawItem.release_type === 'Release' (case-insensitive)
    const base = String(fallback).trim();
    const isFullRelease = String(rawItem.release_type || rawItem.type || '').toLowerCase() === 'release';

    if (!isFullRelease) {
      return { base };
    }

    // full release -> provide structured section links
    // create entries only if they resolve to distinct strings (defensive)
    const sections = {
      base,
      framework: `${base}#framework`,
      material: `${base}#material`,
      ios: `${base}#ios`,
      android: `${base}#android`,
      windows: `${base}#windows`,
      linux: `${base}#linux`,
      web: `${base}#web`,
      tools: `${base}#tooling`,
    };

    // Keep only truthy ones (they always are), but return as object.
    return sections;
  };

  // Normalize each raw item to shape expected by ReleaseTable
  const normalized = rawItems.map((it, idx) => {
    // prefer multiple possible keys for version (some files used flutter_version)
    const version = it.version || it.flutter_version || it.flutterVersion || null;
    const channel = it.channel || 'stable';
    const release_type = it.release_type || it.type || it.releaseType || (it.release ? String(it.release) : null) || 'Release';
    const released = it.released || it.published || it.date || null;
    const dart_version = it.dart_version || it.dart || it.dartVersion || null;
    const framework_revision = it.framework_revision || it.framework || it.frameworkRevision || null;
    const engine_revision = it.engine_revision || it.engine || null;
    const git_tag = it.git_tag || it.tag || null;
    const build = it.build || it.engine_revision || null;
    const requires = it.requires || {};
    const platforms = it.platforms || it.download || it.platform || {};
    const summary = it.summary || it.description || '';
    const ref_url = it.ref_url || it.ref || it.url || null;
    const verified = typeof it.verified === 'boolean' ? it.verified : (it.sources && it.sources.includes('GitHub Release'));
    const sources = it.sources || [];
    const release_notes = normalizeNotes(it);

    // debug log per item (concise)
    console.log(`raw item ${idx}: candidateVersion=${version || '(missing)'} keys=[${Object.keys(it).join(',')}]`);

    return {
      // minimal shape + keep original fields for debugging/compat
      version,
      channel,
      release_type,
      released,
      dart_version,
      framework_revision,
      engine_revision,
      git_tag,
      build,
      requires,
      platforms,
      release_notes, // either null or object of key->url (only truthy entries)
      summary,
      ref_url,
      verified: !!verified,
      sources,
      // keep raw item available for deeper debugging if needed
      __raw: it,
    };
  });

  // Also log a compact view of versions & base notes for quick debug
  const compact = normalized.map((n, i) => {
    const base = n.release_notes && n.release_notes.base ? n.release_notes.base : '(none)';
    return `${i}: ${n.version || '(no-version)'} | base=${base}`;
  });

  return { props: { data: { meta: raw.meta || { generated_at: null, count: normalized.length }, items: normalized } } };
}