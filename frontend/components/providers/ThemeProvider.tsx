"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { MARKET_THEMES } from "@/app/market/themes/marketThemes";

export type AccentTheme = "emerald" | "blue" | "purple" | "pink" | "orange" | "gold" | "cyan" | "red" | "indigo" | "white";
export type TextTheme = "white" | "light-gray" | "silver" | "blue" | "emerald" | "purple" | "pink" | "orange" | "gold" | "black";
export type BackgroundTheme = 
  | "dark" 
  | "animated-gradient"
  | "bg-1" 
  | "bg-2" 
  | "bg-3" 
  | "bg-4" 
  | "bg-5" 
  | "sakura-castle" 
  | "sakura-garden" 
  | "sakura-pagoda" 
  | "sakura-river"
  | "tokyo-cherry-1"
  | "tokyo-cherry-2"
  | "tokyo-snow-1"
  | "tokyo-snow-2"
  | "tokyo-snow-3"
  | "tokyo-snow-4"
  | "tokyo-snow-5"
  | "tokyo-snow-vector"
  | "japan-scene-1"
  | "japan-scene-2"
  | "japan-scene-3"
  | "japan-scene-4"
  | (string & {});

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
  marketThemeId?: string;
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

export const BACKGROUND_ASSETS: Record<BackgroundTheme, string> = {
  dark: "/backgrounds/background-dark.webp",
  "animated-gradient": "",
  "bg-1": "/backgrounds/background-1.webp",
  "bg-2": "/backgrounds/background-2.webp",
  "bg-3": "/backgrounds/background-3.webp",
  "bg-4": "/backgrounds/background-4.webp",
  "bg-5": "/backgrounds/background-5.webp",
  "sakura-castle": "/bg-sakura-castle.jpg",
  "sakura-garden": "/bg-sakura-garden.jpg",
  "sakura-pagoda": "/bg-sakura-pagoda.jpg",
  "sakura-river": "/bg-sakura-river.jpg",
  "tokyo-cherry-1": "/Hoa-Dao-Vector-0032.jpg",
  "tokyo-cherry-2": "/Hoa-Dao-Vector-0036.jpg",
  "tokyo-snow-1": "/tuyet-roi-dep-den-nghet-tho-o-tokyo-nhat-13.jpg",
  "tokyo-snow-2": "/tuyet-roi-dep-den-nghet-tho-o-tokyo-nhat-5.jpg",
  "tokyo-snow-3": "/tuyet-roi-dep-den-nghet-tho-o-tokyo-nhat-6.jpg",
  "tokyo-snow-4": "/tuyet-roi-dep-den-nghet-tho-o-tokyo-nhat-7.jpg",
  "tokyo-snow-5": "/tuyet-roi-dep-den-nghet-tho-o-tokyo-nhat-9.jpg",
  "tokyo-snow-vector": "/vector-bong-tuyet-inkythuatso-4-18-09-02-53.jpg",
  "japan-scene-1": "/20-canh-dep-ly-giai-vi-sao-nhat-ban-luon-hut-du-khach-ivivu-14.jpg",
  "japan-scene-2": "/20-canh-dep-ly-giai-vi-sao-nhat-ban-luon-hut-du-khach-ivivu-16.jpg",
  "japan-scene-3": "/20-canh-dep-ly-giai-vi-sao-nhat-ban-luon-hut-du-khach-ivivu-17.jpg",
  "japan-scene-4": "/20-canh-dep-ly-giai-vi-sao-nhat-ban-luon-hut-du-khach-ivivu-20.jpg",
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
const THEME_SETTINGS_VERSION = "theme-v3";

const DEFAULT_SETTINGS: ThemeSettings = {
  accent: "purple",
  text: "silver",
  background: "dark",
  sidebarCollapsed: false,
  sakuraEnabled: false,
  snowEnabled: false,
  density: 40,
  speed: 1,
  reducedMotion: false,
  panelColor: "#16131D",
  cardColor: "#1C1825",
  // Keep the portfolio table aligned with the workspace/sidebar until the user
  // explicitly chooses a different table colour.
  tableColor: "#16131D",
  panelOpacity: 72,
  marketThemeId: undefined,
  version: THEME_SETTINGS_VERSION,
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // v3 starts data screens without decorative overlays. Older saved themes
    // keep their colors and layout preferences, while their falling effects
    // are disabled until the user explicitly turns one back on.
    const saved = localStorage.getItem("theme-settings-v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<ThemeSettings>;
        const isCurrentSchema = parsed.version === THEME_SETTINGS_VERSION;
        const next: ThemeSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          ...(isCurrentSchema ? {} : { sakuraEnabled: false, snowEnabled: false }),
          version: THEME_SETTINGS_VERSION,
        };
        setSettings(next);
        localStorage.setItem("theme-settings-v2", JSON.stringify(next));
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
      const next: ThemeSettings = {
        ...(typeof updater === "function" ? updater(prev) : { ...prev, ...updater }),
        version: THEME_SETTINGS_VERSION,
      };
      localStorage.setItem("theme-settings-v2", JSON.stringify(next));
      return next;
    });
  };

  // Dynamically update CSS Variables directly to prevent app re-renders
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Apply strict non-transparent background variables
    const activeMarketTheme = settings.marketThemeId 
      ? MARKET_THEMES.find(t => t.id === settings.marketThemeId) 
      : undefined;

    const panelBgGradient = activeMarketTheme?.panelBg;

    const panelSurface = activeMarketTheme
      ? (panelBgGradient || activeMarketTheme.surface)
      : (settings.panelColor || "#16131D");
    // Portfolio tables and the sidebar are a single workspace surface.  This
    // avoids a split theme where a saved table setting makes the two diverge.
    const tableSurface = panelSurface;

    root.style.setProperty("--panel", panelSurface);
    root.style.setProperty("--sidebar", panelSurface);
    root.style.setProperty("--card", activeMarketTheme ? activeMarketTheme.workspaceSurface : (settings.cardColor || "#1C1825"));
    root.style.setProperty("--table", tableSurface);
    root.style.setProperty("--panel-opacity", String((settings.panelOpacity ?? 72) / 100));
    root.style.setProperty("--border", activeMarketTheme ? activeMarketTheme.border : "rgba(255, 255, 255, 0.08)");

    // Accent
    const accentHex = activeMarketTheme ? activeMarketTheme.accent : (ACCENT_COLORS[settings.accent] || settings.accent);
    root.style.setProperty("--accent", accentHex);

    // Text
    const textHex = TEXT_COLORS[settings.text] || settings.text;
    root.style.setProperty("--text-color", textHex);

    // Positive & Negative color variables from market theme
    if (activeMarketTheme) {
      if (activeMarketTheme.positive) root.style.setProperty("--positive", activeMarketTheme.positive);
      if (activeMarketTheme.negative) root.style.setProperty("--negative", activeMarketTheme.negative);
    }

    // Background Image mapping (respects user settings.background)
    const rawBg = settings.background as string;
    const bgUrl = rawBg.startsWith("http://") || rawBg.startsWith("https://")
      ? rawBg
      : BACKGROUND_ASSETS[rawBg as Exclude<BackgroundTheme, "animated-gradient">];

    if (settings.background === "animated-gradient" && activeMarketTheme && activeMarketTheme.panelBg) {
      root.style.setProperty("--bg-image", activeMarketTheme.panelBg);
      root.classList.add("has-bg-image", "theme-animated-bg");
    } else if (bgUrl && settings.background !== "dark") {
      root.style.setProperty("--bg-image", `url('${bgUrl}')`);
      root.classList.add("has-bg-image");
      root.classList.remove("theme-animated-bg");
    } else {
      root.style.removeProperty("--bg-image");
      root.classList.remove("has-bg-image", "theme-animated-bg");
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
