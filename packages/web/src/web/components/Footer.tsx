import { trackEvent } from "../lib/analytics";

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Releases", href: "/" },
      { label: "Flutter Versions", href: "/flutter-versions/" },
      { label: "Compatibility Checker", href: "/tools/flutter-version-checker/" },
      { label: "Blog", href: "/blog/" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "JSON API", href: "/releases.json", external: true },
      { label: "RSS Feed", href: "/feed.xml", external: true },
      { label: "FAQ", href: "/faq/" },
      { label: "Sitemap", href: "/sitemap.xml", external: true },
      { label: "Official Flutter Archive", href: "https://docs.flutter.dev/release/archive", external: true },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "GitHub", href: "https://github.com/shankarmadeshvaran/flutterreleases.com", external: true },
      { label: "X Contact", href: "https://x.com/devinmaking", external: true },
      { label: "Support", href: "https://buymeacoffee.com/shankarmadeshvaran", external: true },
    ],
  },
];

export function Footer() {
  const trackFooterLink = (
    label: string,
    href: string,
    external = false,
  ) => {
    trackEvent(external ? "Outbound Click" : "Navigation Click", {
      label,
      href,
      external,
      location: "footer",
    });
  };

  return (
    <footer
      className="border-t mt-auto"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-surface)",
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <a
              href="/"
              onClick={() => trackFooterLink("Footer Brand", "/")}
              className="inline-flex items-center text-sm font-semibold no-underline transition-colors duration-150"
              style={{ color: "var(--text-primary)" }}
            >
              Flutter Releases
            </a>
            <p className="mt-3 max-w-xs text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Flutter SDK versions, Dart compatibility, downloads, and release notes in one place.
            </p>
            <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Not an official Google website. Built for the Flutter community.
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--accent)" }}>
                {group.title}
              </h2>
              <ul className="m-0 list-none space-y-2 p-0">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      onClick={() => trackFooterLink(link.label, link.href, Boolean(link.external))}
                      className="text-sm transition-colors duration-150"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-8 flex flex-col gap-2 border-t pt-5 text-xs sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          <p>
            Made by{" "}
            <a
              href="https://x.com/devinmaking"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackFooterLink("Footer Author", "https://x.com/devinmaking", true)}
              className="transition-colors duration-150"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              Shankar Madeshvaran
            </a>
            .
          </p>
          <p>Updated automatically from Flutter release data.</p>
        </div>
      </div>
    </footer>
  );
}
