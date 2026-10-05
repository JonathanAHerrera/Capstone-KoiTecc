"use client";

import { useSyncExternalStore } from "react";
import { Check, Moon, Sun, type LucideIcon } from "lucide-react";

type Theme = "light" | "dark";
const THEME_STORAGE_KEY = "cmmc-ready-theme";
const THEME_CHANGE_EVENT = "cmmc-ready-theme-change";

function readTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

function subscribeToTheme(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

function applyTheme(theme: Theme): void {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#F8FAFC" : "#0B0F19");
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

const THEME_OPTIONS: { value: Theme; label: string; description: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", description: "Bright, high-contrast workspace", icon: Sun },
  { value: "dark", label: "Dark", description: "Low-glare command center", icon: Moon },
];

export function ThemeSetting() {
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, () => "dark");
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">Color theme</legend>
      <p className="mt-1 text-sm text-text-secondary">Choose how CMMC Ready looks on this device.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {THEME_OPTIONS.map((option) => {
          const selected = theme === option.value;
          const Icon = option.icon;
          return (
            <button key={option.value} type="button" aria-pressed={selected} onClick={() => applyTheme(option.value)} className={`focus-outline relative flex min-h-32 flex-col items-start rounded-card border p-4 text-left transition-colors ${selected ? "border-primary-text bg-primary-pale" : "border-border bg-surface hover:bg-surface-alt"}`}>
              <span className={`flex size-9 items-center justify-center rounded-lg ${selected ? "bg-primary text-canvas" : "bg-surface-alt text-text-secondary"}`}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="mt-4 text-sm font-semibold text-ink">{option.label}</span>
              <span className="mt-1 text-xs leading-snug text-text-secondary">{option.description}</span>
              {selected ? <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-canvas" aria-hidden><Check className="size-3.5" strokeWidth={3} /></span> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
