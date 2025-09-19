// components/Seo.js
import Head from 'next/head';

const SITE_NAME = 'FlutterReleases';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://flutterreleases.com';

const DEFAULT_KEYWORDS = [
  'flutter releases',
  'flutter release notes',
  'flutter sdk download',
  'flutter latest version',
  'flutter changelog',
  'flutter dart sdk'
].join(', ');

const THEME_COLOR = '#02569B';
const MS_TILE_COLOR = '#02569B';

export default function Seo({
  title = '',
  description = '',
  url = '',
  extraKeywords = ''
}) {
  const metaTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const metaDesc =
    description ||
    'Consolidated list of Flutter releases with Dart versions, release notes, and SDK download links (stable, main, beta, dev channels).';
  const canonical = url || SITE_URL;
  const keywords = extraKeywords ? `${DEFAULT_KEYWORDS}, ${extraKeywords}` : DEFAULT_KEYWORDS;

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

      {/* Basic meta */}
      <meta name="description" content={metaDesc} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonical} />

      {/* Favicons */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color={THEME_COLOR} />
      <meta name="msapplication-TileColor" content={MS_TILE_COLOR} />
      <meta name="theme-color" content={THEME_COLOR} />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={`${SITE_NAME} preview`} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={ogImage} />
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