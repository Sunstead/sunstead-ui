/** About 16 MP per page: past that, canvases fail or take the memory of several pages. */
export const MAX_CANVAS_PIXELS = 4096 * 4096;

type Size = { width: number; height: number };

/**
 * Canvas pixels per CSS pixel for a page.
 *
 * At least 2, whatever the screen reports: on Linux at a fractional scale the
 * reported density can be 1 while the compositor upscales the window, which
 * leaves a page's bitmap soft beside the app's own text.
 */
export function outputScale(devicePixelRatio: number, page: Size, scale: number): number {
  const area = page.width * scale * page.height * scale;
  return Math.min(Math.max(devicePixelRatio, 2), Math.sqrt(MAX_CANVAS_PIXELS / area));
}

/** A page's box on screen, in whole pixels so its canvas isn't resampled. */
export function pageBox(page: Size, scale: number): Size {
  return { width: Math.round(page.width * scale), height: Math.round(page.height * scale) };
}
