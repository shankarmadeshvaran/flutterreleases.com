import { Moon, Sun, Heart } from "lucide-react";

interface HeaderProps {
  dark: boolean;
  onToggleDark: () => void;
}

export function Header({ dark, onToggleDark }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
        {/* Flutter brand logo — light/dark variants from official assets */}
        <a href="/" className="flex items-center no-underline">
          {dark ? (
            <img
              src="/lockup_flutter_horizontal_wht.svg"
              alt="Flutter"
              height={28}
              style={{ height: 28, width: "auto" }}
            />
          ) : (
            <img
              src="/lockup_flutter_horizontal.svg"
              alt="Flutter"
              height={28}
              style={{ height: 28, width: "auto" }}
            />
          )}
          <span
            className="ml-2 font-semibold text-base tracking-tight hidden sm:inline"
            style={{ color: "var(--text-secondary)" }}
          >
            Releases
          </span>
        </a>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: "Releases", href: "/" },
            { label: "JSON API", href: "/releases.json", external: true },
            { label: "RSS", href: "/feed.xml", external: true },
            { label: "GitHub", href: "https://github.com/shankarmadeshvaran/flutterreleases.com", external: true },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className="px-3 py-1.5 rounded-md text-sm transition-colors duration-150"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-primary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-secondary)")
              }
            >
              {item.label}
            </a>
          ))}
          {/* Contact — opens X profile */}
          <a
            href="https://x.com/devinmaking"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-md text-sm transition-colors duration-150 inline-flex items-center gap-1.5"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Contact
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href="https://buymeacoffee.com/shankarmadeshvaran"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors duration-150"
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
            <Heart size={13} />
            Donate
          </a>
          <button
            onClick={onToggleDark}
            className="w-9 h-9 flex items-center justify-center rounded-md border transition-colors duration-150"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
              backgroundColor: "transparent",
            }}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </header>
  );
}
