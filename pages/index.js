// pages/index.js
import fs from 'fs';
import path from 'path';
import Seo from '../components/Seo';
import ReleaseTable from '../components/ReleaseTable';
import Header from '../components/Header.js';
import { normalizeReleases } from '../models/Release.js';

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
                Made with <span aria-hidden>❤️</span> by{' '}
                <a
                  href="https://x.com/devinmaking"
                  className="text-flutter-blue-500 hover:text-flutter-blue-600"
                  target="_blank"
                  rel="noreferrer"
                >
                  @devinmaking
                </a>
                {' '}—{' '}
                <a
                  href="https://github.com/shankarmadeshvaran/flutterreleases.com"
                  className="text-flutter-blue-500 hover:text-flutter-blue-600"
                  target="_blank"
                  rel="noreferrer"
                >
                  View on GitHub
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

  // Normalize each item to the shape ReleaseTable expects using the model
  const normalized = normalizeReleases(rawItems, { verbose: VERBOSE });

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