# CLAUDE.md

## Overview

`@sunstead/ui` is the shared UI package for Sunstead apps: themes, tokens,
the theme provider and shadcn primitives on Base UI. It is consumed as
source by Atlas, Cosmos and Solstice, so anything here ships into all of
them. Keep it free of anything app-specific.

## Commands

```sh
npm install
npm run typecheck     # tsc, strict
npm run lint          # eslint, 0 warnings expected
npm test              # vitest: theme registry and token checks
npx shadcn@latest add <component> --overwrite
```

## Conventions

- **Source-only.** No build step, no `dist/`. Every export in
  `package.json` points at a source file.
- **Relative imports only** inside the package (`../../lib/utils`), never
  `@/`: in an app, `@/` means the app's own `src/`. The tsconfig `@/*` path
  exists only so the shadcn CLI can write files.
- **Primitives** live in `src/components/ui/`, style `base-vega` with
  `menuColor: default-translucent`. They are Solstice's, class for class,
  so Solstice looks exactly as it did before it adopted this package: change
  one only on purpose, knowing every app changes with it. After
  `shadcn add`, rewrite its imports: `from "cn"` → `from "../../lib/utils"`,
  `@/components/ui/x` → `./x`, `@/hooks/x` → `../../hooks/x`. Then reapply
  the Sunstead tweaks below, since `--overwrite` drops them.
- **Tweaks to shadcn** (keep when regenerating):
  - Floating surfaces are translucent: `bg-popover/70` with a
    `before:backdrop-blur-2xl` layer (what `default-translucent` generates).
    Popover and hover-card carry it by hand, since the registry stopped
    generating it for them. Themes keep `--popover` opaque.
  - From Solstice: collapsible animates its height (`keepMounted`), popover
    has `PopoverClose`, and the destructive menu items stay neutral on hover.
  - `resizable-sidebar` is Solstice's fork of `sidebar`: a draggable rail
    (`SidebarRail` `minWidth`/`maxWidth`), with width reported through
    `onWidthChange` so the app persists it.
  - `sonner` follows `useTheme()`, not next-themes, and is translucent too.
  - `use-mobile` uses `useSyncExternalStore`.
  - `.glass` stays as a utility for app chrome (Cosmos uses it); the
    primitives no longer use it.
  - `calendar` is shadcn's (react-day-picker). `date-picker` and
    `time-picker` are Sunstead's own, built on it and `popover`: values are
    `YYYY-MM-DD` and `HH:MM` strings, and the time picker reads typed times
    (`4pm`, `930`).
- **PDF viewer** (`src/components/pdf/`, exported alone as `@sunstead/ui/pdf`
  so pdf.js stays out of apps that don't use it). Ported from Solstice's
  viewer (`apps/desktop/src/components/viewer/pdf-*.tsx`, `lib/pdf/*`), with
  Solstice's find store, command registry and Milkdown search replaced by
  `use-pdf-find.ts` and a plain case-insensitive matcher (`search.ts`).
  - `react-pdf` and `pdfjs-dist` are pinned exactly and must move together:
    `pdfjs-dist` is the version react-pdf depends on, or the API and the
    worker disagree at runtime (`worker.ts`).
  - Apps serve `pdfjs-dist/cmaps/` and `standard_fonts/` and pass
    `cMapUrl` and `standardFontDataUrl`; the viewer memoizes `options` and
    `file` (react-pdf reloads on a new identity).
  - Virtualization: exact-size placeholders (every page's size is read up
    front), an IntersectionObserver at `200%` rootMargin, the two pages
    either side of the current one always mounted, and a middle-band
    observer for the current page. Thumbnails are virtualized the same way.
  - Zoom: fit page (default), fit width, custom 0.2 to 6. Ctrl/Cmd+wheel and
    pinch preview with a CSS transform on the column and land on the real
    scale when the gesture settles (`use-pdf-zoom.ts`).
  - Find highlights are `<mark>`s from `customTextRenderer`, placed by glyph
    widths (`glyph-offsets.ts`, needs `fontExtraProperties`) and styled
    inline from `--primary`, so the package ships no stylesheet.
  - react-pdf keeps the first `onItemClick` it gets, so link handling reads
    the scroller and document through refs, never render state.
  - Scrolling uses `scrollWithin` (`scroll.ts`), not `scrollIntoView`, so a
    viewer in a pane never scrolls the app around it.
  - Dim pages: canvases only, plus blank sheets (`data-sheet`) in the
    colour white dims to. Follows the theme until toggled, then
    localStorage `sunstead-pdf-dim`.
  - Tests cover the pure parts: zoom maths, output scale, find matching,
    glyph offsets and outline destinations.
- **Themes:** one `[data-theme='<id>']` block in `src/themes/<file>.css`,
  imported from `styles.css`, plus an entry in `src/lib/themes.ts`. Every
  theme defines exactly the same tokens as `sunstead-dark`
  (`themes.test.ts`), meets WCAG AA for text on its surfaces, and keeps the
  metric colours apart, with no exemptions. `--radius` is optional (the base is
  0.5rem). The border is given twice, as `--border` and as
  `--border-color` plus `--border-opacity`, and the test checks they agree.
  `--popover` is opaque. The `--button-*` tokens are optional and all or
  nothing: they bevel the primary button (a gradient fill, light and dark
  edges, its own text colour, checked at 4.5:1 mid-gradient), and live in
  `buttonVariants` so links styled as buttons get them too. Tech themes (`style: 'tech'`) are square and mono,
  but are grouped by scheme like the rest; there is no Tech group.
- **Tech brackets** in `styles.css` select by `data-slot`; a new floating
  primitive gets its slot added there.
- **Releases:** bump `version`, tag `vX.Y.Z`, and update each app's pinned
  tag. Breaking changes (renamed exports, ids or tokens) need a note in the
  tag message and an `aliases` path where stored values are involved.
- UI copy: sentence case, no em dashes or curly quotes.

## Product icons

`src/assets/brand/` is the one home of every Sunstead icon: each product's app
icon (`<product>.svg`, a tile with its own ground)
and the Sunstead mark (`sunstead.svg`). Change an icon here and everything that
shows it follows: `ProductIcon` (`@sunstead/ui/product-icon`), `SunsteadMark`
(`@sunstead/ui/sunstead-mark`), the raw files (`@sunstead/ui/brand/<id>`) and
the website, which copies them (`npm run sync:icons` there). Solstice, Solstice
Sync and Atlas draw theirs in their own repos; `npm run sync:brand` copies them
in from sibling checkouts. Helion's tile, Swindle Games' and the mark are edited
here. `npm run build:brand` turns the SVGs into `src/components/brand/*.tsx`
(generated, committed) so consumers need no SVG loader; ids are prefixed per
icon. `PRODUCTS` lists the products (`@sunstead/ui/products`). An SVG comment
must not contain `--` (svgo refuses it).
