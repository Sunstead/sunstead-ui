export type ZoomLimits = { min: number; max: number };

/** A trackpad sends small deltas; one under this is a trackpad, not a wheel notch. */
const TOUCHPAD_DELTA = 50;
/** The scale step per trackpad event and per wheel notch. */
const TOUCHPAD_STEP = 1.03;
const MOUSE_STEP = 1.2;

export const clampScale = (value: number, { min, max }: ZoomLimits) => Math.min(max, Math.max(min, value));

/** The scale after one zoom wheel event: an even step, by device. */
export function wheelScale(current: number, deltaY: number, limits: ZoomLimits): number {
  const step = Math.abs(deltaY) < TOUCHPAD_DELTA ? TOUCHPAD_STEP : MOUSE_STEP;
  return clampScale(deltaY > 0 ? current / step : current * step, limits);
}

/** The scale `factor` from where a pinch began. */
export function gestureScale(start: number, factor: number, limits: ZoomLimits): number {
  return clampScale(start * factor, limits);
}

/**
 * Where to scroll on one axis so the point under `pointer` (from the
 * scroller's edge) stays there. `margin` is padding around the pages, which
 * doesn't scale with them.
 */
export function zoomAboutScroll(scroll: number, pointer: number, from: number, to: number, margin: number): number {
  return Math.max(0, ((scroll + pointer - margin) * to) / from + margin - pointer);
}

export type ZoomMode = 'fit-width' | 'fit-page' | 'custom';

/**
 * The scale a zoom mode comes to: fit width fills the viewport's width, fit
 * page shows the whole of the first page, custom is the scale chosen.
 */
export function fitScale(
  mode: ZoomMode,
  custom: number,
  viewport: { width: number; height: number },
  page: { width: number; height: number },
  margin: number,
  limits: ZoomLimits,
): number {
  if (mode === 'custom' || viewport.width <= 0) return clampScale(custom, limits);
  const width = (viewport.width - margin * 2) / page.width;
  if (mode === 'fit-width') return clampScale(width, limits);
  const height = (viewport.height - margin * 2) / page.height;
  return clampScale(Math.min(width, height), limits);
}
