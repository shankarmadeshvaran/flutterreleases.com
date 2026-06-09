import { useEffect } from "react";

/**
 * Dynamically sets document.title and meta description.
 * Called from pages with context-aware strings (e.g. active channel filter).
 */
export function useMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (description) {
      const el = document.querySelector(
        'meta[name="description"]'
      ) as HTMLMetaElement | null;
      if (el) el.content = description;
    }
  }, [title, description]);
}
