import { useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

import { flattenPage, matchPage, pageOfMatch, type FlatText, type PageMatches, type TextPosition } from './search';

/**
 * How often a partly built index is published while it fills. Each publish
 * re-runs the search over every page read so far, so this trades how quickly
 * the count climbs against repeated scanning on a long document.
 */
const PROGRESS_INTERVAL_MS = 200;

export type PdfFind = {
  open: boolean;
  query: string;
  /** By page index, `matchesByPage[0]` being page 1. */
  matchesByPage: (PageMatches | undefined)[];
  total: number;
  /** Document-wide index of the current match, or -1. */
  activeMatch: number;
  /** 1-based page the current match is on, or null. */
  activePage: number | null;
  /** Still reading the document's text. */
  indexing: boolean;
  setOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  /** Moves to the next (1) or previous (-1) match, wrapping. */
  step: (direction: 1 | -1) => void;
};

/**
 * Find in a PDF.
 *
 * The text is read lazily, only once there is something to find:
 * `getTextContent()` on every page of a textbook is seconds of work, and
 * nobody who opened a PDF just to look at it should pay for that. It is
 * published as it goes, so the count climbs rather than sitting at zero.
 */
export function usePdfFind(pdf: PDFDocumentProxy | null, initialQuery = ''): PdfFind {
  const [open, setOpen] = useState(initialQuery.trim() !== '');
  const [query, setQueryState] = useState(initialQuery);
  const [chosen, setChosen] = useState(0);

  // A new `initialQuery` (the app searched again) reopens find on it.
  const [seenInitial, setSeenInitial] = useState(initialQuery);
  if (initialQuery !== seenInitial) {
    setSeenInitial(initialQuery);
    setQueryState(initialQuery);
    setChosen(0);
    if (initialQuery.trim()) setOpen(true);
  }

  /**
   * Flattened page text in page order, as it is read (`buffer`) and as last
   * published for rendering (`flats`).
   */
  const buffer = useRef<FlatText<TextPosition>[]>([]);
  const [flats, setFlats] = useState<FlatText<TextPosition>[]>([]);
  const searching = open && query.trim() !== '';
  const numPages = pdf?.numPages ?? 0;

  useEffect(() => {
    if (!pdf || !searching || buffer.current.length >= pdf.numPages) return;

    let cancelled = false;
    let lastPublish = 0;

    const build = async () => {
      for (let page = buffer.current.length + 1; page <= pdf.numPages; page += 1) {
        const flat = await flattenPage(pdf, page).catch(() => undefined);
        if (cancelled) return;
        // By index, not pushed: a page that failed to read still holds its
        // slot, or every later page would shift.
        buffer.current[page - 1] = flat ?? { text: '', positions: [] };
        const now = performance.now();
        if (page === pdf.numPages || now - lastPublish > PROGRESS_INTERVAL_MS) {
          lastPublish = now;
          setFlats(buffer.current.slice());
        }
      }
    };

    void build();
    return () => {
      cancelled = true;
    };
  }, [pdf, searching]);

  const { matchesByPage, total } = useMemo(() => {
    const pages: (PageMatches | undefined)[] = [];
    let running = 0;
    if (!searching) return { matchesByPage: pages, total: 0 };
    flats.forEach((flat, index) => {
      const page = matchPage(flat, query, running);
      running += page.count;
      pages[index] = page;
    });
    return { matchesByPage: pages, total: running };
  }, [searching, flats, query]);

  // Clamped rather than reset while the count climbs or the query narrows.
  const activeMatch = total === 0 ? -1 : Math.min(Math.max(chosen, 0), total - 1);
  const activePage = pageOfMatch(matchesByPage, activeMatch);

  const setQuery = (next: string) => {
    setQueryState(next);
    setChosen(0);
  };

  if (!searching) {
    return { open, query, matchesByPage: [], total: 0, activeMatch: -1, activePage: null, indexing: false, setOpen, setQuery, step: () => {} };
  }

  return {
    open,
    query,
    matchesByPage,
    total,
    activeMatch,
    activePage,
    indexing: flats.length < numPages,
    setOpen,
    setQuery,
    step: (direction) => {
      if (total > 0) setChosen((activeMatch + direction + total) % total);
    },
  };
}
