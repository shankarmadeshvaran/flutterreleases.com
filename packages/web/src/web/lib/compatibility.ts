import type { Channel, Release } from "../types/release";

const CHANNEL_ORDER: Record<string, number> = {
  stable: 0,
  beta: 1,
  dev: 2,
  main: 3,
};

function releasedTime(release: Release) {
  const time = release.releasedAt ? new Date(release.releasedAt).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

export function sortReleasesForCompatibility(releases: Release[]) {
  return [...releases].sort((a, b) => {
    const channelDelta =
      (CHANNEL_ORDER[a.channel] ?? 4) - (CHANNEL_ORDER[b.channel] ?? 4);
    if (channelDelta !== 0) return channelDelta;
    return releasedTime(b) - releasedTime(a);
  });
}

export function getLatestStableRelease(releases: Release[]) {
  return sortReleasesForCompatibility(releases).find(
    (release) => release.channel === "stable"
  );
}

export function getDartVersionForFlutter(
  releases: Release[],
  flutterVersion: string
) {
  const selected = flutterVersion.trim();
  if (!selected) return undefined;
  return releases.find((release) => release.version === selected);
}

export function getFlutterVersionsForDart(
  releases: Release[],
  dartVersion: string
) {
  const selected = dartVersion.trim();
  if (!selected) return [];
  return sortReleasesForCompatibility(
    releases.filter((release) => release.dartVersion === selected)
  );
}

export function getDartVersions(releases: Release[]) {
  return Array.from(
    new Set(
      releases
        .map((release) => release.dartVersion)
        .filter((version) => version && version !== "—")
    )
  ).sort((a, b) => {
    const latestA = releases.find((release) => release.dartVersion === a);
    const latestB = releases.find((release) => release.dartVersion === b);
    return releasedTime(latestB as Release) - releasedTime(latestA as Release);
  });
}

export function filterFlutterVersions(
  releases: Release[],
  query: string,
  channel: Channel | "all" | "prerelease"
) {
  const q = query.trim().toLowerCase();
  const filtered = releases.filter((release) => {
    const channelMatches =
      channel === "all" ||
      release.channel === channel ||
      (channel === "prerelease" &&
        release.channel !== "stable" &&
        release.channel !== "beta");

    const queryMatches =
      !q ||
      release.version.toLowerCase().includes(q) ||
      release.dartVersion.toLowerCase().includes(q) ||
      release.channel.toLowerCase().includes(q);

    return channelMatches && queryMatches;
  });

  return sortReleasesForCompatibility(filtered);
}

export function checkFlutterDartCompatibility(
  releases: Release[],
  flutterVersion: string,
  dartVersion: string
) {
  const flutterRelease = getDartVersionForFlutter(releases, flutterVersion);
  const dartReleases = getFlutterVersionsForDart(releases, dartVersion);
  const bundledDartVersion = flutterRelease?.dartVersion;
  const compatible = Boolean(
    flutterRelease &&
      dartVersion.trim() &&
      bundledDartVersion &&
      bundledDartVersion === dartVersion.trim()
  );

  return {
    compatible,
    flutterRelease,
    bundledDartVersion,
    dartReleases,
  };
}
