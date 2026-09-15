const CHANNEL_ORDER = { stable: 0, beta: 1, dev: 2, main: 3 };
export const OFFICIAL_FLUTTER_ARCHIVE_URL = 'https://docs.flutter.dev/release/archive';

export function normalizeSiteUrl(siteUrl = 'https://flutterreleases.com') {
  return String(siteUrl || 'https://flutterreleases.com').replace(/\/$/, '');
}

export function releaseTime(release) {
  const time = release?.released ? new Date(release.released).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

export function sortReleasesForLookup(items) {
  return [...items].sort((a, b) => {
    const channelDelta = (CHANNEL_ORDER[a.channel] ?? 4) - (CHANNEL_ORDER[b.channel] ?? 4);
    if (channelDelta !== 0) return channelDelta;
    return releaseTime(b) - releaseTime(a);
  });
}

export function latestByChannel(items, channel) {
  return items.find(r => r.channel === channel && r.version);
}

export function getLatestStable(items) {
  return latestByChannel(items, 'stable');
}

export function getLatestBeta(items) {
  return latestByChannel(items, 'beta');
}

export function getLatestDev(items) {
  return latestByChannel(items, 'dev') || latestByChannel(items, 'main');
}

export function stableReleases(items) {
  return items.filter(r => r.channel === 'stable' && r.version);
}

export function getRelease(items, version) {
  return items.find(r => r.version === version);
}

export function getDartForFlutter(items, version) {
  return getRelease(items, version)?.dart_version || null;
}

export function getFlutterVersionsForDart(items, dartVersion) {
  if (!dartVersion) return [];
  return sortReleasesForLookup(items.filter(r => r.dart_version === dartVersion));
}

export function semverGroup(version) {
  const match = String(version || '').match(/^v?(\d+)\.(\d+)\./);
  return match ? `${match[1]}.${match[2]}` : null;
}

export function getStableReleaseContext(items, release) {
  const stable = stableReleases(items);
  const index = stable.findIndex(r => r.version === release.version);
  const series = semverGroup(release.version);
  const sameSeries = series
    ? stable.filter(r => semverGroup(r.version) === series)
    : [];

  return {
    series,
    previous: index >= 0 ? stable[index + 1] || null : null,
    next: index > 0 ? stable[index - 1] || null : null,
    sameSeries: sameSeries.filter(r => r.version !== release.version),
  };
}

export function channelLabel(channel) {
  const map = { stable: 'Stable', beta: 'Beta', dev: 'Dev', main: 'Main' };
  return map[channel] || channel;
}

export function releasePath(release) {
  return `/release/${encodeURIComponent(release.version)}/`;
}

export function releaseMarkdownPath(release) {
  return `/release/${encodeURIComponent(release.version)}.md`;
}

export function releaseUrl(release, siteUrl = 'https://flutterreleases.com') {
  return `${normalizeSiteUrl(siteUrl)}${releasePath(release)}`;
}

export function releaseMarkdownUrl(release, siteUrl = 'https://flutterreleases.com') {
  return `${normalizeSiteUrl(siteUrl)}${releaseMarkdownPath(release)}`;
}

export function sourceLinksForRelease(release) {
  const links = [];
  const seen = new Set();
  const add = (key, label, url) => {
    if (!url || seen.has(url)) return;
    links.push({ key, label, url });
    seen.add(url);
  };

  const sourceLabels = Array.isArray(release.sources) ? release.sources : [];
  if (sourceLabels.includes('Flutter SDK Archive') || Object.values(release.platforms || {}).some(Boolean)) {
    add('sdk_archive', 'Flutter SDK Archive', OFFICIAL_FLUTTER_ARCHIVE_URL);
  }

  const notesUrl = release.release_notes?.base || null;
  if (notesUrl) add('release_notes', 'Flutter release notes', notesUrl);

  if (release.ref_url) {
    const label = release.version === 'main' ? 'Flutter main branch commit' : 'Flutter GitHub tag';
    add('github', label, release.ref_url);
  }

  if (sourceLabels.includes('DEPS') && release.version === 'main') {
    add('deps', 'Flutter DEPS file', 'https://github.com/flutter/flutter/blob/main/DEPS');
  }

  return links;
}

export function sourceUrlsObject(release) {
  const out = {};
  for (const link of sourceLinksForRelease(release)) {
    out[link.key] = link.url;
  }
  return out;
}

export function markdownEscape(value) {
  return String(value || '').replace(/\|/g, '\\|');
}
