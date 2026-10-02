import { describe, it, expect } from "vitest";
import {
  MIN_LEFT_WIDTH,
  MIN_RIGHT_WIDTH,
  RESIZE_HANDLE_WIDTH,
  MIN_SPLIT_WIDTH,
  DEFAULT_LEFT_RATIO,
  canUseMarketSplit,
  clampLeftPanelWidth,
  normalizeLeftRatio,
  getInitialLeftPanelWidth,
  adjustWidthFromKeyboard,
} from "../utils/sizing";

describe("Market Workspace Panel Sizing", () => {
  it("determines resizable split layouts correctly based on container width limit", () => {
    expect(canUseMarketSplit(1000)).toBe(true);
    expect(canUseMarketSplit(846)).toBe(true);
    expect(canUseMarketSplit(845)).toBe(false);
    expect(canUseMarketSplit(500)).toBe(false);
    expect(canUseMarketSplit(0)).toBe(false);
    expect(canUseMarketSplit(Number.NaN)).toBe(false);
  });

  it("clamps requested left panel sizes safely", () => {
    // Normal container
    expect(clampLeftPanelWidth(600, 1000)).toBe(600);
    // Underflow clamping
    expect(clampLeftPanelWidth(100, 1000)).toBe(MIN_LEFT_WIDTH);
    // Overflow clamping (1000 - 320 - 6 = 674px max)
    expect(clampLeftPanelWidth(900, 1000)).toBe(674);

    // If split is unavailable, clamps should return 0
    expect(clampLeftPanelWidth(600, 500)).toBe(0);
  });

  it("normalizes preferences ratios correctly", () => {
    expect(normalizeLeftRatio(0.4)).toBe(0.4);
    expect(normalizeLeftRatio("0.75")).toBe(0.75);
    
    // Fallback bounds
    expect(normalizeLeftRatio(null)).toBe(DEFAULT_LEFT_RATIO);
    expect(normalizeLeftRatio(undefined)).toBe(DEFAULT_LEFT_RATIO);
    expect(normalizeLeftRatio("")).toBe(DEFAULT_LEFT_RATIO);
    expect(normalizeLeftRatio(-0.5)).toBe(DEFAULT_LEFT_RATIO);
    expect(normalizeLeftRatio(1.2)).toBe(DEFAULT_LEFT_RATIO);
    expect(normalizeLeftRatio("abc")).toBe(DEFAULT_LEFT_RATIO);
  });

  it("calculates initial width accurately", () => {
    // Distributable: 1000 - 6 = 994px. 0.6 * 994 = 596.4px -> clamped to 596px boundaries
    expect(getInitialLeftPanelWidth(1000, 0.6)).toBe(596.4);
  });

  it("responds to keyboard adjustments with Arrow keys and Home/End keys", () => {
    // LeftArrow (normal step 10)
    expect(adjustWidthFromKeyboard(600, "ArrowLeft", false, 1000)).toBe(590);
    // RightArrow with Shift (step 40)
    expect(adjustWidthFromKeyboard(600, "ArrowRight", true, 1000)).toBe(640);
    // Home key (sets to min)
    expect(adjustWidthFromKeyboard(600, "Home", false, 1000)).toBe(MIN_LEFT_WIDTH);
    // End key (sets to max client layout bounds)
    expect(adjustWidthFromKeyboard(600, "End", false, 1000)).toBe(674);

    // Unsupported key remains static
    expect(adjustWidthFromKeyboard(600, "Space", false, 1000)).toBe(600);
    // Unsupported mode yields 0
    expect(adjustWidthFromKeyboard(600, "ArrowLeft", false, 500)).toBe(0);
  });
});
