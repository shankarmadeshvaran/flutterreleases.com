import faqItems from "../data/faq.json";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { useDarkMode } from "../hooks/useDarkMode";
import { useMeta } from "../hooks/useMeta";

interface FaqLink {
  label: string;
  href: string;
}

interface FaqItem {
  question: string;
  answer: string;
  links?: FaqLink[];
}

const items = faqItems as FaqItem[];
const TITLE = "FlutterReleases FAQ | Flutter Versions, Dart Compatibility & Downloads";
const DESCRIPTION =
  "Answers about Flutter release data, latest stable versions, Dart SDK compatibility, downloads, release notes, and how FlutterReleases updates automatically.";

function isExternal(href: string) {
  return /^https?:\/\//.test(href);
}

export default function FaqPage() {
  const { dark, toggle } = useDarkMode();
  useMeta(TITLE, DESCRIPTION, "https://flutterreleases.com/faq/");

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      <Header dark={dark} onToggleDark={toggle} />
      <main className="flex-1">
        <section
          className="border-b"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-surface)" }}
        >
          <div className="max-w-[1200px] mx-auto px-6 py-10">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest" style={{ color: "var(--accent)" }}>
              Help
            </p>
            <h1 className="mb-2 text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              FlutterReleases FAQ
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Quick answers about Flutter versions, Dart compatibility, release data, downloads, and how this site stays updated.
            </p>
          </div>
        </section>

        <section className="max-w-[1200px] mx-auto w-full px-6 py-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.question}
                className="rounded-lg border p-5"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-surface)" }}
              >
                <h2 className="text-base font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
                  {item.question}
                </h2>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {item.answer}
                </p>
                {item.links?.length ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {item.links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target={isExternal(link.href) ? "_blank" : undefined}
                        rel={isExternal(link.href) ? "noopener noreferrer" : undefined}
                        className="text-sm font-medium"
                        style={{ color: "var(--accent)" }}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
