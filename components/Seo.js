// components/Seo.js
import Head from 'next/head';

const SITE_NAME = 'FlutterReleases';
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://flutterreleases.com';

const DEFAULT_KEYWORDS = [
  'flutter releases',
  'flutter release notes',
  'flutter sdk download',
  'flutter latest version',
  'flutter changelog',
  'flutter dart sdk'
].join(', ');

export default function Seo({
  title = '',
  description = '',
  url = '',
  extraKeywords = ''
}) {
  const metaTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const metaDesc =
    description ||
    'Consolidated list of Flutter releases with Dart versions, release notes, and SDK download links (stable, beta, dev).';
  const canonical = url || SITE_URL;
  const keywords = extraKeywords
    ? `${DEFAULT_KEYWORDS}, ${extraKeywords}`
    : DEFAULT_KEYWORDS;

  const ogImage = `${SITE_URL}/og-image.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: SITE_URL,
    name: SITE_NAME,
    description: metaDesc,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME
    }
  };

  return (
    <Head>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDesc} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:site" content="@devinmaking" />
      <meta name="twitter:creator" content="@devinmaking" />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Head>
  );
}