import { useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

import { Input } from '../ui/input';
import { ToolbarButton } from './pdf-toolbar';

type PdfFindBarProps = {
  query: string;
  onQuery: (query: string) => void;
  total: number;
  activeMatch: number;
  indexing: boolean;
  onStep: (direction: 1 | -1) => void;
  onClose: () => void;
  /** Bumped to move focus into the box (Cmd/Ctrl-F while it is open). */
  focusRequest: number;
};

/** Find in document: top right, over the pages. */
export function PdfFindBar({ query, onQuery, total, activeMatch, indexing, onStep, onClose, focusRequest }: PdfFindBarProps) {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusRequest === 0) return;
    input.current?.focus();
    input.current?.select();
  }, [focusRequest]);

  const searching = query.trim() !== '';
  const count = !searching
    ? ''
    : total === 0
      ? indexing
        ? 'Searching'
        : 'No matches'
      : `${activeMatch + 1} of ${total}${indexing ? '+' : ''}`;

  return (
    <div
      role='search'
      className='pointer-events-auto flex items-center gap-0.5 rounded-xl border bg-popover/90 p-1 shadow-lg backdrop-blur-xl backdrop-saturate-150 animate-in fade-in-0 slide-in-from-top-1'
    >
      <Input
        ref={input}
        className='h-7 w-40 px-2 text-xs md:text-xs'
        aria-label='Find in document'
        placeholder='Find in document'
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onStep(event.shiftKey ? -1 : 1);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
      />
      <span aria-live='polite' className='min-w-16 px-1 text-center text-xs whitespace-nowrap text-muted-foreground tabular-nums select-none'>
        {count}
      </span>
      <ToolbarButton label='Previous match' shortcut='Shift+Enter' disabled={total === 0} onClick={() => onStep(-1)}>
        <ChevronUp />
      </ToolbarButton>
      <ToolbarButton label='Next match' shortcut='Enter' disabled={total === 0} onClick={() => onStep(1)}>
        <ChevronDown />
      </ToolbarButton>
      <ToolbarButton label='Close find' shortcut='Esc' onClick={onClose}>
        <X />
      </ToolbarButton>
    </div>
  );
}
