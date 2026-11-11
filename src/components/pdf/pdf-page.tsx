import { memo, useCallback, useState } from 'react';
import type { PDFPageProxy } from 'pdfjs-dist';
import { Page } from 'react-pdf';

import { charEdges, fontWidths, type PdfFontMetrics } from './glyph-offsets';
import { renderItemHighlights, type PageMatches } from './search';

type PdfPageProps = {
  pageNumber: number;
  scale: number;
  /** Rendered box, so an unmounted page still holds its place in the scroll. */
  width: number;
  height: number;
  /** Canvas pixels per CSS pixel (`output-scale.ts`). */
  outputScale: number;
  /** Within the render window; false renders a placeholder of the same size. */
  mounted: boolean;
  matches?: PageMatches;
  activeMatch: number;
  onIntrinsicSize: (pageNumber: number, size: { width: number; height: number }) => void;
  registerNode: (pageNumber: number, node: HTMLDivElement | null) => void;
};

/**
 * One page of the document.
 *
 * Pages outside the render window are unmounted rather than hidden: each
 * mounted page holds a full-resolution canvas, and a few hundred of those is
 * hundreds of megabytes. The placeholder keeps the exact box the page will
 * take, so the scrollbar never jumps as pages come and go.
 */
export const PdfPage = memo(function PdfPage({
  pageNumber,
  scale,
  width,
  height,
  outputScale,
  mounted,
  matches,
  activeMatch,
  onIntrinsicSize,
  registerNode,
}: PdfPageProps) {
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  // A page's fonts reach `commonObjs` as it draws; then marks can be exact.
  const [drawn, setDrawn] = useState(false);

  const textRenderer = useCallback(
    ({ str, itemIndex, fontName }: { str: string; itemIndex: number; fontName: string }) => {
      const highlights = matches?.byItem.get(itemIndex);
      if (!highlights) return renderItemHighlights(str, undefined, activeMatch, []);
      const font =
        drawn && page?.commonObjs.has(fontName) ? (page.commonObjs.get(fontName) as PdfFontMetrics) : null;
      return renderItemHighlights(str, highlights, activeMatch, charEdges(str, fontWidths(font)));
    },
    [matches, activeMatch, page, drawn],
  );

  const ref = useCallback((node: HTMLDivElement | null) => registerNode(pageNumber, node), [registerNode, pageNumber]);

  return (
    <div
      ref={ref}
      data-page={pageNumber}
      data-sheet=''
      className='relative shrink-0 overflow-hidden rounded-sm bg-white shadow-md ring-1 ring-foreground/10 [&_canvas]:block'
      style={{ width, height }}
    >
      {mounted ? (
        <Page
          pageNumber={pageNumber}
          scale={scale}
          devicePixelRatio={outputScale}
          // Only handed over when there is something to paint: with no query
          // the default text layer is faster and exactly right.
          customTextRenderer={matches ? textRenderer : undefined}
          onLoadSuccess={(loaded) => {
            setPage(loaded);
            onIntrinsicSize(pageNumber, { width: loaded.originalWidth, height: loaded.originalHeight });
          }}
          onRenderSuccess={() => setDrawn(true)}
          loading=''
        />
      ) : (
        <div className='grid h-full w-full place-items-center text-sm text-neutral-400 select-none'>{pageNumber}</div>
      )}
    </div>
  );
});
