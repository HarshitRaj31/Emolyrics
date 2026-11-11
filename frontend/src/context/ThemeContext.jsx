import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext();
const STORAGE_KEY = "emolyrics_theme";

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  } catch {
    // storage/matchMedia unavailable
  }
  return "dark";
}

function applyThemeToDocument(nextTheme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(nextTheme);
  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  // Sync DOM immediately on state change
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  // Respect OS color-scheme changes while no manual preference is saved, and sync across tabs
  useEffect(() => {
    const mediaQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;

    const handleSystemChange = (e) => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== "light" && saved !== "dark") {
          setThemeState(e.matches ? "light" : "dark");
        }
      } catch {
        // ignore
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        setThemeState(e.newValue);
      }
    };

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemChange);
    }
    window.addEventListener("storage", handleStorageChange);

    return () => {
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener("change", handleSystemChange);
      }
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const setTheme = useCallback((nextOrUpdater) => {
    setThemeState((prev) => {
      const next = typeof nextOrUpdater === "function" ? nextOrUpdater(prev) : nextOrUpdater;
      const resolved = next === "light" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, resolved);
      } catch {
        // storage unavailable
      }
      return resolved;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, [setTheme]);

  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
