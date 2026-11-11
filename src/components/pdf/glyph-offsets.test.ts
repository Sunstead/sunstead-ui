import { describe, expect, it } from 'vitest';

import { charEdges, fontWidths } from './glyph-offsets';

describe('fontWidths', () => {
  it('reads each character through the font unicode map', () => {
    const widths = fontWidths({ widths: { 1: 250, 2: 1000 }, toUnicode: { _map: { 1: 'i', 2: 'W' } } });
    expect(widths?.get('i')).toBe(250);
    expect(widths?.get('W')).toBe(1000);
  });

  // pdf.js normalizes the text it hands out, so a ligature reads as its letters.
  it('shares a ligature between the letters it stands for', () => {
    const widths = fontWidths({ widths: { 5: 600 }, toUnicode: { _map: { 5: 'ﬁ' } } });
    expect(widths?.get('f')).toBe(300);
    expect(widths?.get('i')).toBe(300);
  });

  it('falls back to char codes without a map', () => {
    expect(fontWidths({ widths: { 65: 700 } })?.get('A')).toBe(700);
  });

  it('has nothing to offer without widths', () => {
    expect(fontWidths({})).toBeNull();
    expect(fontWidths(null)).toBeNull();
  });
});

describe('charEdges', () => {
  it('spaces characters by their real widths', () => {
    const edges = charEdges('iW', new Map([['i', 250], ['W', 750]]));
    expect(edges).toEqual([0, 0.25, 1]);
  });

  it('gives an unknown character the average width', () => {
    const edges = charEdges('ab', new Map([['a', 300]]));
    expect(edges[1]).toBeCloseTo(0.5);
  });

  it('spaces evenly without a font', () => {
    expect(charEdges('abcd', null)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});
