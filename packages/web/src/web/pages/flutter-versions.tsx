import { ExternalLink } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { ChannelBadge } from "../components/ChannelBadge";
import { useDarkMode } from "../hooks/useDarkMode";
import { useMeta } from "../hooks/useMeta";
import { useReleases } from "../hooks/useReleases";
import type { Release } from "../types/release";

const TITLE = "Flutter Versions & Releases — Latest Stable Flutter SDK";
const DESCRIPTION =
  "See the latest Flutter stable, beta and dev versions, complete Flutter version history, Dart SDK compatibility and release details.";

function formatDate(dateStr: string) {
  if (!dateStr) return "Unknown";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function semverGroup(version: string) {
  const match = version.match(/^v?(\d+)\.(\d+)\./);
  return match ? `${match[1]}.${match[2]}` : null;
}

function seriesId(series: string) {
  return `flutter-${series.replace(/\./g, "-")}`;
}

function groupByMajorMinor(releases: Release[]) {
  const groups = new Map<string, Release[]>();
  for (const release of releases) {
    const group = semverGroup(release.version);
    if (!group) continue;
    const existing = groups.get(group) ?? [];
    existing.push(release);
    groups.set(group, existing);
  }
  return Array.from(groups.entries());
}

function LatestReleaseCard({
  title,
  release,
}: {
  title: string;
  release: Release | undefined;
}) {
  if (!release) {
    return (
      <div className="border rounded-lg p-4" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
          {title}
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Not available in releases.json
        </p>
      </div>
    );
  }

  return (
    <a
      href={`/release/${release.version}/`}
      className="block border rounded-lg p-4 transition-colors duration-150"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-surface)",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <p className="text-xs font-medium mb-3" style={{ color: "var(--text-muted)" }}>
        {title}
      </p>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mono text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Flutter {release.version}
          </p>
          <p className="mono text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Dart {release.dartVersion}
          </p>
        </div>
        <ChannelBadge channel={release.channel} />
      </div>
      <div className="flex items-center justify-between gap-3 mt-4">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {formatDate(release.releasedAt)}
        </span>
        <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--accent)" }}>
          Details <ExternalLink size={11} />
        </span>
      </div>
    </a>
  );
}

function ReleaseRow({ release }: { release: Release }) {
  return (
    <tr className="border-b" style={{ borderColor: "var(--border)" }}>
      <td className="px-4 py-3">
        <a
          href={`/release/${release.version}/`}
          className="mono text-sm font-medium transition-colors duration-150"
          style={{ color: "var(--accent)" }}
        >
          Flutter {release.version}
        </a>
      </td>
      <td className="px-4 py-3 mono text-sm" style={{ color: "var(--text-secondary)" }}>
        {release.dartVersion}
      </td>
      <td className="px-4 py-3">
        <ChannelBadge channel={release.channel} />
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
        {formatDate(release.releasedAt)}
      </td>
    </tr>
  );
}

export default function FlutterVersionsPage() {
  const { releases, loading, error } = useReleases();
  const { dark, toggle } = useDarkMode();

  useMeta(TITLE, DESCRIPTION, "https://flutterreleases.com/flutter-versions/");

  const latestStable = releases.find((r) => r.channel === "stable");
  const latestBeta = releases.find((r) => r.channel === "beta");
  const latestDev = releases.find((r) => r.channel === "dev") ?? releases.find((r) => r.channel === "main");
  const stableReleases = releases.filter((r) => r.channel === "stable" && semverGroup(r.version));
  const prereleaseRows = releases.filter((r) => r.channel !== "stable" && semverGroup(r.version));
  const stableGroups = groupByMajorMinor(stableReleases);
  const prereleaseGroups = groupByMajorMinor(prereleaseRows);
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <Header dark={dark} onToggleDark={toggle} />

      <main className="flex-1">
        <section
          className="border-b"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-surface)" }}
        >
          <div className="max-w-[1200px] mx-auto px-6 py-10">
            <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
              Flutter Version History
            </p>
            <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
              Flutter Versions & Releases
            </h1>
            <p className="text-sm leading-relaxed max-w-2xl" style={{ color: "var(--text-secondary)" }}>
              See the latest Flutter stable, beta and dev versions, complete Flutter version history, Dart SDK compatibility and release details.
            </p>

            {!loading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
                <LatestReleaseCard title="Latest Stable Flutter release" release={latestStable} />
                <LatestReleaseCard title="Latest Beta" release={latestBeta} />
                <LatestReleaseCard title="Latest Dev" release={latestDev} />
              </div>
            )}
          </div>
        </section>

        <div className="max-w-[1200px] mx-auto px-6 py-8">
          {loading && (
            <div className="flex items-center justify-center py-24">
              <div
                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-24">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {error}
              </p>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-10">
              <section>
                <div className="flex items-end justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                      Stable Flutter Version History
                    </h2>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                      Stable Flutter SDK releases grouped by major and minor version.
                    </p>
                  </div>
                  <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {stableReleases.length} stable releases
                  </span>
                </div>

                <div className="space-y-6">
                  {stableGroups.map(([group, groupReleases]) => (
                    <div key={group} id={seriesId(group)}>
                      <h3 className="mono text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                        Flutter {group}
                      </h3>
                      <div className="overflow-x-auto border rounded-lg" style={{ borderColor: "var(--border)" }}>
                        <table className="w-full min-w-[640px] border-collapse">
                          <thead>
                            <tr className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-subtle)" }}>
                              <th className="text-left px-4 py-3">Version</th>
                              <th className="text-left px-4 py-3">Dart version</th>
                              <th className="text-left px-4 py-3">Channel</th>
                              <th className="text-left px-4 py-3">Release date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupReleases.map((release) => (
                              <ReleaseRow key={`${group}-${release.version}-${release.channel}`} release={release} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    Flutter ↔ Dart compatibility
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    Stable Flutter versions with Dart SDK compatibility. Every version links to its release details.
                  </p>
                </div>
                <div className="overflow-x-auto border rounded-lg" style={{ borderColor: "var(--border)" }}>
                  <table className="w-full min-w-[640px] border-collapse">
                    <thead>
                      <tr className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-subtle)" }}>
                        <th className="text-left px-4 py-3">Flutter version</th>
                        <th className="text-left px-4 py-3">Dart SDK</th>
                        <th className="text-left px-4 py-3">Channel</th>
                        <th className="text-left px-4 py-3">Release date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stableReleases.map((release) => (
                        <ReleaseRow key={`compat-${release.version}-${release.channel}`} release={release} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <div className="flex items-end justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                      Beta and prerelease history
                    </h2>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                      Prerelease Flutter SDK versions remain available below the stable history.
                    </p>
                  </div>
                  <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {prereleaseRows.length} prereleases
                  </span>
                </div>

                <div className="space-y-6">
                  {prereleaseGroups.map(([group, groupReleases]) => (
                    <div key={group}>
                      <h3 className="mono text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                        Flutter {group}
                      </h3>
                      <div className="overflow-x-auto border rounded-lg" style={{ borderColor: "var(--border)" }}>
                        <table className="w-full min-w-[640px] border-collapse">
                          <thead>
                            <tr className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-subtle)" }}>
                              <th className="text-left px-4 py-3">Version</th>
                              <th className="text-left px-4 py-3">Dart version</th>
                              <th className="text-left px-4 py-3">Channel</th>
                              <th className="text-left px-4 py-3">Release date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupReleases.map((release) => (
                              <ReleaseRow key={`pre-${group}-${release.version}-${release.channel}`} release={release} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      <Footer updatedAt={today} />
    </div>
  );
}
