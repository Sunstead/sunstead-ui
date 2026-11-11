import { useState, type ReactElement, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Minus, PanelLeft, Plus, Search, SunMoon } from 'lucide-react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import type { ZoomMode } from './zoom';

/** An icon or text button with a tooltip, pressed when `pressed` is set. */
export function ToolbarButton({
  label,
  shortcut,
  pressed,
  disabled,
  onClick,
  size = 'icon-sm',
  children,
}: {
  label: string;
  shortcut?: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  size?: 'icon-sm' | 'xs';
  children: ReactNode;
}): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size={size}
            variant={pressed ? 'secondary' : 'ghost'}
            aria-label={size === 'xs' ? undefined : label}
            aria-pressed={pressed}
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side='top'>
        {label}
        {shortcut && <span className='text-background/60'>{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

function Separator() {
  return <div className='mx-1 h-5 w-px shrink-0 bg-border' aria-hidden />;
}

function Readout({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('px-1 text-xs whitespace-nowrap text-muted-foreground tabular-nums select-none', className)}>
      {children}
    </span>
  );
}

type PdfToolbarProps = {
  currentPage: number;
  numPages: number;
  onPage: (page: number) => void;
  scale: number;
  zoomMode: ZoomMode;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomMode: (mode: 'fit-width' | 'fit-page') => void;
  sidebarOpen: boolean;
  onSidebar: () => void;
  findOpen: boolean;
  onFind: () => void;
  dim: boolean;
  onDim: () => void;
  findShortcut: string;
};

/**
 * The floating pill along the bottom of the viewer. It scrolls sideways
 * rather than spilling out of a narrow pane.
 */
export function PdfToolbar({
  currentPage,
  numPages,
  onPage,
  scale,
  zoomMode,
  onZoomIn,
  onZoomOut,
  onZoomMode,
  sidebarOpen,
  onSidebar,
  findOpen,
  onFind,
  dim,
  onDim,
  findShortcut,
}: PdfToolbarProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const jumpTo = (raw: string) => {
    setDraft(null);
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isNaN(parsed)) onPage(Math.min(Math.max(parsed, 1), numPages || 1));
  };

  return (
    <div
      role='toolbar'
      aria-label='PDF controls'
      className='pointer-events-auto flex w-max max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border bg-popover/90 p-1 shadow-lg backdrop-blur-xl backdrop-saturate-150 [scrollbar-width:none] animate-in fade-in-0 slide-in-from-bottom-1'
    >
      <ToolbarButton label='Pages and outline' pressed={sidebarOpen} onClick={onSidebar}>
        <PanelLeft />
      </ToolbarButton>

      <Separator />

      <ToolbarButton label='Previous page' disabled={currentPage <= 1} onClick={() => onPage(currentPage - 1)}>
        <ChevronLeft />
      </ToolbarButton>
      <Input
        className='h-7 w-11 px-1 text-center text-xs tabular-nums md:text-xs'
        aria-label='Page number'
        inputMode='numeric'
        value={draft ?? String(currentPage)}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={(event) => jumpTo(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            jumpTo(event.currentTarget.value);
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
      />
      <Readout>of {numPages}</Readout>
      <ToolbarButton label='Next page' disabled={currentPage >= numPages} onClick={() => onPage(currentPage + 1)}>
        <ChevronRight />
      </ToolbarButton>

      <Separator />

      <ToolbarButton label='Zoom out' onClick={onZoomOut}>
        <Minus />
      </ToolbarButton>
      <Readout className='w-11 text-center'>{Math.round(scale * 100)}%</Readout>
      <ToolbarButton label='Zoom in' onClick={onZoomIn}>
        <Plus />
      </ToolbarButton>
      <ToolbarButton size='xs' label='Fit width' pressed={zoomMode === 'fit-width'} onClick={() => onZoomMode('fit-width')}>
        Width
      </ToolbarButton>
      <ToolbarButton size='xs' label='Fit page' pressed={zoomMode === 'fit-page'} onClick={() => onZoomMode('fit-page')}>
        Page
      </ToolbarButton>

      <Separator />

      <ToolbarButton label='Find in document' shortcut={findShortcut} pressed={findOpen} onClick={onFind}>
        <Search />
      </ToolbarButton>
      <ToolbarButton label='Dim pages' pressed={dim} onClick={onDim}>
        <SunMoon />
      </ToolbarButton>
    </div>
  );
}
