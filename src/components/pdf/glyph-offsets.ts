/**
 * Where characters fall inside a text-layer item.
 *
 * pdf.js draws an item's text in a fallback font stretched to the item's real
 * width, so only its total width matches the page: a `<mark>` around some of
 * the text drifts from the printed word, more the further along the line it
 * is. The PDF's own font knows each glyph's width, which places it exactly.
 */

/** The parts of a pdf.js font read here (`fontExtraProperties`). */
export interface PdfFontMetrics {
  widths?: Record<number, number>;
  toUnicode?: { _map?: Record<number, string> | string[] };
}

/** Each character's width in a font, or null if it doesn't say. */
export function fontWidths(font: PdfFontMetrics | null | undefined): Map<string, number> | null {
  if (!font?.widths) return null;
  const widths = new Map<string, number>();
  const unicode = font.toUnicode?._map;

  for (const [code, width] of Object.entries(font.widths)) {
    if (!width) continue;
    const number = Number(code);
    const mapped = unicode ? (unicode as Record<number, string>)[number] : String.fromCharCode(number);
    if (!mapped) continue;
    // A ligature reads as its letters: pdf.js normalizes the text it gives.
    const text = mapped.normalize('NFKC');
    for (const character of text) {
      if (!widths.has(character)) widths.set(character, width / text.length);
    }
  }
  return widths.size > 0 ? widths : null;
}

/** Each character's left edge in `str` as a fraction of its width, and the end. */
export function charEdges(str: string, widths: Map<string, number> | null): number[] {
  const known = [...str].flatMap((character) => widths?.get(character) ?? []);
  const average = known.length ? known.reduce((sum, width) => sum + width, 0) / known.length : 1;

  const edges = [0];
  let total = 0;
  for (let index = 0; index < str.length; index += 1) {
    total += widths?.get(str[index]) ?? average;
    edges.push(total);
  }
  return total > 0 ? edges.map((edge) => edge / total) : edges;
}
