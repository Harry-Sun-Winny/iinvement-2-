import { describe, it, expect } from "vitest";
import {
  MARKET_THEMES,
  MarketThemeId,
  isMarketThemeId,
  MARKET_THEME_BY_ID,
} from "../themes/marketThemes";

const EXPECTED_THEME_IDS: readonly MarketThemeId[] = [
  "onyx-emerald",
  "bloomberg-terminal",
  "gold-bullion",
  "wall-street-navy",
  "tokyo-sakura",
  "nasdaq-teal",
  "carbon-cyber",
  "deep-ocean-cobalt",
  "copper-mint",
  "swiss-velvet",
  "solar-eclipse",
  "platinum-steel",
  "nebula-dust",
  "royal-wealth",
  "sage-harmony",
  "volcanic-fire",
  "desert-gold",
  "stealth-monochromatic",
  "boreal-aurora",
  "amethyst-glow",
  "simple-light",
  "simple-dark",
    "tokyo-neon-grid",
    "memphis-retro",
    "art-deco-gold",
    "nordic-linen",
    "cobalt-blueprint",
    "desert-stripe",
    "emerald-diamond",
    "lavender-field",
    "midsummer-zigzag",
    "ivory-cross",
    "aurora-mesh",
    "rose-gold-mesh",
    "deep-ocean-mesh",
    "sunset-gradient-mesh",
    "mint-sorbet-mesh",
    "teal-wave",
    "coral-wave",
    "midnight-circles",
    "sage-circles",
    "highland-tartan",
    "pastel-plaid",
    "golden-honeycomb",
    "dark-honeycomb",
    "blush-honeycomb",
    "yayoi-kusama",
    "navy-polka",
    "mint-dots",
    "french-riviera",
    "candy-cane",
    "tiger-stripe",
    "mojave-desert",
    "pacific-teal",
    "charcoal-herringbone",
    "caramel-herringbone",
    "bauhaus-primary",
    "sakura-morning",
    "matcha-wabi",
    "electric-violet",
    "tropical-monsoon",
    "crimson-velvet",
    "ice-crystal",
    "golden-pagoda",
    "provence-lavender",
    "brazil-carnival",
    "moon-dust",
    "peach-blossom",
    "malachite-stone",
    "cosmic-dusk",
    "saffron-bazaar",
    "pearl-obsidian",
  ...Array.from({ length: 72 }, (_, i) => `hue-${i * 5}-glass` as MarketThemeId),
];

describe("Market Themes Configuration", () => {
  it("has expected unique theme IDs and total count", () => {
    expect(MARKET_THEMES.length).toBeGreaterThanOrEqual(72);
    const sortedRegistryIds = MARKET_THEMES.map((theme) => theme.id).sort();
    const uniqueRegistryIds = Array.from(new Set(sortedRegistryIds));
    expect(sortedRegistryIds.length).toBe(uniqueRegistryIds.length);
  });

  it("has unique English and Vietnamese display names", () => {
    const namesEn = MARKET_THEMES.map((theme) => theme.nameEn);
    const namesVi = MARKET_THEMES.map((theme) => theme.nameVi);
    expect(new Set(namesEn).size).toBe(MARKET_THEMES.length);
    expect(new Set(namesVi).size).toBe(MARKET_THEMES.length);
  });

  it("enforces all themes to have non-empty, non-clashing tokens", () => {
    for (const theme of MARKET_THEMES) {
      expect(theme.workspaceSurface).not.toBe("");
      expect(theme.surface).not.toBe("");
      expect(theme.accent).not.toBe("");
      expect(theme.positive).not.toBe("");
      expect(theme.negative).not.toBe("");

      // Quality check on colors: positive and negative should be distinct
      expect(theme.positive.toLowerCase()).not.toBe(theme.negative.toLowerCase());
      // Primary text color should have contrast against surface color
      expect(theme.textPrimary.toLowerCase()).not.toBe(theme.surface.toLowerCase());
    }
  });

  it("implements lookup map and guard properly", () => {
    expect(isMarketThemeId("onyx-emerald")).toBe(true);
    expect(isMarketThemeId("bloomberg-terminal")).toBe(true);
    expect(isMarketThemeId("non-existent-id")).toBe(false);
    expect(isMarketThemeId(null)).toBe(false);

    expect(MARKET_THEME_BY_ID["onyx-emerald"].nameEn).toBe("Onyx Emerald");
  });
});
