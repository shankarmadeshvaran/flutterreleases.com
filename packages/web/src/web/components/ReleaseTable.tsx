import { ExternalLink, Download, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { Release } from "../types/release";
import { ChannelBadge, ReleaseTypeBadge } from "./ChannelBadge";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function DownloadChips({ downloads }: { downloads: Release["downloads"] }) {
  const items: { label: string; url: string | null }[] = [
    { label: "macOS arm64", url: downloads.macosArm64 },
    { label: "macOS x64", url: downloads.macosX64 },
    { label: "Windows x64", url: downloads.windowsX64 },
    { label: "Linux x64", url: downloads.linuxX64 },
  ];
  const available = items.filter((i) => i.url);
  if (!available.length) return <span style={{ color: "var(--text-muted)" }} className="text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {available.map((item) => (
        <a
          key={item.label}
          href={item.url!}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs transition-colors duration-150"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <Download size={10} />
          {item.label}
        </a>
      ))}
    </div>
  );
}

function ReleaseNoteLinks({ notes }: { notes: Release["releaseNotes"] }) {
  const items: { label: string; url: string | null }[] = [
    { label: "Full Notes", url: notes.full },
    { label: "Framework", url: notes.framework },
    { label: "Material", url: notes.material },
    { label: "iOS", url: notes.ios },
    { label: "Android", url: notes.android },
    { label: "Windows", url: notes.windows },
    { label: "Linux", url: notes.linux },
    { label: "Web", url: notes.web },
  ];
  const available = items.filter((i) => i.url);
  if (!available.length) return <span style={{ color: "var(--text-muted)" }} className="text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {available.map((item) => (
        <a
          key={item.label}
          href={item.url!}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs transition-colors duration-150"
          style={{ color: "var(--accent)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--accent)")}
        >
          <ExternalLink size={10} />
          {item.label}
        </a>
      ))}
    </div>
  );
}

function ExpandedRow({ release }: { release: Release }) {
  return (
    <tr style={{ backgroundColor: "var(--bg-subtle)" }}>
      <td colSpan={7} className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
              Requirements
            </p>
            <div className="space-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              {(release.requires.macos || release.requires.xcode) && (
                <div>
                  <span className="font-medium">macOS</span>
                  {" — "}
                  {[release.requires.macos, release.requires.xcode].filter(Boolean).join(", ")}
                </div>
              )}
              {(release.requires.windows || release.requires.visual_studio) && (
                <div>
                  <span className="font-medium">Windows</span>
                  {" — "}
                  {[release.requires.windows, release.requires.visual_studio].filter(Boolean).join(", ")}
                </div>
              )}
              {release.requires.linux && (
                <div><span className="font-medium">Linux</span> — {release.requires.linux}</div>
              )}
              {!release.requires.macos && !release.requires.windows && !release.requires.linux && (
                <span style={{ color: "var(--text-muted)" }}>—</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
              Downloads
            </p>
            <DownloadChips downloads={release.downloads} />
          </div>
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
              Release Notes
            </p>
            <ReleaseNoteLinks notes={release.releaseNotes} />
          </div>
        </div>
        <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <a
            href={`/release/${release.version}/`}
            className="inline-flex items-center gap-1 text-xs transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <ExternalLink size={10} />
            Full release page →
          </a>
        </div>
      </td>
    </tr>
  );
}

interface ReleaseTableProps {
  releases: Release[];
}

export function ReleaseTable({ releases }: ReleaseTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (version: string) =>
    setExpanded((prev) => (prev === version ? null : version));

  if (releases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No releases found.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] border-collapse">
        <thead>
          <tr
            className="text-xs font-medium uppercase tracking-wider"
            style={{
              color: "var(--text-muted)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <th className="text-left px-6 py-3 w-[220px]">Flutter / Dart</th>
            <th className="text-left px-4 py-3 w-[90px]">Channel</th>
            <th className="text-left px-4 py-3 w-[100px]">Type</th>
            <th className="text-left px-4 py-3 w-[120px]">Released</th>
            <th className="text-left px-4 py-3">Downloads</th>
            <th className="text-left px-4 py-3">Release Notes</th>
            <th className="px-4 py-3 w-8" />
          </tr>
        </thead>
        <tbody>
          {releases.map((release, i) => {
            const isExpanded = expanded === release.version;
            return (
              <>
                <tr
                  key={release.version}
                  className="row-animate cursor-pointer border-b transition-colors duration-150"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: isExpanded ? "var(--bg-subtle)" : "transparent",
                    animationDelay: `${Math.min(i * 40, 400)}ms`,
                  }}
                  onClick={() => toggle(release.version)}
                  onMouseEnter={(e) => {
                    if (!isExpanded)
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "var(--row-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded)
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent";
                  }}
                >
                  {/* Version */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      {/* Flutter pill — links to per-release page */}
                      <a
                        href={`/release/${release.version}/`}
                        onClick={(e) => e.stopPropagation()}
                        title={`Flutter ${release.version} release details`}
                        className="w-fit"
                      >
                        <span
                          className="mono inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold w-fit transition-opacity duration-150 hover:opacity-75"
                          style={{
                            backgroundColor: "var(--accent-bg)",
                            color: "var(--accent)",
                            border: "1px solid var(--accent)",
                          }}
                        >
                          Flutter {release.version}
                        </span>
                      </a>
                      {/* Dart pill — no icon, just label */}
                      <span
                        className="mono inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit"
                        style={{
                          backgroundColor: "color-mix(in srgb, #6366f1 15%, transparent)",
                          color: "#818cf8",
                          border: "1px solid color-mix(in srgb, #6366f1 40%, transparent)",
                        }}
                      >
                        Dart {release.dartVersion}
                      </span>
                    </div>
                  </td>

                  {/* Channel */}
                  <td className="px-4 py-4">
                    <ChannelBadge channel={release.channel} />
                  </td>

                  {/* Release type */}
                  <td className="px-4 py-4">
                    <ReleaseTypeBadge type={release.releaseType} />
                  </td>

                  {/* Date */}
                  <td className="px-4 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {formatDate(release.releasedAt)}
                  </td>

                  {/* Downloads (compact) */}
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {release.downloads.macosArm64 && (
                        <a
                          href={release.downloads.macosArm64}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs transition-colors duration-150"
                          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        >
                          <Download size={10} /> mac arm64
                        </a>
                      )}
                      {release.downloads.windowsX64 && (
                        <a
                          href={release.downloads.windowsX64}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs transition-colors duration-150"
                          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        >
                          <Download size={10} /> win x64
                        </a>
                      )}
                      {release.downloads.linuxX64 && (
                        <a
                          href={release.downloads.linuxX64}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs transition-colors duration-150"
                          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        >
                          <Download size={10} /> linux x64
                        </a>
                      )}
                      {!release.downloads.macosArm64 && !release.downloads.windowsX64 && !release.downloads.linuxX64 && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </div>
                  </td>

                  {/* Release notes */}
                  <td className="px-4 py-4">
                    {release.releaseNotes.full ? (
                      <a
                        href={release.releaseNotes.full}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs transition-colors duration-150"
                        style={{ color: "var(--accent)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--accent)")}
                      >
                        <ExternalLink size={11} />
                        Full Notes
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>

                  {/* Expand toggle */}
                  <td className="px-4 py-4">
                    <span style={{ color: "var(--text-muted)" }}>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </td>
                </tr>
                {isExpanded && <ExpandedRow key={`${release.version}-expanded`} release={release} />}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
