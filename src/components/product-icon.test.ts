import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRODUCTS, isProduct } from '../lib/products';

const brand = path.resolve(__dirname, '../assets/brand');
const generated = path.resolve(__dirname, 'brand');

describe('product icons', () => {
  it('has a source SVG and a generated component for every product', () => {
    for (const { id } of PRODUCTS) {
      expect(existsSync(path.join(brand, `${id}.svg`)), `${id}.svg`).toBe(true);
      expect(existsSync(path.join(generated, `${id}.tsx`)), `${id}.tsx`).toBe(true);
    }
  });

  it('lists no icon that is not a product or the Sunstead mark', () => {
    const ids = new Set<string>([...PRODUCTS.map((p) => p.id), 'sunstead']);
    for (const file of readdirSync(brand)) expect(ids.has(file.replace(/\.svg$/, '')), file).toBe(true);
  });

  it('keeps each SVG self-contained: a viewBox, no <style>', () => {
    for (const id of [...PRODUCTS.map((p) => p.id), 'sunstead']) {
      const svg = readFileSync(path.join(brand, `${id}.svg`), 'utf8');
      expect(svg, id).toMatch(/viewBox="/);
      expect(svg, `${id} has a <style>, which would restyle the page it is inlined in`).not.toMatch(/<style/);
    }
  });

  it('keeps ids apart between products', () => {
    const ids = PRODUCTS.flatMap(({ id }) =>
      [...readFileSync(path.join(generated, `${id}.tsx`), 'utf8').matchAll(/ id="([^"]+)"/g)].map((m) => m[1]),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('knows its own ids', () => {
    expect(isProduct('atlas')).toBe(true);
    expect(isProduct('gitea')).toBe(false);
  });
});
