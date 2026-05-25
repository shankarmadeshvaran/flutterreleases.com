import { Search, X } from "lucide-react";
import type { Channel } from "../types/release";

const CHANNELS: { label: string; value: Channel | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Stable", value: "stable" },
  { label: "Beta", value: "beta" },
  { label: "Main", value: "main" },
  { label: "Hotfix", value: "hotfix" },
];

interface FilterBarProps {
  channel: Channel | "all";
  search: string;
  onChannelChange: (c: Channel | "all") => void;
  onSearchChange: (s: string) => void;
  total: number;
}

export function FilterBar({
  channel,
  search,
  onChannelChange,
  onSearchChange,
  total,
}: FilterBarProps) {
  return (
    <div
      className="sticky top-14 z-40 border-b"
      style={{
        backgroundColor: "var(--bg)",
        borderColor: "var(--border)",
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Channel tabs */}
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{ backgroundColor: "var(--bg-subtle)" }}
        >
          {CHANNELS.map((c) => (
            <button
              key={c.value}
              onClick={() => onChannelChange(c.value)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-150"
              style={
                channel === c.value
                  ? {
                      backgroundColor: "var(--accent)",
                      color: "#fff",
                    }
                  : {
                      backgroundColor: "transparent",
                      color: "var(--text-secondary)",
                    }
              }
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search + count */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div
            className="relative flex items-center w-full sm:w-64"
          >
            <Search
              size={14}
              className="absolute left-3"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search version, dart, channel…"
              className="w-full pl-8 pr-8 py-1.5 rounded-md text-sm border outline-none transition-colors duration-150"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--accent)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--border)")
              }
            />
            {search && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={13} />
              </button>
            )}
          </div>
          <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
            {total} release{total !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
