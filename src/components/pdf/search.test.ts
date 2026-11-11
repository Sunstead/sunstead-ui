import { describe, expect, it } from 'vitest';

import { findAll, flattenItems, matchPage, pageOfMatch, renderItemHighlights } from './search';

describe('findAll', () => {
  it('ignores case', () => {
    expect(findAll('Hello hello HELLO', 'hello')).toHaveLength(3);
  });

  it('counts overlapping matches', () => {
    expect(findAll('aaa', 'aa')).toEqual([
      { start: 0, end: 2 },
      { start: 1, end: 3 },
    ]);
  });

  it('finds nothing for an empty or blank query', () => {
    expect(findAll('text', '')).toEqual([]);
    expect(findAll('text', '   ')).toEqual([]);
  });

  // Lowercasing `İ` gives two units; offsets must still land on the original.
  it('keeps offsets on the original text when case folding changes length', () => {
    const text = 'İstanbul city';
    const [match] = findAll(text, 'city');
    expect(text.slice(match.start, match.end)).toBe('city');
  });
});

describe('flattenItems', () => {
  it('joins items and reads an end of line as a space', () => {
    const flat = flattenItems([{ str: 'one', hasEOL: true }, { type: 'beginMarkedContent' }, { str: 'two' }]);
    expect(flat.text).toBe('one two');
    expect(flat.positions[4]).toEqual({ itemIndex: 2, offset: 0 });
  });
});

describe('matchPage', () => {
  it('paints every item a match crosses, numbered across the document', () => {
    const { count, byItem } = matchPage(flattenItems([{ str: 'Hel' }, { str: 'lo there' }]), 'hello', 4);
    expect(count).toBe(1);
    expect(byItem.get(0)).toEqual([{ start: 0, end: 3, matchIndex: 4 }]);
    expect(byItem.get(1)).toEqual([{ start: 0, end: 2, matchIndex: 4 }]);
  });

  it('finds a phrase broken across lines', () => {
    const { count } = matchPage(flattenItems([{ str: 'portable', hasEOL: true }, { str: 'document' }]), 'portable document', 0);
    expect(count).toBe(1);
  });
});

describe('pageOfMatch', () => {
  const pages = [{ count: 2, byItem: new Map() }, undefined, { count: 3, byItem: new Map() }];

  it('finds the page a match is on, skipping pages without any', () => {
    expect(pageOfMatch(pages, 0)).toBe(1);
    expect(pageOfMatch(pages, 1)).toBe(1);
    expect(pageOfMatch(pages, 2)).toBe(3);
    expect(pageOfMatch(pages, 4)).toBe(3);
  });

  it('is null past the end or with no match', () => {
    expect(pageOfMatch(pages, 5)).toBeNull();
    expect(pageOfMatch(pages, -1)).toBeNull();
  });
});

describe('renderItemHighlights', () => {
  const EDGES = [0, 0.1, 0.2, 0.6, 1];

  it('leaves the text alone and places a mark by the glyph edges', () => {
    const html = renderItemHighlights('iiWW', [{ start: 2, end: 3, matchIndex: 0 }], -1, EDGES);
    expect(html.startsWith('iiWW<mark')).toBe(true);
    expect(html).toContain('left:20%');
    expect(html).toContain('width:40%');
  });

  it('marks the active match', () => {
    const html = renderItemHighlights('iiWW', [{ start: 0, end: 1, matchIndex: 7 }], 7, EDGES);
    expect(html).toContain('find-match-active');
  });

  it('paints overlapping matches', () => {
    const highlights = [
      { start: 0, end: 2, matchIndex: 0 },
      { start: 1, end: 3, matchIndex: 1 },
    ];
    const html = renderItemHighlights('aaaa', highlights, 1, [0, 0.25, 0.5, 0.75, 1]);
    expect(html.match(/<mark/g)).toHaveLength(2);
    expect(html).toContain('find-match-active');
  });

  it('escapes the text', () => {
    expect(renderItemHighlights('<script>', undefined, -1, [])).toBe('&lt;script&gt;');
  });
});
