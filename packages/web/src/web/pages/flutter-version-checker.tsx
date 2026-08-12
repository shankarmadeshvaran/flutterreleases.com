import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { ChannelBadge, ReleaseTypeBadge } from "../components/ChannelBadge";
import { useDarkMode } from "../hooks/useDarkMode";
import { useMeta } from "../hooks/useMeta";
import { useReleases } from "../hooks/useReleases";
import { trackEvent, trackView } from "../lib/analytics";
import {
  checkFlutterDartCompatibility,
  filterFlutterVersions,
  getDartVersionForFlutter,
  getDartVersions,
  getFlutterVersionsForDart,
  getLatestStableRelease,
  sortReleasesForCompatibility,
} from "../lib/compatibility";
import type { Channel, Release } from "../types/release";

const TITLE = "Flutter & Dart Version Compatibility Checker | FlutterReleases";
const DESCRIPTION =
  "Check which Dart SDK version ships with any Flutter release and find Flutter versions compatible with a specific Dart version.";

type Mode = "flutter-to-dart" | "dart-to-flutter";
type ChannelFilter = Channel | "all" | "prerelease";

const CHANNEL_FILTERS: { label: string; value: ChannelFilter }[] = [
  { label: "Stable", value: "stable" },
  { label: "All", value: "all" },
  { label: "Beta", value: "beta" },
  { label: "Dev / Prerelease", value: "prerelease" },
];

function formatDate(dateStr: string) {
  if (!dateStr) return "Unknown";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function releaseHref(release: Release) {
  return `/release/${release.version}/`;
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-medium mb-2"
      style={{ color: "var(--text-muted)" }}
    >
      {children}
    </label>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  list,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  list?: string;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      list={list}
      className="w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors duration-150"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border)",
        color: "var(--text-primary)",
      }}
      onFocus={(event) => (event.currentTarget.style.borderColor = "var(--accent)")}
      onBlur={(event) => (event.currentTarget.style.borderColor = "var(--border)")}
    />
  );
}

function ReleaseSummary({ release }: { release: Release }) {
  return (
    <article
      className="rounded-lg border p-4"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-surface)",
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="mono text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Flutter {release.version}
          </h2>
          <p className="mono text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Dart SDK: {release.dartVersion || "Unavailable"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ChannelBadge channel={release.channel} />
          {release.releaseType && <ReleaseTypeBadge type={release.releaseType} />}
        </div>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <div>
          <dt className="text-xs" style={{ color: "var(--text-muted)" }}>
            Channel
          </dt>
          <dd className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {release.channel}
          </dd>
        </div>
        <div>
          <dt className="text-xs" style={{ color: "var(--text-muted)" }}>
            Released
          </dt>
          <dd className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {formatDate(release.releasedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs" style={{ color: "var(--text-muted)" }}>
            Release type
          </dt>
          <dd className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {release.releaseType || "Release"}
          </dd>
        </div>
      </dl>
      <a
        href={releaseHref(release)}
        className="inline-flex items-center gap-1 mt-4 text-sm transition-colors duration-150"
        style={{ color: "var(--accent)" }}
        onClick={() =>
          trackEvent("Version Checker Release Click", {
            version: release.version,
            channel: release.channel,
          })
        }
      >
        View Flutter {release.version} release <ExternalLink size={13} />
      </a>
    </article>
  );
}

function ReleaseResults({
  dartVersion,
  releases,
}: {
  dartVersion: string;
  releases: Release[];
}) {
  if (!dartVersion.trim()) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Select a Dart SDK version to see every Flutter release that bundles it.
      </p>
    );
  }

  if (!releases.length) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        No Flutter release in releases.json bundles Dart {dartVersion}.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        Flutter releases that bundle Dart {dartVersion}
      </h2>
      <div className="overflow-x-auto border rounded-lg" style={{ borderColor: "var(--border)" }}>
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-subtle)" }}
            >
              <th className="text-left px-4 py-3">Flutter</th>
              <th className="text-left px-4 py-3">Channel</th>
              <th className="text-left px-4 py-3">Released</th>
              <th className="text-left px-4 py-3">Release</th>
            </tr>
          </thead>
          <tbody>
            {releases.map((release) => (
              <tr key={`${release.version}-${release.channel}`} className="border-b" style={{ borderColor: "var(--border)" }}>
                <td className="px-4 py-3 mono text-sm" style={{ color: "var(--text-primary)" }}>
                  Flutter {release.version}
                </td>
                <td className="px-4 py-3">
                  <ChannelBadge channel={release.channel} />
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {formatDate(release.releasedAt)}
                </td>
                <td className="px-4 py-3">
                  <a href={releaseHref(release)} className="text-sm" style={{ color: "var(--accent)" }}>
                    View release
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompatibilityResult({
  flutterVersion,
  dartVersion,
  releases,
}: {
  flutterVersion: string;
  dartVersion: string;
  releases: Release[];
}) {
  if (!flutterVersion.trim() || !dartVersion.trim()) return null;

  const result = checkFlutterDartCompatibility(releases, flutterVersion, dartVersion);
  return (
    <section
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-surface)" }}
      aria-live="polite"
    >
      <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        Compatibility result
      </h2>
      <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
        {result.compatible
          ? `Compatible: Flutter ${flutterVersion} ships with Dart ${dartVersion}.`
          : `Not the Dart SDK bundled with this Flutter release.`}
      </p>
      {!result.compatible && (
        <div className="text-sm mt-3 space-y-2" style={{ color: "var(--text-secondary)" }}>
          <p>
            Flutter {flutterVersion} bundles{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {result.bundledDartVersion || "an unavailable Dart version"}
            </strong>
            . Flutter releases ship with a specific Dart SDK; this checker does not imply
            arbitrary Dart SDK versions can be swapped into a Flutter installation.
          </p>
          {result.dartReleases.length > 0 && (
            <p>
              Dart {dartVersion} appears in{" "}
              {result.dartReleases.slice(0, 4).map((release, index) => (
                <span key={release.version}>
                  {index > 0 ? ", " : ""}
                  <a href={releaseHref(release)} style={{ color: "var(--accent)" }}>
                    Flutter {release.version}
                  </a>
                </span>
              ))}
              {result.dartReleases.length > 4 ? " and more releases" : ""}.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default function FlutterVersionCheckerPage() {
  const { releases, loading, error } = useReleases();
  const { dark, toggle } = useDarkMode();
  const [mode, setMode] = useState<Mode>("flutter-to-dart");
  const [channel, setChannel] = useState<ChannelFilter>("stable");
  const [flutterQuery, setFlutterQuery] = useState("");
  const [dartQuery, setDartQuery] = useState("");
  const trackedFlutterLookup = useRef<string | null>(null);
  const trackedDartLookup = useRef<string | null>(null);
  const trackedCompatibility = useRef<string | null>(null);

  useMeta(TITLE, DESCRIPTION, "https://flutterreleases.com/tools/flutter-version-checker/");

  const sortedReleases = useMemo(
    () => sortReleasesForCompatibility(releases),
    [releases]
  );
  const latestStable = useMemo(
    () => getLatestStableRelease(releases),
    [releases]
  );
  const flutterOptions = useMemo(
    () => filterFlutterVersions(releases, flutterQuery, channel).slice(0, 80),
    [releases, flutterQuery, channel]
  );
  const dartVersions = useMemo(() => getDartVersions(releases), [releases]);
  const selectedFlutterRelease = useMemo(
    () => getDartVersionForFlutter(releases, flutterQuery),
    [releases, flutterQuery]
  );
  const dartMatches = useMemo(
    () => getFlutterVersionsForDart(releases, dartQuery),
    [releases, dartQuery]
  );
  const stableRows = sortedReleases.filter((release) => release.channel === "stable");
  const prereleaseRows = sortedReleases.filter((release) => release.channel !== "stable");
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  useEffect(() => {
    trackView("/tools/flutter-version-checker/", {
      page_title: "Flutter & Dart Version Compatibility Checker",
    });
    trackEvent("Version Checker Viewed", {
      default_mode: "flutter-to-dart",
      default_channel: "stable",
    });
  }, []);

  useEffect(() => {
    if (!selectedFlutterRelease) return;
    const key = `${selectedFlutterRelease.version}:${selectedFlutterRelease.dartVersion}`;
    if (trackedFlutterLookup.current === key) return;
    trackedFlutterLookup.current = key;
    trackEvent("Version Checker Flutter Lookup", {
      flutter_version: selectedFlutterRelease.version,
      dart_version: selectedFlutterRelease.dartVersion,
      channel: selectedFlutterRelease.channel,
      release_type: selectedFlutterRelease.releaseType,
      mode,
    });
  }, [mode, selectedFlutterRelease]);

  useEffect(() => {
    if (!dartQuery.trim() || !dartMatches.length) return;
    const key = `${dartQuery}:${dartMatches.length}`;
    if (trackedDartLookup.current === key) return;
    trackedDartLookup.current = key;
    trackEvent("Version Checker Dart Lookup", {
      dart_version: dartQuery,
      result_count: dartMatches.length,
      stable_count: dartMatches.filter((release) => release.channel === "stable").length,
      beta_count: dartMatches.filter((release) => release.channel === "beta").length,
      prerelease_count: dartMatches.filter((release) => release.channel !== "stable" && release.channel !== "beta").length,
      mode,
    });
  }, [dartMatches, dartQuery, mode]);

  useEffect(() => {
    if (!flutterQuery.trim() || !dartQuery.trim()) return;
    const result = checkFlutterDartCompatibility(releases, flutterQuery, dartQuery);
    if (!result.flutterRelease) return;
    const key = `${flutterQuery}:${dartQuery}:${result.compatible}`;
    if (trackedCompatibility.current === key) return;
    trackedCompatibility.current = key;
    trackEvent("Version Checker Compatibility Check", {
      flutter_version: flutterQuery,
      dart_version: dartQuery,
      bundled_dart_version: result.bundledDartVersion,
      compatible: result.compatible,
      matching_flutter_count: result.dartReleases.length,
      channel: result.flutterRelease.channel,
    });
  }, [dartQuery, flutterQuery, releases]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      <Header dark={dark} onToggleDark={toggle} />
      <main className="flex-1">
        <section className="border-b" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-surface)" }}>
          <div className="max-w-[1200px] mx-auto px-6 py-10">
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
              Flutter Dart Compatibility
            </p>
            <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
              Flutter &amp; Dart Version Compatibility Checker
            </h1>
            <p className="text-sm leading-relaxed max-w-2xl" style={{ color: "var(--text-secondary)" }}>
              Flutter releases bundle a specific Dart SDK. Use this tool to find which
              Dart version ships with a Flutter release, or which Flutter releases include
              a Dart SDK version, using the FlutterReleases dataset.
            </p>
          </div>
        </section>

        <div className="max-w-[1200px] mx-auto px-6 py-8">
          {loading && (
            <div className="flex items-center justify-center py-24">
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-24">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-10">
              <section
                className="rounded-lg border p-4 md:p-5"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-surface)" }}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                      Check Flutter and Dart versions
                    </h2>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                      Stable releases are shown first by default. Switch to All or prerelease
                      channels when you need beta, dev, or main builds.
                    </p>
                  </div>
                  {latestStable && (
                    <a href={releaseHref(latestStable)} className="text-sm whitespace-nowrap" style={{ color: "var(--accent)" }}>
                      Latest stable: Flutter {latestStable.version}
                    </a>
                  )}
                </div>

                <div className="mt-5">
                  <div className="inline-flex rounded-lg border p-1" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-subtle)" }} role="tablist" aria-label="Checker mode">
                    {[
                      { label: "Flutter → Dart", value: "flutter-to-dart" as const },
                      { label: "Dart → Flutter", value: "dart-to-flutter" as const },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        role="tab"
                        aria-selected={mode === item.value}
                        onClick={() => {
                          setMode(item.value);
                          trackEvent("Version Checker Mode Changed", { mode: item.value });
                        }}
                        className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150"
                        style={
                          mode === item.value
                            ? { backgroundColor: "var(--accent)", color: "#fff" }
                            : { backgroundColor: "transparent", color: "var(--text-secondary)" }
                        }
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6 mt-5">
                  <div className="space-y-4">
                    <div>
                      <FieldLabel htmlFor="flutter-version-input">Flutter version</FieldLabel>
                      <TextInput
                        id="flutter-version-input"
                        value={flutterQuery}
                        onChange={setFlutterQuery}
                        placeholder="Search or select Flutter version"
                        list="flutter-version-options"
                      />
                      <datalist id="flutter-version-options">
                        {flutterOptions.map((release) => (
                          <option key={`${release.version}-${release.channel}`} value={release.version}>
                            Flutter {release.version} · Dart {release.dartVersion} · {release.channel}
                          </option>
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                        Channel filter
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {CHANNEL_FILTERS.map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                              setChannel(item.value);
                              trackEvent("Version Checker Channel Filter", {
                                channel: item.value,
                              });
                            }}
                            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-150"
                            style={
                              channel === item.value
                                ? { borderColor: "var(--accent)", backgroundColor: "var(--accent)", color: "#fff" }
                                : { borderColor: "var(--border)", backgroundColor: "transparent", color: "var(--text-secondary)" }
                            }
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <FieldLabel htmlFor="dart-version-input">Dart SDK version</FieldLabel>
                      <TextInput
                        id="dart-version-input"
                        value={dartQuery}
                        onChange={setDartQuery}
                        placeholder="Search or select Dart version"
                        list="dart-version-options"
                      />
                      <datalist id="dart-version-options">
                        {dartVersions.map((version) => (
                          <option key={version} value={version}>
                            Dart {version}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {mode === "flutter-to-dart" ? (
                      selectedFlutterRelease ? (
                        <ReleaseSummary release={selectedFlutterRelease} />
                      ) : (
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                          Select a Flutter release to see its bundled Dart SDK, channel,
                          release date, release type, and release details link.
                        </p>
                      )
                    ) : (
                      <ReleaseResults dartVersion={dartQuery} releases={dartMatches} />
                    )}
                    <CompatibilityResult
                      flutterVersion={flutterQuery}
                      dartVersion={dartQuery}
                      releases={releases}
                    />
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    Stable Flutter and Dart Compatibility
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    Stable Flutter releases and the Dart SDK version bundled with each release.
                  </p>
                </div>
                <CompatibilityTable releases={stableRows} />
              </section>

              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    Beta and Prerelease Flutter Versions
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    Non-stable releases are listed for completeness when developers need to
                    trace the first Flutter build that included a Dart SDK.
                  </p>
                </div>
                <CompatibilityTable releases={prereleaseRows} />
              </section>

              <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-surface)" }}>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  Related Flutter version resources
                </h2>
                <ul className="mt-3 space-y-2 text-sm">
                  <li><a href="/flutter-versions/" style={{ color: "var(--accent)" }}>All Flutter versions</a></li>
                  {latestStable && (
                    <li><a href={releaseHref(latestStable)} style={{ color: "var(--accent)" }}>Flutter {latestStable.version} release</a></li>
                  )}
                  <li><a href="/releases.json" style={{ color: "var(--accent)" }}>Flutter release JSON dataset</a></li>
                </ul>
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer updatedAt={today} />
    </div>
  );
}

function CompatibilityTable({ releases }: { releases: Release[] }) {
  return (
    <div className="overflow-x-auto border rounded-lg" style={{ borderColor: "var(--border)" }}>
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-subtle)" }}
          >
            <th className="text-left px-4 py-3">Flutter</th>
            <th className="text-left px-4 py-3">Dart</th>
            <th className="text-left px-4 py-3">Channel</th>
            <th className="text-left px-4 py-3">Released</th>
          </tr>
        </thead>
        <tbody>
          {releases.map((release) => (
            <tr key={`${release.version}-${release.channel}`} className="border-b" style={{ borderColor: "var(--border)" }}>
              <td className="px-4 py-3">
                <a href={releaseHref(release)} className="mono text-sm font-medium" style={{ color: "var(--accent)" }}>
                  Flutter {release.version}
                </a>
              </td>
              <td className="px-4 py-3 mono text-sm" style={{ color: "var(--text-secondary)" }}>
                {release.dartVersion || "Unavailable"}
              </td>
              <td className="px-4 py-3">
                <ChannelBadge channel={release.channel} />
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                {formatDate(release.releasedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
