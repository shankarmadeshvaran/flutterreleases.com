import docs from "../data/api-docs.json";
import site from "../../../website.config.json";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { useDarkMode } from "../hooks/useDarkMode";
import { useMeta } from "../hooks/useMeta";

export default function ApiDocsPage() {
  const { dark, toggle } = useDarkMode();
  useMeta(docs.title, docs.description, `${site.url}/api-docs/`);
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      <Header dark={dark} onToggleDark={toggle} />
      <main className="flex-1 w-full max-w-[900px] mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-3">{docs.title}</h1>
        <p style={{ color: "var(--text-secondary)" }}>{docs.description}</p>
        <nav aria-label="API resources" className="flex flex-wrap gap-4 my-6 text-sm" style={{ color: "var(--accent)" }}>
          <a className="hover:underline" href="/releases.json">JSON dataset</a>
          <a className="hover:underline" href="/openapi.json">OpenAPI specification</a>
          <a className="hover:underline" href="/.well-known/api-catalog">API catalog</a>
        </nav>
        <pre className="p-4 rounded border overflow-x-auto text-sm" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-subtle)" }}><code>{`curl -H 'Accept: application/json' '${site.url}/releases.json'`}</code></pre>
        {docs.sections.map(section => (
          <section key={section.id} id={section.id} className="py-6 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-base font-semibold mb-3">{section.title}</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{section.text}</p>
            {section.id === "response" && (
              <dl className="mt-5 text-sm space-y-3">
                {docs.fields.map(field => <div key={field.name} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
                  <dt className="font-mono">{field.name}</dt>
                  <dd style={{ color: "var(--text-secondary)" }}>{field.description}</dd>
                </div>)}
              </dl>
            )}
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
