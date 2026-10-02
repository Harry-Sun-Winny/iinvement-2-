import { useState, useEffect, useCallback, useMemo } from "react";
import {
  MarketThemeId,
  MarketTheme,
  MARKET_THEME_BY_ID,
  DEFAULT_MARKET_THEME_ID,
  isMarketThemeId,
  getMarketThemeStyle,
  MarketThemeStyle,
} from "../themes/marketThemes";

const THEME_STORAGE_KEY = "market:theme";

const CUSTOM_BG_STORAGE_KEY = "market:custom-panel-bg";

export function useMarketTheme() {
  const [themeId, setThemeId] = useState<MarketThemeId>(DEFAULT_MARKET_THEME_ID);
  const [customPanelBg, setCustomPanelBgState] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isMarketThemeId(stored)) {
      setThemeId(stored);
    } else {
      setThemeId(DEFAULT_MARKET_THEME_ID);
    }
    const storedCustom = localStorage.getItem(CUSTOM_BG_STORAGE_KEY);
    if (storedCustom) {
      setCustomPanelBgState(storedCustom);
    }
  }, []);

  const changeTheme = useCallback((id: MarketThemeId) => {
    if (isMarketThemeId(id)) {
      setThemeId(id);
      localStorage.setItem(THEME_STORAGE_KEY, id);
      // Remove custom background when applying preset theme
      setCustomPanelBgState("");
      localStorage.removeItem(CUSTOM_BG_STORAGE_KEY);
    }
  }, []);

  const changeCustomPanelBg = useCallback((bg: string) => {
    setCustomPanelBgState(bg);
    if (bg) {
      localStorage.setItem(CUSTOM_BG_STORAGE_KEY, bg);
    } else {
      localStorage.removeItem(CUSTOM_BG_STORAGE_KEY);
    }
  }, []);

  const resetTheme = useCallback(() => {
    setThemeId(DEFAULT_MARKET_THEME_ID);
    setCustomPanelBgState("");
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(CUSTOM_BG_STORAGE_KEY);
  }, []);

  const theme = useMemo(() => {
    return MARKET_THEME_BY_ID[themeId] || MARKET_THEME_BY_ID[DEFAULT_MARKET_THEME_ID];
  }, [themeId]);

  const styleVariables = useMemo<MarketThemeStyle>(() => {
    const base = getMarketThemeStyle(theme);
    if (customPanelBg) {
      base["--market-panel-bg"] = customPanelBg;
    }
    return base;
  }, [theme, customPanelBg]);

  return {
    themeId,
    theme,
    customPanelBg,
    styleVariables,
    setTheme: changeTheme,
    setCustomPanelBg: changeCustomPanelBg,
    resetTheme,
  };
}
