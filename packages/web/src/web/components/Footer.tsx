export function Footer({ updatedAt }: { updatedAt?: string }) {
  return (
    <footer
      className="border-t mt-auto"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-surface)",
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Made with ❤️ by{" "}
            <a
              href="https://x.com/devinmaking"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-150"
              style={{ color: "var(--accent)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--accent)")}
            >
              @devinmaking
            </a>
            {" "}— Not an official Google website. A free resource for the Flutter community.
          </p>
          {updatedAt && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Last updated: {updatedAt}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
          {/* Twitter/X */}
          <a
            href="https://x.com/devinmaking"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            title="Follow on X (Twitter) for updates and issues"
          >
            {/* X logo */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            @devinmaking
          </a>
          <span>·</span>
          <a
            href="/releases.json"
            target="_blank"
            className="transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            JSON API
          </a>
          <span>·</span>
          <a
            href="/feed.xml"
            target="_blank"
            className="transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            RSS
          </a>
          <span>·</span>
          <a
            href="https://github.com/shankarmadeshvaran/flutterreleases.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            GitHub
          </a>
          <span>·</span>
          <a
            href="https://buymeacoffee.com/shankarmadeshvaran"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-150"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            ☕ Donate
          </a>
        </div>
      </div>
    </footer>
  );
}
