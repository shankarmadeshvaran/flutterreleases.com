const styles: Record<string, string> = {
  stable:
    "bg-[var(--stable-bg)] text-[var(--stable-text)]",
  beta:
    "bg-[var(--beta-bg)] text-[var(--beta-text)]",
  main:
    "bg-[var(--main-bg)] text-[var(--main-text)]",
  dev:
    "bg-[var(--main-bg)] text-[var(--main-text)]",
  hotfix:
    "bg-[var(--hotfix-bg)] text-[var(--hotfix-text)]",
};

export function ChannelBadge({ channel }: { channel: string }) {
  const cls = styles[channel] ?? "bg-[var(--bg-subtle)] text-[var(--text-secondary)]";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {channel}
    </span>
  );
}

export function ReleaseTypeBadge({ type }: { type: string }) {
  const cls =
    type.toLowerCase() === "hotfix"
      ? "bg-[var(--hotfix-bg)] text-[var(--hotfix-text)]"
      : type.toLowerCase() === "beta"
      ? "bg-[var(--beta-bg)] text-[var(--beta-text)]"
      : "bg-[var(--bg-subtle)] text-[var(--text-secondary)]";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {type}
    </span>
  );
}
