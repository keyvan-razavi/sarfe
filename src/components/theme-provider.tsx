"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "system" | "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  resolvedTheme: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "sarfe-theme";
const COOKIE_KEY = "sarfe-theme";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function persistPreference(preference: ThemePreference) {
  try {
    window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // The cookie still keeps the choice across refreshes if local storage is unavailable.
  }
  document.cookie = `${COOKIE_KEY}=${preference}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({
  children,
  initialPreference,
  hasPersistedPreference,
}: {
  children: ReactNode;
  initialPreference: ThemePreference;
  hasPersistedPreference: boolean;
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const preferenceRef = useRef<ThemePreference>(initialPreference);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    let stored: string | null = null;
    if (!hasPersistedPreference) {
      try {
        stored = window.localStorage.getItem(STORAGE_KEY);
      } catch {
        // Keep using the server-provided preference when browser storage is unavailable.
      }
    }
    const nextPreference =
      !hasPersistedPreference && isThemePreference(stored)
        ? stored
        : initialPreference;
    preferenceRef.current = nextPreference;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferenceState(nextPreference);
    if (!hasPersistedPreference) persistPreference(nextPreference);

    const apply = () => {
      const resolved = resolveTheme(preferenceRef.current);
      setResolvedTheme(resolved);
      document.documentElement.dataset.theme = preferenceRef.current;
      document.documentElement.style.colorScheme = resolved;
    };
    apply();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (preferenceRef.current === "system") apply();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== STORAGE_KEY) return;
      const next = isThemePreference(event.newValue) ? event.newValue : "system";
      preferenceRef.current = next;
      setPreferenceState(next);
      document.cookie = `${COOKIE_KEY}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
      apply();
    };
    media.addEventListener("change", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [hasPersistedPreference, initialPreference]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    preferenceRef.current = nextPreference;
    setPreferenceState(nextPreference);
    persistPreference(nextPreference);
    const resolved = resolveTheme(nextPreference);
    setResolvedTheme(resolved);
    document.documentElement.dataset.theme = nextPreference;
    document.documentElement.style.colorScheme = resolved;
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference, resolvedTheme }),
    [preference, resolvedTheme, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
