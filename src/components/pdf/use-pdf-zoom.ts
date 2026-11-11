import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

import { gestureScale, wheelScale, zoomAboutScroll, type ZoomLimits } from './zoom';

/** How long after the last event a gesture is over. */
const SETTLE_MS = 120;

type Point = { x: number; y: number };

interface Gesture {
  /** The scale the pages are laid out at. */
  from: number;
  /** The scale shown: the column's transform covers the difference. */
  scale: number;
  /** Where the pinch is, from the scroller's corner. */
  at: Point;
}

const midpoint = (a: Touch, b: Touch): Point => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });
const spread = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

/** Shows the column at `ratio` of its layout, about `at` in the scroller. */
function preview(pages: HTMLElement, root: HTMLElement, at: Point, ratio: number) {
  pages.style.transformOrigin = `${root.scrollLeft + at.x}px ${root.scrollTop + at.y}px`;
  pages.style.transform = `scale(${ratio})`;
}

function endPreview(pages: HTMLElement | null) {
  if (pages) pages.style.transform = '';
}

/** The new layout is in: scrolls the gesture's point back under it. */
function scrollBack(root: HTMLElement, { at, from, scale }: Gesture, margin: number) {
  root.scrollLeft = zoomAboutScroll(root.scrollLeft, at.x, from, scale, margin);
  root.scrollTop = zoomAboutScroll(root.scrollTop, at.y, from, scale, margin);
}

/**
 * Pinching and Ctrl/Cmd+wheel over a PDF. What arrives differs by platform: a
 * Ctrl+wheel from Chromium and Firefox, WebKit's
 * gesture events on a Mac, touches on a touchscreen.
 *
 * Every scale remounts every page, so a gesture only transforms the column of
 * pages. It lands on the real scale once it settles, scrolled to keep the
 * point under the fingers where it is.
 */
export function usePdfZoom(
  /** The scrolling element, as state, so the listeners follow it when it appears. */
  scroller: HTMLElement | null,
  column: RefObject<HTMLDivElement | null>,
  margin: number,
  limits: ZoomLimits,
  scale: number,
  onScale: (scale: number) => void,
) {
  const latest = useRef({ scale, onScale });
  useLayoutEffect(() => {
    latest.current = { scale, onScale };
  });

  const gesture = useRef<Gesture | null>(null);
  const landing = useRef<Gesture | null>(null);

  // The new layout is in: drop the transform and put the point back.
  useLayoutEffect(() => {
    const land = landing.current;
    const root = scroller;
    if (!land || !root || scale !== land.scale) return;
    landing.current = null;
    endPreview(column.current);
    scrollBack(root, land, margin);
  }, [scale, scroller, column, margin]);

  useEffect(() => {
    const root = scroller;
    if (!root) return;

    let settle: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      clearTimeout(settle);
      const done = gesture.current;
      gesture.current = null;
      if (!done) return;
      if (done.scale === done.from) {
        endPreview(column.current);
        return;
      }
      landing.current = done;
      latest.current.onScale(done.scale);
    };

    /** Shows `next` at once, about `client`, until the gesture settles. */
    const show = (next: number, client: Point) => {
      const box = root.getBoundingClientRect();
      const at = { x: client.x - box.left, y: client.y - box.top };
      const current = (gesture.current ??= { from: latest.current.scale, scale: next, at });
      current.scale = next;
      current.at = at;
      if (column.current) preview(column.current, root, at, next / current.from);
    };

    const shown = () => gesture.current?.scale ?? latest.current.scale;
    const settleSoon = () => {
      clearTimeout(settle);
      settle = setTimeout(finish, SETTLE_MS);
    };

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      show(wheelScale(shown(), event.deltaY, limits), { x: event.clientX, y: event.clientY });
      settleSoon();
    };

    // Safari's `GestureEvent`, which TypeScript's DOM doesn't declare.
    let gestureStart = 1;
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      gestureStart = shown();
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const { scale: factor, clientX, clientY } = event as Event & { scale: number; clientX: number; clientY: number };
      show(gestureScale(gestureStart, factor, limits), { x: clientX, y: clientY });
      clearTimeout(settle);
    };

    let touchStart: { scale: number; spread: number } | null = null;
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2) {
        touchStart = null;
        return;
      }
      event.preventDefault();
      const [a, b] = [event.touches[0], event.touches[1]];
      touchStart ??= { scale: shown(), spread: spread(a, b) };
      show(gestureScale(touchStart.scale, spread(a, b) / touchStart.spread, limits), midpoint(a, b));
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length >= 2 || !touchStart) return;
      touchStart = null;
      finish();
    };

    root.addEventListener('wheel', onWheel, { passive: false });
    root.addEventListener('gesturestart', onGestureStart);
    root.addEventListener('gesturechange', onGestureChange);
    root.addEventListener('gestureend', finish);
    root.addEventListener('touchmove', onTouchMove, { passive: false });
    root.addEventListener('touchend', onTouchEnd);
    root.addEventListener('touchcancel', onTouchEnd);
    return () => {
      clearTimeout(settle);
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('gesturestart', onGestureStart);
      root.removeEventListener('gesturechange', onGestureChange);
      root.removeEventListener('gestureend', finish);
      root.removeEventListener('touchmove', onTouchMove);
      root.removeEventListener('touchend', onTouchEnd);
      root.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [scroller, column, limits]);
}
