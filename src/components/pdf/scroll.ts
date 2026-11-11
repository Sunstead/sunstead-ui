/**
 * Scrolls `container` so `node` sits at `block`, without touching any other
 * scroller. `scrollIntoView` would also scroll every ancestor, which drags
 * the whole app about when the viewer sits in a pane.
 */
export function scrollWithin(
  container: HTMLElement,
  node: HTMLElement,
  block: 'start' | 'center' | 'nearest' = 'start',
  offset = 0,
) {
  const box = container.getBoundingClientRect();
  const target = node.getBoundingClientRect();
  const top = target.top - box.top + container.scrollTop;

  if (block === 'start') {
    container.scrollTop = top - offset;
  } else if (block === 'center') {
    container.scrollTop = top - (container.clientHeight - target.height) / 2;
    const left = target.left - box.left + container.scrollLeft;
    if (target.left < box.left || target.right > box.right) {
      container.scrollLeft = left - (container.clientWidth - target.width) / 2;
    }
  } else if (target.top < box.top) {
    container.scrollTop = top - offset;
  } else if (target.bottom > box.bottom) {
    container.scrollTop = top + target.height - container.clientHeight + offset;
  }
}
