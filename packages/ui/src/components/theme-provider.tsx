"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  /** Theme used on the server and before any user/system preference is known. */
  defaultTheme?: Theme;
  /** localStorage key for persisting the user's choice. */
  storageKey?: string;
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/**
 * Presentational theme state. UI state only — it holds no app data and behaves
 * identically across apps.
 *
 * The initial class is applied by {@link themeInitScript} before hydration to
 * avoid a flash, so state is read lazily from the DOM here rather than being
 * set from inside an effect (which would trigger a cascading render).
 */
export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === "undefined") return defaultTheme;
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  // Subscribe to OS-level changes; only follow them when the user hasn't chosen.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      if (window.localStorage.getItem(storageKey)) return;
      const next: Theme = event.matches ? "dark" : "light";
      applyTheme(next);
      setThemeState(next);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [storageKey]);

  const setTheme = useCallback(
    (next: Theme) => {
      applyTheme(next);
      window.localStorage.setItem(storageKey, next);
      setThemeState(next);
    },
    [storageKey],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
