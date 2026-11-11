import { describe, expect, it } from 'vitest';

import { fitScale, gestureScale, wheelScale, zoomAboutScroll } from './zoom';

const LIMITS = { min: 0.2, max: 6 };

describe('wheelScale', () => {
  it('takes even steps from a trackpad, whatever the delta', () => {
    expect(wheelScale(1, -3, LIMITS)).toBeCloseTo(1.03);
    expect(wheelScale(1, -30, LIMITS)).toBeCloseTo(1.03);
    expect(wheelScale(1, 3, LIMITS)).toBeCloseTo(1 / 1.03);
  });

  it('takes bigger steps from a wheel notch', () => {
    expect(wheelScale(1, -120, LIMITS)).toBeCloseTo(1.2);
  });

  it('stops at the limits', () => {
    expect(wheelScale(6, -120, LIMITS)).toBe(6);
    expect(wheelScale(0.2, 120, LIMITS)).toBe(0.2);
  });
});

describe('gestureScale', () => {
  it('multiplies the scale the gesture started from, within the limits', () => {
    expect(gestureScale(1.5, 2, LIMITS)).toBe(3);
    expect(gestureScale(4, 2, LIMITS)).toBe(6);
    expect(gestureScale(0.3, 0.1, LIMITS)).toBe(0.2);
  });
});

describe('zoomAboutScroll', () => {
  // The page point under the pointer: (scroll + pointer - margin) / scale.
  const under = (scroll: number, pointer: number, scale: number) => (scroll + pointer - 32) / scale;

  it('keeps the point under the pointer still', () => {
    const next = zoomAboutScroll(300, 200, 1, 2, 32);
    expect(under(next, 200, 2)).toBeCloseTo(under(300, 200, 1));
  });

  it('never scrolls past the start', () => {
    expect(zoomAboutScroll(0, 100, 1, 0.5, 32)).toBe(0);
  });
});

describe('fitScale', () => {
  const LETTER = { width: 612, height: 792 };
  const VIEW = { width: 1000, height: 800 };

  it('fits the width', () => {
    expect(fitScale('fit-width', 1, VIEW, LETTER, 32, LIMITS)).toBeCloseTo((1000 - 64) / 612);
  });

  it('fits the whole page by its tighter side', () => {
    expect(fitScale('fit-page', 1, VIEW, LETTER, 32, LIMITS)).toBeCloseTo((800 - 64) / 792);
  });

  it('keeps a custom scale, within the limits', () => {
    expect(fitScale('custom', 1.5, VIEW, LETTER, 32, LIMITS)).toBe(1.5);
    expect(fitScale('custom', 9, VIEW, LETTER, 32, LIMITS)).toBe(6);
  });

  it('uses the chosen scale before the viewport is measured', () => {
    expect(fitScale('fit-page', 1, { width: 0, height: 0 }, LETTER, 32, LIMITS)).toBe(1);
  });

  it('never fits below the minimum in a tiny viewport', () => {
    expect(fitScale('fit-page', 1, { width: 80, height: 80 }, LETTER, 32, LIMITS)).toBe(0.2);
  });
});
