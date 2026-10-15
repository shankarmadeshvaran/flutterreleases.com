import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import content from "../data/not-found.json";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { useDarkMode } from "../hooks/useDarkMode";

export default function NotFoundPage() {
  const { dark, toggle } = useDarkMode();
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Page not found | FlutterReleases";
    const existing = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const robots = existing || document.createElement("meta");
    const previousContent = robots.content;
    robots.name = "robots";
    robots.content = "noindex";
    if (!existing) document.head.appendChild(robots);
    return () => {
      document.title = previousTitle;
      if (existing) robots.content = previousContent;
      else robots.remove();
    };
  }, []);
  return <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
    <Header dark={dark} onToggleDark={toggle} />
    <main className="w-full max-w-[900px] mx-auto px-6 py-12 flex-1">
      <p className="text-sm font-mono mb-3" style={{ color: "var(--text-secondary)" }}>404</p>
      <h1 className="text-2xl font-bold mb-3">{content.title}</h1>
      <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--text-secondary)" }}>{content.description}</p>
      <nav aria-label="Available pages" className="max-w-lg">
        {content.links.map(link => <a key={link.href} href={link.href} className="flex items-center justify-between gap-4 py-4 border-b text-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-4" style={{ borderColor: "var(--border)", color: "var(--accent)" }}>
          {link.label}<ArrowRight size={16} className="shrink-0" aria-hidden="true" />
        </a>)}
      </nav>
    </main>
    <Footer />
  </div>;
}
