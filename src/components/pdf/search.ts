import type { PDFDocumentProxy } from 'pdfjs-dist';

/** A page's text in one string, and where each character came from. */
export type FlatText<P> = { text: string; positions: P[] };

/** Where a character sits in the page's text layer. */
export type TextPosition = { itemIndex: number; offset: number };

/** A run of matched characters inside one text-layer item. */
export type ItemHighlight = { start: number; end: number; matchIndex: number };

export type PageMatches = {
  /** Total matches on this page. */
  count: number;
  /** By text-layer item index, so a renderer can look up only its own item. */
  byItem: Map<number, ItemHighlight[]>;
};

/**
 * `text` lowercased a character at a time, and where each unit of the result
 * came from: lowercasing can change the length (`İ` becomes two units), and
 * offsets into it would otherwise run past their characters.
 */
function foldCase(text: string): { text: string; source: number[] } {
  let folded = '';
  const source: number[] = [];
  let offset = 0;
  for (const character of text) {
    const lower = character.toLowerCase();
    folded += lower;
    for (let unit = 0; unit < lower.length; unit += 1) source.push(offset);
    offset += character.length;
  }
  source.push(offset);
  return { text: folded, source };
}

/**
 * Every case-insensitive occurrence of `query` in `text`, as `[start, end)`
 * offsets into `text`. Overlapping matches all count ("aa" in "aaa" is two).
 */
export function findAll(text: string, query: string): { start: number; end: number }[] {
  const needle = foldCase(query.trim()).text;
  if (!needle) return [];

  const haystack = foldCase(text);
  const found: { start: number; end: number }[] = [];
  let index = haystack.text.indexOf(needle);
  while (index !== -1) {
    const start = haystack.source[index];
    const end = Math.max(start + 1, haystack.source[index + needle.length]);
    found.push({ start, end });
    index = haystack.text.indexOf(needle, index + 1);
  }
  return found;
}

/** The text items of one page, as pdf.js gives them. */
export type TextItemLike = { str: string; hasEOL?: boolean } | { type: string };

/**
 * Flattens one page's text items into searchable text.
 *
 * Positions index `getTextContent().items`, not the DOM: react-pdf hands
 * `customTextRenderer` that same index, the one stable handle between a match
 * and the span it is painted on. An end of line reads as a space, so a phrase
 * broken across two lines is still found.
 */
export function flattenItems(items: TextItemLike[]): FlatText<TextPosition> {
  let text = '';
  const positions: TextPosition[] = [];

  items.forEach((item, itemIndex) => {
    if (!('str' in item)) return;
    for (let offset = 0; offset < item.str.length; offset += 1) {
      text += item.str[offset];
      positions.push({ itemIndex, offset });
    }
    if (item.hasEOL && !text.endsWith(' ')) {
      text += ' ';
      positions.push({ itemIndex, offset: item.str.length });
    }
  });

  return { text, positions };
}

export async function flattenPage(pdf: PDFDocumentProxy, pageNumber: number): Promise<FlatText<TextPosition>> {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  return flattenItems(content.items as TextItemLike[]);
}

/**
 * Runs a query over one flattened page.
 *
 * `firstMatchIndex` is where this page's matches start in the document-wide
 * numbering, so "3 of 47" counts across the whole PDF. A match spanning text
 * items gets a highlight in each: they are separate absolutely-positioned
 * spans, with no single box to draw across.
 */
export function matchPage(flat: FlatText<TextPosition>, query: string, firstMatchIndex: number): PageMatches {
  const found = findAll(flat.text, query);
  const byItem = new Map<number, ItemHighlight[]>();

  found.forEach(({ start, end }, index) => {
    const matchIndex = firstMatchIndex + index;
    let highlight: ItemHighlight | null = null;
    let item = -1;

    for (let at = start; at < end && at < flat.positions.length; at += 1) {
      const { itemIndex, offset } = flat.positions[at];
      if (itemIndex === item && highlight) {
        highlight.end = offset + 1;
        continue;
      }
      item = itemIndex;
      highlight = { start: offset, end: offset + 1, matchIndex };
      byItem.set(itemIndex, [...(byItem.get(itemIndex) ?? []), highlight]);
    }
  });

  return { count: found.length, byItem };
}

/** The 1-based page the `match`th match (document-wide) is on, or null. */
export function pageOfMatch(matchesByPage: (PageMatches | undefined)[], match: number): number | null {
  if (match < 0) return null;
  let running = 0;
  for (let index = 0; index < matchesByPage.length; index += 1) {
    const count = matchesByPage[index]?.count ?? 0;
    if (match < running + count) return index + 1;
    running += count;
  }
  return null;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/**
 * `customTextRenderer` returns an HTML string, so the PDF's own text is
 * escaped before it goes back in: a document containing `<script>` as literal
 * text must not become one.
 */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => ESCAPES[character]);
}

const percent = (fraction: number) => `${Math.round(fraction * 1e5) / 1e3}%`;

const MARK_STYLE =
  'position:absolute;top:0;height:100%;pointer-events:none;border-radius:2px;' +
  'background-color:color-mix(in oklch, var(--primary) 30%, transparent)';
const ACTIVE_STYLE =
  'background-color:color-mix(in oklch, var(--primary) 60%, transparent);' +
  'outline:1px solid var(--primary);outline-offset:-1px';

/**
 * One text-layer item's text, with a `<mark>` over each matched run, placed
 * by `edges` (`charEdges`) as a share of the item's width: inside the text, a
 * mark would sit where the stretched fallback font puts it, not on the print.
 * They are empty and absolute, so the text stays whole for selection, and
 * overlapping matches all paint. Styled inline from the theme's `--primary`,
 * so the package needs no stylesheet of its own.
 */
export function renderItemHighlights(
  str: string,
  highlights: ItemHighlight[] | undefined,
  activeMatch: number,
  edges: number[],
): string {
  const text = escapeHtml(str);
  if (!highlights) return text;

  return highlights.reduce((html, { start, end, matchIndex }) => {
    const left = edges[start] ?? 0;
    const right = edges[Math.min(end, str.length)] ?? 1;
    const active = matchIndex === activeMatch;
    const className = active ? 'find-match find-match-active' : 'find-match';
    const style = `${MARK_STYLE};${active ? `${ACTIVE_STYLE};` : ''}left:${percent(left)};width:${percent(right - left)}`;
    return `${html}<mark class="${className}" data-match="${matchIndex}" style="${style}"></mark>`;
  }, text);
}
