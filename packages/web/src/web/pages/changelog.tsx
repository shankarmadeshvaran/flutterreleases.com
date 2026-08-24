import changelogItems from "../data/changelog.json";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { useDarkMode } from "../hooks/useDarkMode";
import { useMeta } from "../hooks/useMeta";

interface ChangelogItem {
  date: string;
  title: string;
  summary: string;
}

const items = changelogItems as ChangelogItem[];
const TITLE = "FlutterReleases Changelog";
const DESCRIPTION = "Site updates for FlutterReleases.com.";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ChangelogPage() {
  const { dark, toggle } = useDarkMode();
  useMeta(TITLE, DESCRIPTION, "https://flutterreleases.com/changelog/");

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
              Site updates
            </p>
            <h1 className="mb-2 text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              FlutterReleases changelog
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Product updates for FlutterReleases.com. Flutter SDK release history stays on the Flutter Versions page.
            </p>
          </div>
        </section>

        <section className="max-w-[900px] mx-auto w-full px-6 py-8">
          <ol className="m-0 list-none space-y-4 p-0">
            {items.map((item) => (
              <li
                key={`${item.date}-${item.title}`}
                className="rounded-lg border p-5"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-surface)" }}
              >
                <time className="text-xs font-medium uppercase tracking-widest" dateTime={item.date} style={{ color: "var(--text-muted)" }}>
                  {formatDate(item.date)}
                </time>
                <h2 className="mt-2 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {item.summary}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <Footer />
    </div>
  );
}
