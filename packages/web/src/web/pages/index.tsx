import { useEffect, useState } from "react";
import { useReleases, useFilteredReleases } from "../hooks/useReleases";
import { useDarkMode } from "../hooks/useDarkMode";
import { useMeta } from "../hooks/useMeta";
import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { FilterBar } from "../components/FilterBar";
import { ReleaseTable, ReleaseTableSkeleton } from "../components/ReleaseTable";
import { Pagination } from "../components/Pagination";
import { Footer } from "../components/Footer";
import type { Channel } from "../types/release";
import { trackEvent, trackView } from "../lib/analytics";

const PER_PAGE = 10;

export default function HomePage() {
  const { releases, loading, error } = useReleases();
  const { dark, toggle } = useDarkMode();
  const selectedVersion =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("v") ?? ""
      : "";

  const [channel, setChannel] = useState<Channel | "all">("all");
  const [search, setSearch] = useState(selectedVersion);
  const [page, setPage] = useState(1);

  const { filtered, total, totalPages } = useFilteredReleases(
    releases,
    channel,
    search,
    page,
    PER_PAGE
  );

  const handleChannelChange = (c: Channel | "all") => {
    trackEvent("Filter Changed", { channel: c });
    setChannel(c);
    setPage(1);
  };

  const handleSearchChange = (s: string) => {
    setSearch(s);
    setPage(1);
  };

  const latestStable = releases.find((r) => r.channel === "stable");
  const latestBeta = releases.find((r) => r.channel === "beta");

  useEffect(() => {
    if (!selectedVersion) return;
    trackView(`/release/${selectedVersion}/`, {
      source: "spa_query",
      version: selectedVersion,
    });
    trackEvent("Release Deep Link Viewed", { version: selectedVersion });
  }, [selectedVersion]);

  useEffect(() => {
    const query = search.trim();
    if (!query) return;
    const timer = window.setTimeout(() => {
      trackEvent("Release Search", {
        query: query.slice(0, 80),
        length: query.length,
        result_count: total,
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [search, total]);

  const channelLabel =
    channel === "all"
      ? "All Channels"
      : channel.charAt(0).toUpperCase() + channel.slice(1);
  useMeta(
    channel === "all"
      ? "Flutter Releases | downloads, notes, channels"
      : `Flutter ${channelLabel} Releases | flutterreleases.com`,
    channel === "all"
      ? "Browse every Flutter release — version, Dart SDK pairing, channel, direct download links and release notes. Updated daily."
      : `Browse Flutter ${channel} releases with Dart SDK versions, download links, and release notes. Updated daily.`
  );

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <Header dark={dark} onToggleDark={toggle} />
      <Hero latestStable={latestStable} latestBeta={latestBeta} loading={loading} />
      <FilterBar
        channel={channel}
        search={search}
        onChannelChange={handleChannelChange}
        onSearchChange={handleSearchChange}
        total={total}
      />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-0">
        {loading && (
          <ReleaseTableSkeleton />
        )}

        {error && (
          <div className="flex items-center justify-center py-24">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {error}
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            <ReleaseTable
              releases={filtered}
              selectedVersion={selectedVersion || undefined}
            />
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
            <div
              className="px-6 pt-4 pb-4 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              If a direct download link doesn't work, check Flutter's{" "}
              <a
                href="https://docs.flutter.dev/release/archive"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("Official Archive Click", { location: "home_table_fallback" })}
                style={{ color: "var(--accent)" }}
              >
                official release archive
              </a>
              .
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
