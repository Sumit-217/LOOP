"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("loop_theme") as Theme | null;
      if (savedTheme && (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system")) {
        setThemeState(savedTheme);
      }
    } catch {
      // Ignore localStorage read errors in restricted contexts
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    let effectiveTheme: "light" | "dark" = "light";

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      effectiveTheme = media.matches ? "dark" : "light";

      const listener = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? "dark" : "light";
        setResolvedTheme(newTheme);
        if (newTheme === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      };

      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    } else {
      effectiveTheme = theme;
    }

    setResolvedTheme(effectiveTheme);
    if (effectiveTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    try {
      localStorage.setItem("loop_theme", theme);
    } catch {
      // Ignore localStorage write errors
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
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
