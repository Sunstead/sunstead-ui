import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Document } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { FileWarning, LockKeyhole } from 'lucide-react';

import './worker';
import { Button } from '../ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty';
import { Input } from '../ui/input';
import { ThemeContext } from '../../hooks/use-theme';
import { cn } from '../../lib/utils';
import { readDimChoice, writeDimChoice } from './dim';
import { destinationPage } from './outline';
import { outputScale, pageBox } from './output-scale';
import { PdfFindBar } from './pdf-find-bar';
import { PdfPage } from './pdf-page';
import { PdfSidebar } from './pdf-sidebar';
import { PdfToolbar } from './pdf-toolbar';
import { scrollWithin } from './scroll';
import { usePdfFind } from './use-pdf-find';
import { usePdfZoom } from './use-pdf-zoom';
import { useScreenDensity } from './use-screen-density';
import { clampScale, fitScale, type ZoomMode } from './zoom';

export type PdfViewerProps = {
  /** Where the PDF is. Fetched by pdf.js with the page's cookies. */
  url: string;
  /** The document's name, for screen readers. */
  title?: string;
  /** Opens find on this text (the app's search query, say). */
  initialFind?: string;
  /** pdf.js character maps (`pdfjs-dist/cmaps/`), served by the app, ending in `/`. */
  cMapUrl?: string;
  /** pdf.js standard fonts (`pdfjs-dist/standard_fonts/`), served by the app, ending in `/`. */
  standardFontDataUrl?: string;
  className?: string;
};

/** US Letter at 72dpi, only shown for the frame or two before page 1 loads. */
const FALLBACK_SIZE = { width: 612, height: 792 };

const PAGE_GAP = 16;
const PAGE_MARGIN = 32;
/** Room under the last page for the floating toolbar. */
const TOOLBAR_CLEARANCE = 72;
const ZOOM_STEP = 0.2;
const ZOOM_LIMITS = { min: 0.2, max: 6 };

/**
 * How far outside the viewport a page still renders. Two viewports of slack
 * each way covers a fast flick without holding more than a few canvases.
 */
const RENDER_MARGIN = '200% 0px';

/**
 * Pages either side of the current one that render regardless of the
 * observer: a backstop, so a late intersection report never leaves the
 * reader looking at a placeholder.
 */
const NEARBY_PAGES = 2;

/** Only the page crossing the middle of the viewport is the current one. */
const CURRENT_PAGE_MARGIN = '-45% 0px -45% 0px';

/** Dims page canvases, and gives blank pages the colour white dims to. */
const DIM_FILTER = '[&_canvas]:[filter:invert(0.88)_hue-rotate(180deg)] [&_[data-sheet]]:bg-[#1f1f1f]';

/** Pages whose sizes are read per batch, before they are published. */
const SIZE_BATCH = 50;

type Size = { width: number; height: number };

/**
 * Every page's size, read up front. Placeholders then take their real size
 * from the start, so a jump to a page lands exactly, instead of being pushed
 * about as earlier pages of another shape (a landscape table, say) load.
 */
async function readPageSizes(pdf: PDFDocumentProxy, publish: (sizes: Map<number, Size>) => void, cancelled: () => boolean) {
  let batch = new Map<number, Size>();
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber).catch(() => null);
    if (cancelled()) return;
    if (page) {
      const { width, height } = page.getViewport({ scale: 1 });
      batch.set(pageNumber, { width, height });
    }
    if (batch.size >= SIZE_BATCH || pageNumber === pdf.numPages) {
      publish(batch);
      batch = new Map();
    }
  }
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');
const subscribeDark = (onChange: () => void) => {
  const query = darkQuery();
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

/** Whether the app is dark: the Sunstead theme if there is one, else the system. */
function useIsDark(): boolean {
  const theme = useContext(ThemeContext);
  const system = useSyncExternalStore(
    subscribeDark,
    () => darkQuery().matches,
    () => false,
  );
  return theme ? theme.resolved.scheme === 'dark' : system;
}

/**
 * A PDF, drawn with pdf.js: pages virtualized as you scroll, fit page, fit
 * width or a chosen zoom (Ctrl/Cmd+wheel and pinch too), find, thumbnails and
 * outline, working links, and dimmed pages for dark themes.
 *
 * Lazy-load it: pdf.js is large, and this entry point is the only thing that
 * pulls it in.
 */
export function PdfViewer(props: PdfViewerProps) {
  const [attempt, setAttempt] = useState(0);
  // A new file, or a retry, starts over: page sizes, which pages are mounted
  // and where we were all belong to the old document.
  return <PdfDocumentView key={`${props.url}\n${attempt}`} {...props} onRetry={() => setAttempt((n) => n + 1)} />;
}

type PasswordRequest = { submit: (password: string) => void; incorrect: boolean };

function PdfDocumentView({
  url,
  title,
  initialFind,
  cMapUrl,
  standardFontDataUrl,
  className,
  onRetry,
}: PdfViewerProps & { onRetry: () => void }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [hasOutline, setHasOutline] = useState(false);
  const [password, setPassword] = useState<PasswordRequest | null>(null);
  const [failed, setFailed] = useState(false);
  const [intrinsic, setIntrinsic] = useState<Map<number, { width: number; height: number }>>(() => new Map());
  const [mountedPages, setMountedPages] = useState<Set<number>>(() => new Set([1]));
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState<{ mode: ZoomMode; scale: number }>({ mode: 'fit-page', scale: 1 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [findFocus, setFindFocus] = useState(0);
  const [dimChoice, setDimChoice] = useState<boolean | null>(readDimChoice);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  // Also kept in a ref: react-pdf holds on to the first `onItemClick` it is
  // given, so link handling must not close over a render's state.
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const devicePixelRatio = useScreenDensity();
  const isDark = useIsDark();
  const dim = dimChoice ?? isDark;

  const columnRef = useRef<HTMLDivElement>(null);
  const pageNodes = useRef(new Map<number, HTMLDivElement>());

  const numPages = pdf?.numPages ?? 0;
  const find = usePdfFind(pdf, initialFind ?? '');

  // react-pdf reloads the document whenever these change identity.
  const file = useMemo(() => ({ url }), [url]);
  const options = useMemo(
    () => ({
      cMapUrl,
      cMapPacked: true,
      standardFontDataUrl,
      // Glyph widths, for placing find highlights (`glyph-offsets.ts`).
      fontExtraProperties: true,
    }),
    [cMapUrl, standardFontDataUrl],
  );

  const baseSize = intrinsic.get(1) ?? FALLBACK_SIZE;
  const scale = fitScale(zoom.mode, zoom.scale, viewport, baseSize, PAGE_MARGIN, ZOOM_LIMITS);
  const setScale = (next: number) => setZoom({ mode: 'custom', scale: clampScale(next, ZOOM_LIMITS) });

  usePdfZoom(scroller, columnRef, PAGE_MARGIN, ZOOM_LIMITS, scale, setScale);

  // -- measurement and windowing --------------------------------------

  /*
   * Observers are bound to each page as it registers, not gathered once in an
   * effect: a reload remounts every page as a new node with the same count,
   * and an effect keyed on the count would keep watching detached nodes.
   */
  const viewportObserver = useRef<ResizeObserver | null>(null);
  const windowObserver = useRef<IntersectionObserver | null>(null);
  const currentPageObserver = useRef<IntersectionObserver | null>(null);

  const observePage = useCallback((node: HTMLDivElement) => {
    windowObserver.current?.observe(node);
    currentPageObserver.current?.observe(node);
  }, []);

  /** Attaches the scroller and everything that watches it. */
  const attachScroller = useCallback(
    (root: HTMLDivElement | null) => {
      viewportObserver.current?.disconnect();
      windowObserver.current?.disconnect();
      currentPageObserver.current?.disconnect();
      viewportObserver.current = null;
      windowObserver.current = null;
      currentPageObserver.current = null;

      scrollerRef.current = root;
      setScroller(root);
      if (!root) return;

      viewportObserver.current = new ResizeObserver(([entry]) => {
        setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
      });
      viewportObserver.current.observe(root);

      windowObserver.current = new IntersectionObserver(
        (entries) => {
          setMountedPages((previous) => {
            const next = new Set(previous);
            let changed = false;
            for (const entry of entries) {
              const page = Number((entry.target as HTMLElement).dataset.page);
              if (entry.isIntersecting === next.has(page)) continue;
              if (entry.isIntersecting) next.add(page);
              else next.delete(page);
              changed = true;
            }
            return changed ? next : previous;
          });
        },
        { root, rootMargin: RENDER_MARGIN },
      );

      currentPageObserver.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setCurrentPage(Number((entry.target as HTMLElement).dataset.page));
          }
        },
        { root, rootMargin: CURRENT_PAGE_MARGIN },
      );

      // Pages that registered before the scroller did.
      for (const node of pageNodes.current.values()) observePage(node);
    },
    [observePage],
  );

  const registerNode = useCallback(
    (pageNumber: number, node: HTMLDivElement | null) => {
      const previous = pageNodes.current.get(pageNumber);
      if (previous && previous !== node) {
        windowObserver.current?.unobserve(previous);
        currentPageObserver.current?.unobserve(previous);
      }
      if (node) {
        pageNodes.current.set(pageNumber, node);
        observePage(node);
      } else {
        pageNodes.current.delete(pageNumber);
      }
    },
    [observePage],
  );

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    void readPageSizes(
      pdf,
      (sizes) =>
        setIntrinsic((previous) => {
          const next = new Map(previous);
          for (const [page, size] of sizes) next.set(page, size);
          return next;
        }),
      () => cancelled,
    );
    return () => {
      cancelled = true;
    };
  }, [pdf]);

  const onIntrinsicSize = useCallback((pageNumber: number, size: { width: number; height: number }) => {
    setIntrinsic((previous) => {
      const known = previous.get(pageNumber);
      if (known && known.width === size.width && known.height === size.height) return previous;
      const next = new Map(previous);
      next.set(pageNumber, size);
      return next;
    });
  }, []);

  const goToPage = useCallback((pageNumber: number) => {
    const node = pageNodes.current.get(pageNumber);
    if (scrollerRef.current && node) scrollWithin(scrollerRef.current, node, 'start', PAGE_GAP);
  }, []);

  /** An internal link or outline entry: the page react-pdf found, or ours. */
  const followDestination = useCallback(
    ({ dest, pageNumber }: { dest?: unknown; pageNumber?: number }) => {
      if (pageNumber && pageNumber >= 1) {
        goToPage(pageNumber);
      } else if (pdfRef.current) {
        void destinationPage(pdfRef.current, dest).then((page) => page && goToPage(page));
      }
    },
    [goToPage],
  );

  /*
   * Brings the current match into view, centred. Its mark only exists once
   * its page has mounted and drawn its text layer, so this goes to the page,
   * then retries briefly until the mark is there, and records which match it
   * landed on so scrolling away afterwards is left alone.
   */
  const { activeMatch, activePage, query } = find;
  const scrolledTo = useRef<string | null>(null);
  // Not before the first page has its real size: fitting to it rescales
  // every page and would carry the match off screen again.
  const laidOut = viewport.width > 0 && intrinsic.size > 0;
  useEffect(() => {
    if (activeMatch < 0 || activePage === null || !scroller || !laidOut) return;
    const key = `${query}\n${activeMatch}`;
    if (scrolledTo.current === key) return;

    let attempts = 0;
    let timer = 0;
    const tryScroll = () => {
      const mark = scroller.querySelector<HTMLElement>(`[data-page="${activePage}"] mark[data-match="${activeMatch}"]`);
      if (mark) {
        scrollWithin(scroller, mark, 'center');
        scrolledTo.current = key;
        return;
      }
      if (attempts === 0) goToPage(activePage);
      if (attempts < 40) {
        attempts += 1;
        timer = window.setTimeout(tryScroll, 50);
      }
    };
    tryScroll();
    return () => window.clearTimeout(timer);
  }, [activeMatch, activePage, query, scroller, laidOut, goToPage]);

  const openFind = () => {
    find.setOpen(true);
    setFindFocus((n) => n + 1);
  };

  const toggleDim = () => {
    writeDimChoice(!dim);
    setDimChoice(!dim);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      openFind();
      return;
    }
    if (event.key === 'Escape' && find.open) {
      find.setOpen(false);
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.metaKey || event.ctrlKey || event.altKey || numPages === 0) return;

    const to =
      event.key === 'PageDown'
        ? currentPage + 1
        : event.key === 'PageUp'
          ? currentPage - 1
          : event.key === 'Home'
            ? 1
            : event.key === 'End'
              ? numPages
              : null;
    if (to === null) return;
    event.preventDefault();
    goToPage(Math.min(Math.max(to, 1), numPages));
  };

  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('password');
    if (!password || typeof value !== 'string') return;
    password.submit(value);
    setPassword(null);
  };

  return (
    <div
      role='region'
      aria-label={title ?? 'PDF document'}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={cn('relative flex h-full min-h-0 w-full overflow-hidden bg-muted outline-none', dim && DIM_FILTER, className)}
    >
      <Document
        file={file}
        options={options}
        className='flex min-h-0 min-w-0 flex-1'
        externalLinkTarget='_blank'
        externalLinkRel='noopener noreferrer'
        onItemClick={followDestination}
        onLoadSuccess={(loaded) => {
          pdfRef.current = loaded;
          setPdf(loaded);
          setPassword(null);
          loaded.getOutline().then(
            (outline) => setHasOutline(Boolean(outline?.length)),
            () => setHasOutline(false),
          );
        }}
        onPassword={(callback, reason) =>
          setPassword({ submit: callback, incorrect: reason === 2 /* PasswordResponses.INCORRECT_PASSWORD */ })
        }
        onLoadError={() => setFailed(true)}
        onSourceError={() => setFailed(true)}
        // Drawn below instead, over the whole viewer.
        loading=''
        error=''
        noData=''
      >
        {sidebarOpen && numPages > 0 && (
          <PdfSidebar
            numPages={numPages}
            currentPage={currentPage}
            sizes={intrinsic}
            fallbackSize={baseSize}
            hasOutline={hasOutline}
            onPage={goToPage}
            onOutlineItem={followDestination}
          />
        )}

        <div className='relative min-w-0 flex-1'>
          <div
            ref={attachScroller}
            tabIndex={0}
            aria-label='Pages'
            className='absolute inset-0 overflow-auto overscroll-contain outline-none'
          >
            {/* Padding on the column, not the scroller, so the first page's shadow is not clipped. */}
            <div
              ref={columnRef}
              className='flex w-max min-w-full flex-col items-center'
              style={{ padding: PAGE_MARGIN, paddingBottom: TOOLBAR_CLEARANCE, gap: PAGE_GAP }}
            >
              {Array.from({ length: numPages }, (_, index) => {
                const pageNumber = index + 1;
                const size = intrinsic.get(pageNumber) ?? baseSize;
                const matches = find.matchesByPage[index];
                return (
                  <PdfPage
                    key={pageNumber}
                    pageNumber={pageNumber}
                    scale={scale}
                    {...pageBox(size, scale)}
                    outputScale={outputScale(devicePixelRatio, size, scale)}
                    mounted={mountedPages.has(pageNumber) || Math.abs(pageNumber - currentPage) <= NEARBY_PAGES}
                    matches={matches?.count ? matches : undefined}
                    activeMatch={find.activeMatch}
                    onIntrinsicSize={onIntrinsicSize}
                    registerNode={registerNode}
                  />
                );
              })}
            </div>
          </div>

          {find.open && (
            <div className='pointer-events-none absolute top-3 right-3 left-3 flex justify-end'>
              <PdfFindBar
                query={find.query}
                onQuery={find.setQuery}
                total={find.total}
                activeMatch={find.activeMatch}
                indexing={find.indexing}
                onStep={find.step}
                onClose={() => find.setOpen(false)}
                focusRequest={findFocus}
              />
            </div>
          )}

          {numPages > 0 && (
            <div className='pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3'>
              <PdfToolbar
                currentPage={currentPage}
                numPages={numPages}
                onPage={goToPage}
                scale={scale}
                zoomMode={zoom.mode}
                onZoomIn={() => setScale(scale + ZOOM_STEP)}
                onZoomOut={() => setScale(scale - ZOOM_STEP)}
                onZoomMode={(mode) => setZoom({ mode, scale })}
                sidebarOpen={sidebarOpen}
                onSidebar={() => setSidebarOpen((open) => !open)}
                findOpen={find.open}
                onFind={() => (find.open ? find.setOpen(false) : openFind())}
                dim={dim}
                onDim={toggleDim}
                findShortcut={IS_MAC ? 'Cmd+F' : 'Ctrl+F'}
              />
            </div>
          )}
        </div>
      </Document>

      {failed ? (
        <div className='absolute inset-0 flex'>
          <ErrorState onRetry={onRetry} />
        </div>
      ) : password ? (
        <PasswordForm incorrect={password.incorrect} onSubmit={submitPassword} />
      ) : (
        !pdf && (
          <div role='status' className='absolute inset-0 grid place-items-center text-sm text-muted-foreground'>
            Loading PDF
          </div>
        )
      )}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Empty className='flex-1'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <FileWarning />
        </EmptyMedia>
        <EmptyTitle>This PDF could not be opened</EmptyTitle>
        <EmptyDescription>It may be damaged, or the connection dropped while it loaded.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant='outline' size='sm' onClick={onRetry}>
          Retry
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function PasswordForm({ incorrect, onSubmit }: { incorrect: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className='absolute inset-0 grid place-items-center p-6'>
      <form onSubmit={onSubmit} className='flex w-full max-w-xs flex-col items-center gap-3 text-center'>
        <div className='flex size-10 items-center justify-center rounded-lg bg-background text-foreground'>
          <LockKeyhole className='size-5' />
        </div>
        <div className='text-sm font-medium'>This PDF is protected</div>
        <p className='text-sm text-muted-foreground'>
          {incorrect ? 'That password is not right. Try again.' : 'Enter its password to open it.'}
        </p>
        <div className='flex w-full gap-2'>
          <Input
            name='password'
            type='password'
            autoComplete='off'
            aria-label='PDF password'
            aria-invalid={incorrect || undefined}
            placeholder='Password'
            autoFocus
            className='h-8'
          />
          <Button type='submit' size='sm' className='h-8'>
            Open
          </Button>
        </div>
      </form>
    </div>
  );
}
