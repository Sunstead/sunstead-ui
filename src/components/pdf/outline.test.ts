import { describe, expect, it } from 'vitest';

import { destinationPage, type DestinationResolver } from './outline';

const PAGE_REFS = new Map([
  ['12R', 0],
  ['40R', 4],
]);

const doc: DestinationResolver = {
  getDestination: async (id) => ({ chapter2: [{ num: 40, gen: 0 }, { name: 'XYZ' }, 0, 700, null] })[id] ?? null,
  getPageIndex: async ({ num, gen }) => {
    const index = PAGE_REFS.get(`${num}${gen === 0 ? 'R' : gen}`);
    if (index === undefined) throw new Error('Invalid page reference');
    return index;
  },
};

describe('destinationPage', () => {
  it('follows an explicit destination to its page', async () => {
    expect(await destinationPage(doc, [{ num: 12, gen: 0 }, { name: 'Fit' }])).toBe(1);
  });

  it('looks up a named destination', async () => {
    expect(await destinationPage(doc, 'chapter2')).toBe(5);
  });

  it('reads a plain page index', async () => {
    expect(await destinationPage(doc, [3, { name: 'Fit' }])).toBe(4);
  });

  it('is null for anything it cannot place', async () => {
    expect(await destinationPage(doc, 'missing')).toBeNull();
    expect(await destinationPage(doc, [])).toBeNull();
    expect(await destinationPage(doc, null)).toBeNull();
    expect(await destinationPage(doc, [{ num: 99, gen: 0 }])).toBeNull();
  });
});
