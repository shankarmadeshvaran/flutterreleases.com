import { useState, useEffect, useMemo } from "react";
import type { Release, Channel } from "../types/release";

// Normalize raw JSON from releases.json (GitHub Actions crawler output)
// Raw fields: version, channel, release_type, released, dart_version,
//             requires{macos,xcode,windows,visual_studio,linux},
//             platforms{macos_arm64,macos_x64,windows_x64,linux_x64},
//             release_notes{base,framework,material,ios,android,windows,linux,web}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeRelease(raw: any): Release {
  const rn = raw.release_notes || {};
  const pl = raw.platforms || raw.download || {};
  const req = raw.requires || {};
  const channel = (raw.channel || "stable") as Channel;

  // For stable: use docs.flutter.dev release notes page as the full link.
  // For beta/main/dev: docs pages belong to the stable release, not the pre-release.
  //   Use the GitHub tag/commit link instead.
  const fullNotesUrl =
    channel === "stable"
      ? (rn.base || rn.full || raw.ref_url || null)
      : (raw.ref_url || rn.base || null);

  return {
    version: raw.version || raw.flutter_version || "—",
    dartVersion: raw.dart_version || raw.dart || "—",
    channel,
    releaseType: raw.release_type || raw.releaseType || "Release",
    releasedAt: raw.released || raw.date || "",
    requires: {
      macos: req.macos || "",
      xcode: req.xcode || "",
      windows: req.windows || "",
      visual_studio: req.visual_studio || req.vs || "",
      linux: req.linux || "",
    },
    downloads: {
      macosArm64: pl.macos_arm64 || pl.macosArm64 || null,
      macosX64: pl.macos_x64 || pl.macosX64 || null,
      windowsX64: pl.windows_x64 || pl.windowsX64 || null,
      linuxX64: pl.linux_x64 || pl.linuxX64 || null,
    },
    releaseNotes: {
      full: fullNotesUrl,
      framework: rn.framework || null,
      material: rn.material || null,
      ios: rn.ios || null,
      android: rn.android || null,
      windows: rn.windows || null,
      linux: rn.linux || null,
      web: rn.web || null,
    },
  };
}

export function useReleases() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/releases.json")
      .then((r) => r.json())
      .then((data) => {
        // Support both array format and { items: [...] } format
        const raw = Array.isArray(data) ? data : (data?.items ?? []);
        setReleases(raw.map(normalizeRelease));
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load releases.");
        setLoading(false);
      });
  }, []);

  return { releases, loading, error };
}

export function useFilteredReleases(
  releases: Release[],
  channel: Channel | "all",
  search: string,
  page: number,
  perPage: number
) {
  const filtered = useMemo(() => {
    let list = releases;
    if (channel !== "all") {
      if (channel === "hotfix") {
        list = list.filter((r) => r.releaseType.toLowerCase() === "hotfix");
      } else {
        list = list.filter((r) => r.channel === channel);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.version.toLowerCase().includes(q) ||
          r.dartVersion.toLowerCase().includes(q) ||
          r.channel.toLowerCase().includes(q) ||
          r.releaseType.toLowerCase().includes(q)
      );
    }
    return list;
  }, [releases, channel, search]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return { filtered: paginated, total, totalPages };
}
