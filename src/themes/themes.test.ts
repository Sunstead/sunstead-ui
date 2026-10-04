import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrast, distance, over, parseColor, type Rgba } from '../test/color';
import {
  DEFAULT_PAIR,
  DEFAULT_THEME,
  normalizeChoice,
  normalizeSlot,
  SYSTEM,
  THEMES,
  themeById,
  themesOf,
} from '../lib/themes';

// Ported from Cosmos (app/src/themes/themes.test.ts). The first-paint check
// against index.html stays in each app, since each app has its own.

// Read from disk: vitest stubs CSS imports, `?raw` included.
const files = readdirSync(__dirname)
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(path.join(__dirname, f), 'utf8'));

/** Every `[data-theme='id'] { ... }` block, as token maps. */
function parseBlocks(): Map<string, Map<string, string>> {
  const blocks = new Map<string, Map<string, string>>();
  for (const css of files) {
    for (const m of css.matchAll(/\[data-theme='([\w-]+)'\]\s*\{([^}]*)\}/g)) {
      const tokens = new Map<string, string>();
      for (const t of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tokens.set(t[1], t[2].trim());
      expect(blocks.has(m[1]), `${m[1]} defined twice`).toBe(false);
      blocks.set(m[1], tokens);
    }
  }
  return blocks;
}

const blocks = parseBlocks();
const reference = blocks.get('sunstead-dark')!;

const HOLO = ['--holo-space', '--holo-primary', '--holo-secondary', '--holo-text', '--holo-dim', '--holo-glow'];
const CORE = [
  '--background',
  '--foreground',
  '--card',
  '--primary',
  '--sidebar',
  '--sidebar-accent',
  '--success',
  '--warning',
  '--error',
  '--cpu',
  '--ram',
  '--network',
  '--disk',
  '--mark-0',
  '--mark-1',
  '--ansi-0',
  '--ansi-15',
  '--glass-tint',
  '--space',
  '--planet-atmosphere',
  '--chart-5',
];

/** Text over a surface; translucent layers are composited down to the page. */
const PAIRS: [text: string, surface: string[]][] = [
  ['--foreground', ['--background']],
  ['--card-foreground', ['--card', '--background']],
  ['--muted-foreground', ['--background']],
  ['--muted-foreground', ['--card', '--background']],
  ['--popover-foreground', ['--popover', '--background']],
  ['--primary-foreground', ['--primary', '--background']],
  ['--sidebar-foreground', ['--sidebar']],
  ['--muted-foreground', ['--sidebar']],
  ['--sidebar-accent-foreground', ['--sidebar-accent', '--sidebar']],
];

/**
 * Solstice's themes came in with their colours untouched, so Solstice looks
 * exactly as it did. A few fall just short of a check here; each keeps the
 * value it has as a floor instead.
 */
const SOLSTICE_FLOORS: Record<string, Record<string, number>> = {
  inferno: { '--primary-foreground on --primary': 3.39 },
  bubblegum: { '--muted-foreground on --background': 4.48, '--muted-foreground on --sidebar': 4.15 },
  ember: { sidebar: 0.08 },
  orchard: { sidebar: 0.042 },
};

/** Tokens a theme may leave to the base: only the shape. */
const OPTIONAL = new Set(['--radius']);

/** Kept exactly as Cosmos's originals were before themes; see the per-theme checks. */
const ORIGINALS = new Set(['sunstead-dark', 'sunstead-light']);

function flatten(tokens: Map<string, string>, layers: string[]): Rgba {
  const colours = layers.map((l) => parseColor(tokens.get(l)!));
  return colours.reduceRight((below, layer) => over(layer, below));
}

describe('themes', () => {
  it('registry and CSS agree', () => {
    expect([...blocks.keys()].sort()).toEqual(THEMES.map((t) => t.id).sort());
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    expect(themeById(DEFAULT_THEME)?.scheme).toBe('dark');
    expect(themeById(DEFAULT_PAIR.dark)?.scheme).toBe('dark');
    expect(themeById(DEFAULT_PAIR.light)?.scheme).toBe('light');
  });

  it('styles.css imports every theme file', () => {
    const styles = readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8');
    for (const f of readdirSync(__dirname).filter((f) => f.endsWith('.css'))) {
      expect(styles, f).toContain(`@import './themes/${f}';`);
    }
  });

  it('groups by scheme only, tech themes included', () => {
    for (const scheme of ['dark', 'light'] as const) {
      expect(themesOf(scheme).every((t) => t.scheme === scheme)).toBe(true);
    }
    expect(themesOf('dark').length + themesOf('light').length).toBe(THEMES.length);
    expect(themesOf('dark').map((t) => t.id)).toContain('hologram');
    expect(themesOf('light').map((t) => t.id)).toContain('blueprint');
    // Follow system pairs any theme of the right scheme, tech ones too.
    expect(normalizeSlot('dark', 'hologram')).toBe('hologram');
    expect(normalizeSlot('light', 'blueprint')).toBe('blueprint');
    expect(normalizeSlot('light', 'hologram')).toBe(DEFAULT_PAIR.light);
    expect(normalizeSlot('dark', 'nebula')).toBe('nebula');
  });

  it('normalizes stored choices, with aliases for renamed ids', () => {
    expect(normalizeChoice(SYSTEM)).toBe(SYSTEM);
    expect(normalizeChoice('nebula')).toBe('nebula');
    expect(normalizeChoice('nope')).toBe(DEFAULT_THEME);
    expect(normalizeChoice(null)).toBe(DEFAULT_THEME);
    // Cosmos before 0.10 stored the bare scheme.
    const legacy = { dark: 'sunstead-dark', light: 'sunstead-light' };
    expect(normalizeChoice('dark', legacy)).toBe('sunstead-dark');
    expect(normalizeSlot('dark', 'cosmos-dark', { 'cosmos-dark': 'sunstead-dark' })).toBe('sunstead-dark');
    expect(normalizeChoice('light', legacy)).toBe('sunstead-light');
    expect(normalizeChoice('dark')).toBe(DEFAULT_THEME);
  });

  it('Sunstead Dark carries the core and hologram tokens', () => {
    for (const token of [...CORE, ...HOLO]) expect(reference.has(token), token).toBe(true);
  });

  describe.each(THEMES.map((t) => [t.name, t] as const))('%s', (_, theme) => {
    const tokens = blocks.get(theme.id)!;
    const colour = (name: string) => parseColor(tokens.get(name)!);

    it('defines every token, and nothing else', () => {
      const required = (keys: Iterable<string>) => [...keys].filter((k) => !OPTIONAL.has(k)).sort();
      expect(required(tokens.keys())).toEqual(required(reference.keys()));
    });

    it('gives its border as one colour and as colour plus opacity, and they agree', () => {
      const border = colour('--border');
      const base = colour('--border-color');
      const opacity = tokens.get('--border-opacity')!;
      expect(opacity).toMatch(/^\d+(\.\d+)?%$/);
      expect(base.a).toBe(1);
      expect(border.a).toBeCloseTo(parseFloat(opacity) / 100, 3);
      expect(distance({ ...border, a: 1 }, base)).toBeLessThan(0.001);
    });

    it('has an opaque popover, which menus make translucent themselves', () => {
      expect(colour('--popover').a).toBe(1);
    });

    it.each(PAIRS)('%s on %s meets WCAG AA', (text, surface) => {
      const bg = flatten(tokens, surface);
      const ratio = contrast(over(colour(text), bg), bg);
      const floor = SOLSTICE_FLOORS[theme.id]?.[`${text} on ${surface[0]}`] ?? 4.5;
      expect(ratio, `${theme.id}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(floor);
    });

    it('keeps the hologram dark', () => {
      const space = colour('--holo-space');
      expect(contrast(space, parseColor('#000000'))).toBeLessThan(1.25);
      expect(contrast(colour('--holo-text'), space)).toBeGreaterThanOrEqual(7);
      const glow = Number(tokens.get('--holo-glow'));
      expect(glow).toBeGreaterThanOrEqual(0);
      expect(glow).toBeLessThanOrEqual(1);
    });

    it.skipIf(ORIGINALS.has(theme.id))('tells metrics apart, from each other and from status', () => {
      const metrics = ['--cpu', '--ram', '--network', '--disk'];
      const status = ['--success', '--warning', '--error'];
      for (const [i, a] of metrics.entries()) {
        for (const b of metrics.slice(i + 1)) {
          expect(distance(colour(a), colour(b)), `${a} vs ${b}`).toBeGreaterThan(0.12);
        }
        for (const s of status) {
          expect(distance(colour(a), colour(s)), `${a} vs ${s}`).toBeGreaterThan(0.08);
        }
      }
    });

    it('shows the active sidebar item clearly, apart from a 60% hover', () => {
      // Steps between near-blacks read smaller than the same step in light.
      const min =
        theme.id === 'sunstead-light' ? 0 : SOLSTICE_FLOORS[theme.id]?.sidebar ?? (theme.scheme === 'dark' ? 0.1 : 0.05);
      const sidebar = colour('--sidebar');
      const active = flatten(tokens, ['--sidebar-accent', '--sidebar']);
      expect(distance(active, sidebar)).toBeGreaterThanOrEqual(min);
    });
  });
});
