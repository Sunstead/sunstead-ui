import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Outline, Thumbnail } from 'react-pdf';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../../lib/utils';
import { scrollWithin } from './scroll';

const THUMB_WIDTH = 120;
const THUMB_MARGIN = '200% 0px';

type Size = { width: number; height: number };

type PdfSidebarProps = {
  numPages: number;
  currentPage: number;
  /** Known page sizes, and the size to assume for the rest. */
  sizes: Map<number, Size>;
  fallbackSize: Size;
  hasOutline: boolean;
  onPage: (page: number) => void;
  /** An outline entry: react-pdf's resolved page, or its destination. */
  onOutlineItem: (args: { dest?: unknown; pageNumber?: number }) => void;
};

const Thumb = memo(function Thumb({
  pageNumber,
  height,
  current,
  mounted,
  onPage,
  register,
}: {
  pageNumber: number;
  height: number;
  current: boolean;
  mounted: boolean;
  onPage: (page: number) => void;
  register: (page: number, node: HTMLElement | null) => void;
}) {
  const ref = useCallback((node: HTMLDivElement | null) => register(pageNumber, node), [register, pageNumber]);
  // `<Thumbnail>` is its own link, so the frame is not a button; a click on
  // a placeholder still jumps.
  return (
    <div
      ref={ref}
      data-page={pageNumber}
      aria-current={current ? 'page' : undefined}
      className='group flex flex-col items-center gap-1 p-1'
    >
      <div
        data-sheet=''
        onClick={mounted ? undefined : () => onPage(pageNumber)}
        className={cn(
          'cursor-pointer overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-foreground/10 transition-shadow [&_a]:block [&_a]:outline-none [&_canvas]:block [&:has(a:focus-visible)]:ring-3 [&:has(a:focus-visible)]:ring-ring/50',
          current ? 'ring-2 ring-primary' : 'group-hover:ring-foreground/30',
        )}
        style={{ width: THUMB_WIDTH, height }}
      >
        {mounted && (
          <Thumbnail pageNumber={pageNumber} width={THUMB_WIDTH} loading='' onItemClick={() => onPage(pageNumber)} />
        )}
      </div>
      <span className={cn('text-xs tabular-nums', current ? 'text-foreground' : 'text-muted-foreground')}>
        {pageNumber}
      </span>
    </div>
  );
});

/** Page thumbnails, virtualized like the pages themselves. */
function PageThumbnails({ numPages, currentPage, sizes, fallbackSize, onPage }: Omit<PdfSidebarProps, 'hasOutline' | 'onOutlineItem'>) {
  const [mounted, setMounted] = useState<Set<number>>(() => new Set());
  const scroller = useRef<HTMLDivElement | null>(null);
  const nodes = useRef(new Map<number, HTMLElement>());
  const observer = useRef<IntersectionObserver | null>(null);

  const attach = useCallback((root: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    scroller.current = root;
    if (!root) return;
    observer.current = new IntersectionObserver(
      (entries) =>
        setMounted((previous) => {
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
        }),
      { root, rootMargin: THUMB_MARGIN },
    );
    for (const node of nodes.current.values()) observer.current.observe(node);
  }, []);

  const register = useCallback((page: number, node: HTMLElement | null) => {
    const previous = nodes.current.get(page);
    if (previous && previous !== node) observer.current?.unobserve(previous);
    if (node) {
      nodes.current.set(page, node);
      observer.current?.observe(node);
    } else {
      nodes.current.delete(page);
    }
  }, []);

  // Keeps the current page's thumbnail in view as the reader scrolls.
  useEffect(() => {
    const node = nodes.current.get(currentPage);
    if (scroller.current && node) scrollWithin(scroller.current, node, 'nearest', 8);
  }, [currentPage]);

  return (
    <div ref={attach} className='h-full overflow-y-auto overscroll-contain'>
      <div className='flex flex-col items-center gap-2 px-2 py-3'>
        {Array.from({ length: numPages }, (_, index) => {
          const pageNumber = index + 1;
          const size = sizes.get(pageNumber) ?? fallbackSize;
          return (
            <Thumb
              key={pageNumber}
              pageNumber={pageNumber}
              height={Math.round((THUMB_WIDTH * size.height) / size.width)}
              current={pageNumber === currentPage}
              mounted={mounted.has(pageNumber) || Math.abs(pageNumber - currentPage) <= 2}
              onPage={onPage}
              register={register}
            />
          );
        })}
      </div>
    </div>
  );
}

/** The left rail: page thumbnails, and the outline when the PDF has one. */
export function PdfSidebar(props: PdfSidebarProps) {
  const { hasOutline, onOutlineItem } = props;
  const [tab, setTab] = useState<'pages' | 'outline'>('pages');
  const shown = hasOutline ? tab : 'pages';

  return (
    <aside
      aria-label='Pages and outline'
      className='flex w-44 shrink-0 flex-col border-r bg-background/70 animate-in fade-in-0 slide-in-from-left-2'
    >
      <Tabs value={shown} onValueChange={(value) => setTab(value as 'pages' | 'outline')} className='min-h-0 flex-1 gap-0'>
        <div className='border-b px-2 py-1.5'>
          <TabsList className='h-8 w-full'>
            <TabsTrigger value='pages' className='text-xs'>
              Pages
            </TabsTrigger>
            {hasOutline && (
              <TabsTrigger value='outline' className='text-xs'>
                Outline
              </TabsTrigger>
            )}
          </TabsList>
        </div>
        <TabsContent value='pages' className='min-h-0'>
          <PageThumbnails {...props} />
        </TabsContent>
        {hasOutline && (
          <TabsContent value='outline' className='min-h-0 overflow-y-auto overscroll-contain'>
            <Outline
              onItemClick={onOutlineItem}
              className='px-2 py-2 text-xs [&_a]:block [&_a]:cursor-pointer [&_a]:truncate [&_a]:rounded-sm [&_a]:px-2 [&_a]:py-1 [&_a]:text-foreground/80 [&_a:hover]:bg-muted [&_a:hover]:text-foreground [&_li]:list-none [&_ul]:m-0 [&_ul]:p-0 [&_ul_ul]:pl-3'
            />
          </TabsContent>
        )}
      </Tabs>
    </aside>
  );
}
