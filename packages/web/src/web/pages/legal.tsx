import legal from "../data/legal.json";
import site from "../../../website.config.json";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { useDarkMode } from "../hooks/useDarkMode";
import { useMeta } from "../hooks/useMeta";

export default function LegalPage({ slug }: { slug: string }) {
  const page = legal.pages.find(page => page.slug === slug)!;
  const { dark, toggle } = useDarkMode();
  useMeta(page.title, page.description, `${site.url}/${page.slug}/`);
  return <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
    <Header dark={dark} onToggleDark={toggle} />
    <main className="flex-1 w-full max-w-[900px] mx-auto px-6 py-10" style={{ overflowWrap: "anywhere" }}>
      <h1 className="text-2xl font-bold mb-3">{page.title}</h1>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Last revised: <time dateTime={legal.updated}>{legal.updated}</time></p>
      <nav aria-label="Legal pages" className="flex flex-wrap gap-4 my-6 text-sm" style={{ color: "var(--accent)" }}>
        {legal.pages.map(item => <a key={item.slug} href={`/${item.slug}/`}>{item.title}</a>)}
        <a href={`mailto:${legal.contact}`}>{legal.contact}</a>
      </nav>
      {page.sections.map(section => <section key={section.id} id={section.id} className="py-6 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-base font-semibold mb-3">{section.title}</h2>
        {section.paragraphs.map(text => <p key={text} className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>{text}</p>)}
        {"links" in section && section.links?.map(link => <p key={link.href} className="text-sm mb-2" style={{ color: "var(--accent)" }}><a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a></p>)}
      </section>)}
    </main>
    <Footer />
  </div>;
}
