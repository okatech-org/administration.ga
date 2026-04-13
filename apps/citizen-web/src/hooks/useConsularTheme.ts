import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ConsularTheme = "default" | "homeomorphism";

const STORAGE_KEY = "consulat-myspace-theme";

interface ConsularThemeContextValue {
  consularTheme: ConsularTheme;
  setConsularTheme: (theme: ConsularTheme) => void;
}

export const ConsularThemeContext = createContext<ConsularThemeContextValue>({
  consularTheme: "default",
  setConsularTheme: () => {},
});

export function useConsularThemeState(): ConsularThemeContextValue {
  const [consularTheme, setThemeState] = useState<ConsularTheme>("default");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "homeomorphism") setThemeState("homeomorphism");
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, consularTheme);
    } catch {
      // Ignore localStorage errors
    }
  }, [consularTheme]);

  const setConsularTheme = useCallback((theme: ConsularTheme) => {
    setThemeState(theme);
  }, []);

  return { consularTheme, setConsularTheme };
}

export function useConsularTheme(): ConsularThemeContextValue {
  return useContext(ConsularThemeContext);
}
