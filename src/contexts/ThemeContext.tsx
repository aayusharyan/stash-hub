"use client";

// Manages theme mode (light / dark / system) and accent colour across the app.
// Persists both preferences to localStorage so they survive page reloads and hot-reloads.
// Applies the resolved theme as a class on <html> and writes accent CSS variables directly
// onto :root so every component picks them up automatically via var(--primary).

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type AccentKey = "orange" | "blue" | "red" | "purple" | "green" | "teal";

export interface AccentOption {
  key: AccentKey;
  label: string;
  color: string;
  /** Foreground colour that looks readable on top of this accent (black or white). */
  fg: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { key: "orange", label: "Orange", color: "#ff9000", fg: "#000" },
  { key: "blue",   label: "Blue",   color: "#0d6efd", fg: "#fff" },
  { key: "red",    label: "Red",    color: "#e50914", fg: "#fff" },
  { key: "purple", label: "Purple", color: "#9147ff", fg: "#fff" },
  { key: "green",  label: "Green",  color: "#1db954", fg: "#000" },
  { key: "teal",   label: "Teal",   color: "#00b4b4", fg: "#000" },
];

const STORAGE_THEME  = "stash-hub-theme";
const STORAGE_ACCENT = "stash-hub-accent";

interface ThemeContextValue {
  theme: ThemeMode;
  accent: AccentKey;
  /** The actual applied mode after resolving "system". */
  resolvedTheme: "light" | "dark";
  setTheme: (t: ThemeMode) => void;
  setAccent: (a: AccentKey) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  accent: "orange",
  resolvedTheme: "dark",
  setTheme: () => {},
  setAccent: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Adds the resolved theme class to <html> and removes the other.
function applyThemeClass(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
}

// Writes all accent-related CSS variables onto :root so every component updates instantly.
function applyAccentVars(color: string) {
  const root = document.documentElement;
  root.style.setProperty("--primary", color);
  root.style.setProperty("--primary-dim", color + "33");
  root.style.setProperty("--ring", color);
  root.style.setProperty("--sidebar-primary", color);
  root.style.setProperty("--sidebar-ring", color);
  root.style.setProperty("--chart-1", color);
}

// Updates the browser tab favicon to match both accent and resolved theme.
// Browsers don't re-fetch a favicon when href is mutated in-place, so we remove
// the existing <link> and append a fresh one - this forces an immediate re-fetch.
function syncFavicon(accentKey: AccentKey, resolvedTheme: "light" | "dark") {
  const existing = document.getElementById("app-favicon");
  if (existing) existing.remove();

  const link = document.createElement("link");
  link.id    = "app-favicon";
  link.rel   = "icon";
  link.type  = "image/png";
  link.sizes = "32x32";
  link.href  = `/api/favicon?accent=${accentKey}&theme=${resolvedTheme}`;
  document.head.appendChild(link);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState]           = useState<ThemeMode>("system");
  const [accent, setAccentState]         = useState<AccentKey>("orange");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  // Reads saved preferences from localStorage on first client render.
  useEffect(() => {
    const savedTheme  = (localStorage.getItem(STORAGE_THEME)  as ThemeMode | null) ?? "system";
    const savedAccent = (localStorage.getItem(STORAGE_ACCENT) as AccentKey | null) ?? "orange";

    setThemeState(savedTheme);
    setAccentState(savedAccent);

    const resolved = savedTheme === "system" ? getSystemTheme() : savedTheme;
    setResolvedTheme(resolved);
    applyThemeClass(resolved);

    const accentColor = ACCENT_OPTIONS.find(a => a.key === savedAccent)?.color ?? "#ff9000";
    applyAccentVars(accentColor);
    syncFavicon(savedAccent, resolved);
  }, []);

  // When in system mode, re-apply the class whenever the OS preference changes.
  // accent is in deps so the handler closure always has the latest accent for favicon sync.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = mq.matches ? "dark" : "light";
      setResolvedTheme(resolved);
      applyThemeClass(resolved);
      syncFavicon(accent, resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, accent]);

  function setTheme(t: ThemeMode) {
    setThemeState(t);
    localStorage.setItem(STORAGE_THEME, t);
    const resolved = t === "system" ? getSystemTheme() : t;
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
    syncFavicon(accent, resolved);
  }

  function setAccent(a: AccentKey) {
    setAccentState(a);
    localStorage.setItem(STORAGE_ACCENT, a);
    const accentColor = ACCENT_OPTIONS.find(opt => opt.key === a)?.color ?? "#ff9000";
    applyAccentVars(accentColor);
    syncFavicon(a, resolvedTheme);
  }

  return (
    <ThemeContext.Provider value={{ theme, accent, resolvedTheme, setTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}
