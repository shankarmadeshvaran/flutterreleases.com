// pages/releases/[version].js
import fs from 'fs';
import path from 'path';
import Head from 'next/head';

export default function Release({ release }) {
  if (!release) return <main className="p-6">Release not found</main>;
  return (
    <main className="max-w-3xl mx-auto p-6">
      <Head>
        <title>Flutter {release.flutter_version} — {release.channel}</title>
        <meta name="description" content={release.summary || `Flutter ${release.flutter_version}`} />
      </Head>

      <h1 className="text-2xl font-semibold">Flutter {release.flutter_version}</h1>
      <p className="text-sm text-gray-600">Channel: {release.channel} • Released: {release.released}</p>

      <section className="mt-4">
        <p>{release.summary}</p>
      </section>

      <section className="mt-6">
        <a className="text-sm underline" href={release.ref_url} target="_blank" rel="noreferrer">View on GitHub</a>
      </section>
    </main>
  );
}

export async function getStaticPaths() {
  const p = path.join(process.cwd(), 'public', 'releases.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  const paths = (raw.items || []).map(it => ({ params: { version: it.flutter_version } }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const p = path.join(process.cwd(), 'public', 'releases.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  const release = (raw.items || []).find(it => it.flutter_version === params.version) || null;
  return { props: { release } };
}