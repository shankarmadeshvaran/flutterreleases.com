type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

type GtagCommand = "config" | "event" | "js";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (command: GtagCommand, target: string | Date, params?: Record<string, unknown>) => void;
  }
}

function cleanProps(props: AnalyticsProps = {}) {
  return Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function eventName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function trackEvent(name: string, props?: AnalyticsProps) {
  if (typeof window === "undefined") return;
  const normalizedName = eventName(name);
  if (!normalizedName) return;
  try {
    window.gtag?.("event", normalizedName, cleanProps(props));
  } catch {
    // Analytics must never affect product behavior.
  }
}

export function trackView(path: string, props?: AnalyticsProps) {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", "page_view", {
      page_path: path,
      ...cleanProps(props),
    });
  } catch {
    // Analytics must never affect product behavior.
  }
}
