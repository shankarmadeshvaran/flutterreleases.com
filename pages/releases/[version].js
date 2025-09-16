// pages/releases/[version].js
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import Seo from '../../components/Seo';

export default function ReleasePage({ release }) {
  if (!release) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <Seo title="Release not found" description="Release not found" />
        <h1 className="text-2xl font-semibold mb-4">Release not found</h1>
        <p className="text-sm text-gray-600">
          The requested release could not be found. See the{' '}
          <Link href="/"><a className="underline">home page</a></Link>.
        </p>
      </main>
    );
  }

  const title = `Flutter ${release.flutter_version} — ${release.channel}`;
  const url = `https://flutterreleases.com/releases/${encodeURIComponent(
    release.flutter_version
  )}`;
  const description =
    release.seo_description ||
    release.summary ||
    `Details for Flutter ${release.flutter_version}.`;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <Seo
        title={title}
        description={description}
        url={url}
        extraKeywords={`flutter ${release.flutter_version}, flutter ${release.channel} release`}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          Flutter {release.flutter_version}
        </h1>
        <div className="text-sm text-gray-600 mt-1">
          <span className="inline-block mr-3">
            Channel: <strong>{release.channel}</strong>
          </span>
          <span className="inline-block mr-3">
            Released: <strong>{release.released || '—'}</strong>
          </span>
          <span className="inline-block">
            Verified: <strong>{release.verified ? 'Yes' : 'No'}</strong>
          </span>
        </div>
      </header>

      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Summary</h2>
        <p className="text-base text-gray-800">
          {release.summary || 'No summary available.'}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Details</h2>
        <dl className="grid grid-cols-1 gap-2 text-sm text-gray-700">
          <div>
            <dt className="font-medium">Dart version</dt>
            <dd>{release.dart_version || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium">Engine revision</dt>
            <dd>{release.engine_revision || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium">Notes</dt>
            <dd>
              {release.notes_url ? (
                <a
                  className="underline"
                  href={release.notes_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Release notes
                </a>
              ) : (
                <span>—</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Downloads</h2>
        {release.platforms && Object.keys(release.platforms).length > 0 ? (
          <ul className="space-y-2">
            {release.platforms.macos_arm64 && (
              <li>
                <a
                  className="text-sm underline"
                  href={release.platforms.macos_arm64}
                  target="_blank"
                  rel="noreferrer"
                >
                  macOS (arm64)
                </a>
              </li>
            )}
            {release.platforms.macos_x64 && (
              <li>
                <a
                  className="text-sm underline"
                  href={release.platforms.macos_x64}
                  target="_blank"
                  rel="noreferrer"
                >
                  macOS (x64)
                </a>
              </li>
            )}
            {release.platforms.windows_x64 && (
              <li>
                <a
                  className="text-sm underline"
                  href={release.platforms.windows_x64}
                  target="_blank"
                  rel="noreferrer"
                >
                  Windows (x64)
                </a>
              </li>
            )}
            {release.platforms.linux_x64 && (
              <li>
                <a
                  className="text-sm underline"
                  href={release.platforms.linux_x64}
                  target="_blank"
                  rel="noreferrer"
                >
                  Linux (x64)
                </a>
              </li>
            )}
            {/* fallback for any other platforms */}
            {Object.entries(release.platforms).map(([k, v]) =>
              ['macos_arm64', 'macos_x64', 'windows_x64', 'linux_x64'].includes(
                k
              ) ? null : (
                <li key={k}>
                  <a
                    className="text-sm underline"
                    href={v}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {k} download
                  </a>
                </li>
              )
            )}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">
            No downloads available via this page.
          </p>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Requirements</h2>
        <div className="text-sm text-gray-700 space-y-1">
          <div>macOS: {release.requires?.macos || 'See official docs'}</div>
          <div>Windows: {release.requires?.windows || 'See official docs'}</div>
          <div>Linux: {release.requires?.linux || 'See official docs'}</div>
        </div>
      </section>

      <footer className="mt-6 text-sm text-gray-600">
        <div className="mb-2">
          <a
            className="underline"
            href={release.ref_url || '#'}
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub
          </a>
        </div>
        <div>
          <Link href="/"><a className="underline">← Back to releases</a></Link>
        </div>
      </footer>
    </main>
  );
}

export async function getStaticPaths() {
  const p = path.join(process.cwd(), 'public', 'releases.json');
  if (!fs.existsSync(p)) {
    return { paths: [], fallback: false };
  }
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  const items = raw.items || [];
  const paths = items.map(it => ({ params: { version: it.flutter_version } }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const p = path.join(process.cwd(), 'public', 'releases.json');
  if (!fs.existsSync(p)) {
    return { props: { release: null } };
  }
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  const release =
    (raw.items || []).find(it => it.flutter_version === params.version) || null;
  return { props: { release } };
}