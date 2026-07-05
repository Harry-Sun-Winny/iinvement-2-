"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type AccentTheme = "emerald" | "blue" | "purple" | "pink" | "orange" | "gold" | "cyan" | "red" | "indigo" | "white";
export type TextTheme = "white" | "light-gray" | "silver" | "blue" | "emerald" | "purple" | "pink" | "orange" | "gold" | "black";
export type BackgroundTheme = "dark" | "bg-1" | "bg-2" | "bg-3" | "bg-4" | "bg-5" | "sakura-castle" | "sakura-garden" | "sakura-pagoda" | "sakura-river";

export interface ThemeContract {
  accentHex: string;
  textHex: string;
  panelHex: string;
  cardHex: string;
  tableHex: string;
  borderHex: string;
}

export interface ThemeSettings {
  accent: AccentTheme;
  text: TextTheme;
  background: BackgroundTheme;
  sidebarCollapsed: boolean;
  sakuraEnabled: boolean;
  snowEnabled: boolean;
  density: number; // 1 to 100
  speed: number;   // 0.1 to 3
  reducedMotion: boolean;
  panelColor: string;
  cardColor: string;
  tableColor: string;
  panelOpacity: number;
  version: string;
}

const ACCENT_COLORS: Record<AccentTheme, string> = {
  emerald: "#10B981",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  pink: "#EC4899",
  orange: "#F97316",
  gold: "#F59E0B",
  cyan: "#06B6D4",
  red: "#EF4444",
  indigo: "#6366F1",
  white: "#F8FAFC",
};

const TEXT_COLORS: Record<TextTheme, string> = {
  white: "#FFFFFF",
  "light-gray": "#F1F5F9",
  silver: "#CBD5E1",
  blue: "#60A5FA",
  emerald: "#34D399",
  purple: "#A78BFA",
  pink: "#F472B6",
  orange: "#FB923C",
  gold: "#FBBF24",
  black: "#0F172A",
};

const BACKGROUND_ASSETS: Record<BackgroundTheme, string> = {
  dark: "/backgrounds/background-dark.webp",
  "bg-1": "/backgrounds/background-1.webp",
  "bg-2": "/backgrounds/background-2.webp",
  "bg-3": "/backgrounds/background-3.webp",
  "bg-4": "/backgrounds/background-4.webp",
  "bg-5": "/backgrounds/background-5.webp",
  "sakura-castle": "/bg-sakura-castle.jpg",
  "sakura-garden": "/bg-sakura-garden.jpg",
  "sakura-pagoda": "/bg-sakura-pagoda.jpg",
  "sakura-river": "/bg-sakura-river.jpg",
};

// Auto calculate image brightness and contrast text
const getAutoTextColor = (bg: BackgroundTheme): string => {
  // Image 1-5 have lighter colors or cherry blossoms, we make text highly readable
  if (bg === "dark") return "#FFFFFF";
  return "#F8FAFC"; // Lighter contrast colors
};

interface ThemeContextProps {
  settings: ThemeSettings;
  updateSettings: (updater: Partial<ThemeSettings> | ((prev: ThemeSettings) => ThemeSettings)) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const DEFAULT_SETTINGS: ThemeSettings = {
  accent: "purple",
  text: "silver",
  background: "dark",
  sidebarCollapsed: false,
  sakuraEnabled: true,
  snowEnabled: true,
  density: 40,
  speed: 1,
  reducedMotion: false,
  panelColor: "#16131D",
  cardColor: "#1C1825",
  tableColor: "#1A1622",
  panelOpacity: 72,
  version: "theme-v2",
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load setting schema theme-v2
    const saved = localStorage.getItem("theme-settings-v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version === "theme-v2") {
          setSettings(parsed);
        } else {
          // Migrate old setting safely
          setSettings({ ...DEFAULT_SETTINGS, ...parsed, version: "theme-v2" });
        }
      } catch (e) {
        console.error("Failed to parse theme settings, fallback to default", e);
      }
    }
    setMounted(true);
  }, []);

  const updateSettings = (
    updater: Partial<ThemeSettings> | ((prev: ThemeSettings) => ThemeSettings)
  ) => {
    setSettings((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      localStorage.setItem("theme-settings-v2", JSON.stringify(next));
      return next;
    });
  };

  // Dynamically update CSS Variables directly to prevent app re-renders
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Apply strict non-transparent background variables
    root.style.setProperty("--panel", settings.panelColor || "#16131D");
    root.style.setProperty("--card", settings.cardColor || "#1C1825");
    root.style.setProperty("--table", settings.tableColor || "#1A1622");
    root.style.setProperty("--panel-opacity", String((settings.panelOpacity ?? 72) / 100));
    root.style.setProperty("--border", "rgba(255, 255, 255, 0.08)");

    // Accent
    const accentHex = ACCENT_COLORS[settings.accent] || settings.accent;
    root.style.setProperty("--accent", accentHex);

    // Text
    const textHex = TEXT_COLORS[settings.text] || settings.text;
    root.style.setProperty("--text-color", textHex);

    // Background Image mapping
    const bgUrl = BACKGROUND_ASSETS[settings.background];
    if (bgUrl && settings.background !== "dark") {
      root.style.setProperty("--bg-image", `url('${bgUrl}')`);
      root.classList.add("has-bg-image");
    } else {
      root.style.removeProperty("--bg-image");
      root.classList.remove("has-bg-image");
    }

    // Auto calculate auto text/contrast shifts
    const contrastText = getAutoTextColor(settings.background);
    root.style.setProperty("--auto-text", contrastText);

    // Add CSS classes for active status
    if (settings.reducedMotion) {
      root.classList.add("reduced-motion");
    } else {
      root.classList.remove("reduced-motion");
    }
  }, [settings, mounted]);

  return (
    <ThemeContext.Provider value={{ settings, updateSettings }}>
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
