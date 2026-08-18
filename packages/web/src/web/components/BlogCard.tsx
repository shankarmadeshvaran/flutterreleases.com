import { ArrowUpRight } from "lucide-react";
import { trackEvent } from "../lib/analytics";

export interface BlogPost {
  title: string;
  description: string;
  image?: string;
  href: string;
  category: string;
  readingTime?: string;
}

interface BlogCardProps {
  post: BlogPost;
  location: string;
}

export function BlogCard({ post, location }: BlogCardProps) {
  return (
    <a
      href={post.href}
      onClick={() =>
        trackEvent("Blog Card Click", {
          title: post.title,
          href: post.href,
          location,
        })
      }
      className="group block overflow-hidden rounded-lg border transition-colors duration-150"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg-surface)",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      {post.image ? (
        <div
          className="aspect-[16/9] border-b"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-subtle)" }}
        >
          <img
            src={post.image}
            alt=""
            loading="lazy"
            width={720}
            height={405}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
          {post.readingTime ? `${post.category} · ${post.readingTime}` : post.category}
        </p>
        <h3 className="mb-2 text-base font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
          {post.title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {post.description}
        </p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--accent)" }}>
          Open resource <ArrowUpRight size={14} />
        </span>
      </div>
    </a>
  );
}
