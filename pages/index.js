// pages/index.js
import fs from 'fs';
import path from 'path';
import Seo from '../components/Seo';
import ReleaseTable from '../components/ReleaseTable';
import Header from '../components/Header.js';

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
       <Header showDonate={SHOW_DONATE_BUTTON} />

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
                href="/data/releases.json"
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
  const VERBOSE = process.env.NODE_ENV !== 'production'; // set false in prod
  const tryPaths = [
    path.join(process.cwd(), 'public', 'data', 'releases.json'),
    path.join(process.cwd(), 'public', 'releases.json'),
  ];

  if (VERBOSE) console.log('>>> getStaticProps START (server) —', new Date().toISOString());

  // pick the first existing file
  let chosenPath = null;
  for (const p of tryPaths) {
    try {
      if (fs.existsSync(p)) {
        chosenPath = p;
        if (VERBOSE) console.log('getStaticProps: reading path ->', p);
        break;
      }
    } catch (e) {
      // ignore
    }
  }

  if (!chosenPath) {
    if (VERBOSE) console.warn('getStaticProps: no releases.json found in public/');
    return { props: { data: { meta: { generated_at: null, count: 0 }, items: [] } } };
  }

  let raw;
  try {
    const rawText = fs.readFileSync(chosenPath, 'utf8');
    raw = JSON.parse(rawText);
  } catch (e) {
    console.error('getStaticProps: failed to read/parse', chosenPath, e?.message || e);
    return { props: { data: { meta: { generated_at: null, count: 0 }, items: [] } } };
  }

  // Accept either { meta, items } or an array (items)
  const rawItems = Array.isArray(raw.items) ? raw.items : (Array.isArray(raw) ? raw : []);

  // tiny utility: pick first non-empty key in order
  const pick = (...keys) => obj => {
    for (const k of keys) {
      if (!obj) break;
      const v = obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return null;
  };

  // Normalize release_notes for a raw item.
  const normalizeNotes = (rawItem) => {
    // If there's an explicit release_notes object, filter null/empty values
    if (rawItem.release_notes && typeof rawItem.release_notes === 'object') {
      const cleaned = Object.entries(rawItem.release_notes)
        .filter(([k, v]) => v !== null && v !== undefined && String(v).trim() !== '')
        .reduce((acc, [k, v]) => {
          acc[k] = String(v).trim();
          return acc;
        }, {});
      return Object.keys(cleaned).length ? cleaned : null;
    }

    // fallback single URL props
    const fallback = rawItem.notes_url || rawItem.notesUrl || rawItem.release_notes_url || rawItem.ref_url || rawItem.notes || null;
    if (!fallback || String(fallback).trim() === '') return null;
    const base = String(fallback).trim();

    // If this is a full release, synthesize per-section anchors (only if release_type === 'Release')
    const releaseType = (rawItem.release_type || rawItem.type || rawItem.releaseType || rawItem.release || '').toString().toLowerCase();
    if (releaseType === 'release') {
      // generate anchors (defensive — they may or may not actually exist on the page)
      return {
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
    }

    // non-Release => only base
    return { base };
  };

  // Normalize each item to the shape ReleaseTable expects
  const normalized = rawItems.map((it, idx) => {
    // several possible keys historically used (compat)
    const version = it.version || it.flutter_version || it.flutterVersion || it.flutterVersionString || null;
    const channel = it.channel || 'stable';
    const release_type = it.release_type || it.type || it.releaseType || (it.release ? String(it.release) : 'Release');
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
    const verified = typeof it.verified === 'boolean' ? it.verified : !!(it.sources && it.sources.includes('GitHub Release'));
    const sources = it.sources || [];

    const release_notes = normalizeNotes(it);

    if (VERBOSE) {
      console.log(`raw item ${idx}: candidateVersion=${version || '(missing)'} keys=[${Object.keys(it).join(',')}]`);
      if (VERBOSE && release_notes) {
        const keys = Object.keys(release_notes).join(',');
        console.log(`[RN-debug] ${version || '(no-version)'} release_notes= ${JSON.stringify(release_notes)} -> sectionsKeys=${keys}`);
      }
    }

    return {
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
      __raw: it, // keep raw in case ReleaseTable needs to inspect
    };
  });

  // compact meta
  const meta = raw.meta || { generated_at: null, count: normalized.length };

  if (VERBOSE) {
    const compact = normalized.map((n, i) => {
      const base = n.release_notes && n.release_notes.base ? n.release_notes.base : '(none)';
      return `${i}: ${n.version || '(no-version)'} | base=${base}`;
    });
  }

  if (VERBOSE) console.log('>>> getStaticProps END (server)');

  return { props: { data: { meta, items: normalized } } };
}