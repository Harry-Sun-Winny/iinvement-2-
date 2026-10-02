export const MIN_LEFT_WIDTH = 520;
export const MIN_RIGHT_WIDTH = 320;
export const RESIZE_HANDLE_WIDTH = 6;
export const MIN_SPLIT_WIDTH = MIN_LEFT_WIDTH + MIN_RIGHT_WIDTH + RESIZE_HANDLE_WIDTH;

export const DEFAULT_LEFT_RATIO = 0.65;
export const MIN_PERSISTED_RATIO = 0.1;
export const MAX_PERSISTED_RATIO = 0.9;

export function canUseMarketSplit(containerWidth: number): boolean {
  return Number.isFinite(containerWidth) && containerWidth >= MIN_SPLIT_WIDTH;
}

export function clampLeftPanelWidth(desiredWidth: number, containerWidth: number): number {
  if (!canUseMarketSplit(containerWidth)) {
    return 0;
  }
  const maxWidth = containerWidth - MIN_RIGHT_WIDTH - RESIZE_HANDLE_WIDTH;
  const safeDesired = Number.isFinite(desiredWidth) ? desiredWidth : containerWidth * DEFAULT_LEFT_RATIO;
  return Math.min(Math.max(safeDesired, MIN_LEFT_WIDTH), maxWidth);
}

export function normalizeLeftRatio(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return DEFAULT_LEFT_RATIO;
  }

  const ratio =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  return Number.isFinite(ratio) && ratio > MIN_PERSISTED_RATIO && ratio < MAX_PERSISTED_RATIO
    ? ratio
    : DEFAULT_LEFT_RATIO;
}

export function getInitialLeftPanelWidth(containerWidth: number, persistedRatio: unknown): number {
  const ratio = normalizeLeftRatio(persistedRatio);
  const distributableWidth = containerWidth - RESIZE_HANDLE_WIDTH;
  return clampLeftPanelWidth(ratio * distributableWidth, containerWidth);
}

export function adjustWidthFromKeyboard(
  currentWidth: number,
  key: string,
  shiftKey: boolean,
  containerWidth: number
): number {
  if (!canUseMarketSplit(containerWidth)) {
    return 0;
  }

  if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End") {
    return currentWidth;
  }

  const maxWidth = containerWidth - MIN_RIGHT_WIDTH - RESIZE_HANDLE_WIDTH;
  if (key === "Home") {
    return clampLeftPanelWidth(MIN_LEFT_WIDTH, containerWidth);
  }
  if (key === "End") {
    return clampLeftPanelWidth(maxWidth, containerWidth);
  }

  const step = shiftKey ? 40 : 10;
  const direction = key === "ArrowLeft" ? -1 : 1;
  return clampLeftPanelWidth(currentWidth + direction * step, containerWidth);
}
