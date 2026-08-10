import { useEffect } from "react";

/**
 * Dynamically sets document.title and meta description.
 * Called from pages with context-aware strings (e.g. active channel filter).
 */
export function useMeta(title: string, description?: string, canonical?: string) {
  useEffect(() => {
    document.title = title;
    if (description) {
      const el = document.querySelector(
        'meta[name="description"]'
      ) as HTMLMetaElement | null;
      if (el) el.content = description;
    }
    if (canonical) {
      const el = document.querySelector(
        'link[rel="canonical"]'
      ) as HTMLLinkElement | null;
      if (el) el.href = canonical;
    }
  }, [title, description, canonical]);
}
