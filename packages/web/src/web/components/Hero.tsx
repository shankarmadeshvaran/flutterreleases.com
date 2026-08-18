import type { Release } from "../types/release";
import { trackEvent } from "../lib/analytics";

interface HeroProps {
  latestStable: Release | undefined;
  latestBeta: Release | undefined;
  loading?: boolean;
}

function LoadingPill({ width }: { width: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-[30px] rounded-full border"
      style={{
        width,
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-subtle)",
      }}
    />
  );
}

export function Hero({ latestStable, latestBeta, loading = false }: HeroProps) {
  return (
    <div
      className="border-b"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-surface)" }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
            Flutter Release Tracker
          </p>
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
            All Flutter versions in one place
          </h1>
          <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>
            Browse Flutter releases with matching Dart SDK versions, download links, and release notes — updated across stable, beta, and dev channels via GitHub Actions.
          </p>

          {/* Latest release pills */}
          <div className="flex min-h-[30px] flex-wrap gap-2 mb-5">
            {loading && !latestStable && <LoadingPill width="142px" />}
            {loading && !latestBeta && <LoadingPill width="172px" />}
            {latestStable && (
              <a
                href={`/release/${latestStable.version}/`}
                onClick={() => trackEvent("Hero Latest Click", {
                  version: latestStable.version,
                  channel: latestStable.channel,
                })}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-opacity hover:opacity-70"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-subtle)", textDecoration: "none" }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--stable-text)" }}
                />
                <span style={{ color: "var(--text-secondary)" }}>Latest stable</span>
                <span className="font-semibold mono" style={{ color: "var(--text-primary)" }}>
                  {latestStable.version}
                </span>
              </a>
            )}
            {latestBeta && (
              <a
                href={`/release/${latestBeta.version}/`}
                onClick={() => trackEvent("Hero Latest Click", {
                  version: latestBeta.version,
                  channel: latestBeta.channel,
                })}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-opacity hover:opacity-70"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-subtle)", textDecoration: "none" }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--beta-text)" }}
                />
                <span style={{ color: "var(--text-secondary)" }}>Latest beta</span>
                <span className="font-semibold mono" style={{ color: "var(--text-primary)" }}>
                  {latestBeta.version}
                </span>
              </a>
            )}
          </div>

          {/* Trust cues */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Downloads hosted by Google</span>
            <a
              href="/flutter-versions/"
              onClick={() => trackEvent("Navigation Click", {
                label: "Flutter Versions",
                href: "/flutter-versions/",
                location: "hero_trust_cue",
              })}
              className="transition-colors duration-150"
              style={{ color: "var(--accent)" }}
            >
              Flutter Versions
            </a>
            <a
              href="/tools/flutter-version-checker/"
              onClick={() => trackEvent("Navigation Click", {
                label: "Flutter Dart Compatibility Checker",
                href: "/tools/flutter-version-checker/",
                location: "hero_trust_cue",
              })}
              className="transition-colors duration-150"
              style={{ color: "var(--accent)" }}
            >
              Compatibility Checker
            </a>
            <a
              href="/blog/"
              onClick={() => trackEvent("Navigation Click", {
                label: "Blog",
                href: "/blog/",
                location: "hero_trust_cue",
              })}
              className="transition-colors duration-150"
              style={{ color: "var(--accent)" }}
            >
              Blog
            </a>
            <span>Not an official Google resource</span>
            <span>Free for the Flutter community</span>
          </div>
        </div>
      </div>
    </div>
  );
}
