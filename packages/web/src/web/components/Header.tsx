import { Moon, Sun, Heart } from "lucide-react";
import { trackEvent } from "../lib/analytics";

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
      <div className="max-w-[1200px] mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 md:h-14 md:flex-nowrap md:py-0">
        {/* Flutter brand logo — light/dark variants from official assets */}
        <a
          href="/"
          className="flex items-center no-underline"
          onClick={() =>
            trackEvent("Navigation Click", {
              label: "Brand",
              href: "/",
              location: "header",
            })
          }
        >
          {dark ? (
            <img
              src="/lockup_flutter_horizontal_wht.svg"
              alt="Flutter"
              height={28}
              width={120}
              style={{ height: 28, width: "auto" }}
            />
          ) : (
            <img
              src="/lockup_flutter_horizontal.svg"
              alt="Flutter"
              height={28}
              width={120}
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
        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto md:order-none md:w-auto md:overflow-visible">
          {[
            { label: "Releases", href: "/" },
            { label: "Flutter Versions", href: "/flutter-versions/" },
            { label: "Compatibility Tool", href: "/tools/flutter-version-checker/" },
            { label: "Blog", href: "/blog/" },
            { label: "GitHub", href: "https://github.com/shankarmadeshvaran/flutterreleases.com", external: true },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              onClick={() =>
                trackEvent("Navigation Click", {
                  label: item.label,
                  href: item.href,
                  external: Boolean(item.external),
                  location: "header",
                })
              }
              className="shrink-0 px-3 py-1.5 rounded-md text-sm transition-colors duration-150"
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
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href="https://buymeacoffee.com/shankarmadeshvaran"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent("Outbound Click", {
                label: "Support",
                href: "https://buymeacoffee.com/shankarmadeshvaran",
                location: "header",
              })
            }
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
            Support
          </a>
          <button
            onClick={() => {
              trackEvent("Theme Toggle", { next_theme: dark ? "light" : "dark" });
              onToggleDark();
            }}
            className="w-9 h-9 flex items-center justify-center rounded-md border transition-colors duration-150"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
              backgroundColor: "transparent",
            }}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </header>
  );
}
