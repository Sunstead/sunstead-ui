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
- **Themes:** one `[data-theme='<id>']` block in `src/themes/<file>.css`,
  imported from `styles.css`, plus an entry in `src/lib/themes.ts`. Every
  theme defines exactly the same tokens as `sunstead-dark`
  (`themes.test.ts`), meets WCAG AA for text on its surfaces, and keeps the
  metric colours apart. Solstice's themes are exempt only where they already
  fell short (`SOLSTICE_FLOORS`). `--radius` is optional (the base is
  0.5rem). The border is given twice, as `--border` and as
  `--border-color` plus `--border-opacity`, and the test checks they agree.
  `--popover` is opaque. Tech themes (`style: 'tech'`) are square and mono,
  but are grouped by scheme like the rest; there is no Tech group.
- **Tech brackets** in `styles.css` select by `data-slot`; a new floating
  primitive gets its slot added there.
- **Releases:** bump `version`, tag `vX.Y.Z`, and update each app's pinned
  tag. Breaking changes (renamed exports, ids or tokens) need a note in the
  tag message and an `aliases` path where stored values are involved.
- UI copy: sentence case, no em dashes or curly quotes.
