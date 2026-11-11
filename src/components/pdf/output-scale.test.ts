import { describe, expect, it } from 'vitest';

import { MAX_CANVAS_PIXELS, outputScale, pageBox } from './output-scale';

const LETTER = { width: 612, height: 792 };

describe('outputScale', () => {
  // A desktop at a fractional scale can report 1 while it upscales the window.
  it('renders at least twice the reported density', () => {
    expect(outputScale(1, LETTER, 1)).toBe(2);
    expect(outputScale(1.5, LETTER, 1)).toBe(2);
  });

  it('follows a denser screen', () => {
    expect(outputScale(3, LETTER, 1)).toBe(3);
  });

  it('never asks for a canvas over the limit', () => {
    const scale = outputScale(2, LETTER, 6);
    const pixels = (LETTER.width * 6 * scale) * (LETTER.height * 6 * scale);
    expect(pixels).toBeLessThanOrEqual(MAX_CANVAS_PIXELS + 1);
    expect(scale).toBeLessThan(2);
  });
});

describe('pageBox', () => {
  it('is a whole number of pixels, so the canvas is not resampled', () => {
    expect(pageBox(LETTER, 1.33)).toEqual({ width: 814, height: 1053 });
  });
});
