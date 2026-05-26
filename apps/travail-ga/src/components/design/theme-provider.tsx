/**
 * ThemeProvider TRAVAIL.GA — gestion light / dark / system.
 *
 * Applique `data-theme` sur `<html>` selon le state.
 * Mode "system" écoute `prefers-color-scheme`.
 * Persiste dans `localStorage` (clé `travail-theme`).
 *
 * Source : design Claude `app.jsx` (theme logic).
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";

type Ctx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  cycleTheme: () => void;
};

const ThemeCtx = createContext<Ctx>({
  theme: "light",
  setTheme: () => {},
  cycleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeCtx);
}

const STORAGE_KEY = "travail-theme";

export function TravailThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  // Hydrate depuis localStorage au mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemeState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  // Applique data-theme sur <html>
  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => {
      const effective =
        theme === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : theme;
      document.documentElement.dataset.theme = effective;
    };
    apply();
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const cycleTheme = useCallback(() => {
    setThemeState((current) =>
      current === "light" ? "dark" : current === "dark" ? "system" : "light",
    );
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}
