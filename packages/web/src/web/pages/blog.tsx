import blogPosts from "../data/blog-posts.json";
import { BlogCard, type BlogPost } from "../components/BlogCard";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { useDarkMode } from "../hooks/useDarkMode";
import { useMeta } from "../hooks/useMeta";

const posts = blogPosts as BlogPost[];
const TITLE = "Flutter Releases Blog | Flutter Versions, Dart Compatibility & SDK Guides";
const DESCRIPTION =
  "Read Flutter release guides for latest Flutter versions, Dart SDK compatibility, release notes, SDK downloads, and version history.";

export default function BlogPage() {
  const { dark, toggle } = useDarkMode();
  useMeta(TITLE, DESCRIPTION, "https://flutterreleases.com/blog/");

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
              Flutter Releases Blog
            </p>
            <h1 className="mb-2 text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Flutter release guides
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Practical notes for finding the latest Flutter SDK, checking Flutter and Dart compatibility,
              and locating release notes or downloads from the FlutterReleases dataset.
            </p>
          </div>
        </section>

        <section className="max-w-[1200px] mx-auto w-full px-6 py-8">
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {posts.map((post) => (
                <BlogCard key={post.title} post={post} location="blog_index" />
              ))}
            </div>
          ) : (
            <div
              className="rounded-lg border p-6"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-surface)" }}
            >
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Articles are coming soon
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Add your article metadata and links to publish posts in this grid.
              </p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
