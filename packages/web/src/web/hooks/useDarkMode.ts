import { useState, useEffect, useRef } from "react";

function savedTheme() {
  try {
    const saved = window.localStorage.getItem("theme");
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

export function useDarkMode() {
  const manuallySelected = useRef(false);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = savedTheme();
    manuallySelected.current = saved !== null;
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!manuallySelected.current) setDark(media.matches);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    const next = !dark;
    manuallySelected.current = true;
    setDark(next);
    try {
      window.localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // A manual choice still works when browser storage is unavailable.
    }
  };

  return { dark, toggle };
}
