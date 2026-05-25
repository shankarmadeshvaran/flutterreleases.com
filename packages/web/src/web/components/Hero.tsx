import type { Release } from "../types/release";

interface HeroProps {
  latestStable: Release | undefined;
  latestBeta: Release | undefined;
}

export function Hero({ latestStable, latestBeta }: HeroProps) {
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
          <div className="flex flex-wrap gap-2 mb-5">
            {latestStable && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-subtle)" }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--stable-text)" }}
                />
                <span style={{ color: "var(--text-secondary)" }}>Latest stable</span>
                <span className="font-semibold mono" style={{ color: "var(--text-primary)" }}>
                  {latestStable.version}
                </span>
              </div>
            )}
            {latestBeta && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-subtle)" }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--beta-text)" }}
                />
                <span style={{ color: "var(--text-secondary)" }}>Latest beta</span>
                <span className="font-semibold mono" style={{ color: "var(--text-primary)" }}>
                  {latestBeta.version}
                </span>
              </div>
            )}
          </div>

          {/* Trust cues */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Downloads hosted by Google</span>
            <span>·</span>
            <span>Not an official Google resource</span>
            <span>·</span>
            <span>Free for the Flutter community</span>
          </div>
        </div>
      </div>
    </div>
  );
}
