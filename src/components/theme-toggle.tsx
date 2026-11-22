"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useLocale } from "@/components/locale-provider";

export function ThemeToggle() {
  const { preference, setPreference, resolvedTheme } = useTheme();
  const { t } = useLocale();
  const label = t("theme.toggle");

  function toggleTheme() {
    const currentTheme = preference === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : preference;
    setPreference(currentTheme === "dark" ? "light" : "dark");
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    >
      {resolvedTheme === "dark" ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
      <span className="sr-only">{label}</span>
    </button>
  );
}
