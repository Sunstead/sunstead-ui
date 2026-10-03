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
- **Primitives** live in `src/components/ui/`, style `base-nova`. After
  `shadcn add`, rewrite its imports: `from "cn"` → `from "../../lib/utils"`,
  `@/components/ui/x` → `./x`, `@/hooks/x` → `../../hooks/x`. Then reapply
  the Sunstead tweaks below, since `--overwrite` drops them.
- **Sunstead tweaks to shadcn** (keep when regenerating):
  - `glass` on floating surfaces: card, dialog, popover, dropdown-menu
    content and sub-content, select content, hover-card, sonner toasts.
  - Overflow: dialog `max-h-[calc(100%-2rem)] overflow-y-auto
    grid-cols-[minmax(0,1fr)] wrap-anywhere` (plus `pr-8` on the header when
    it has a close button); popover and hover-card `max-w-(--available-width)`;
    select trigger `min-w-0` with a clipped value, select content
    `max-w-[calc(100vw-2rem)] wrap-anywhere`.
  - `sonner` follows `useTheme()`, not next-themes.
  - `use-mobile` uses `useSyncExternalStore`.
- **Themes:** one `[data-theme='<id>']` block in `src/themes/<file>.css`,
  imported from `styles.css`, plus an entry in `src/lib/themes.ts`. Every
  theme defines exactly the same tokens as `sunstead-dark`
  (`themes.test.ts`), meets WCAG AA for text on its surfaces, and keeps the
  metric colours apart. Tech themes (`style: 'tech'`) are square and mono.
- **Tech brackets** in `styles.css` select by `data-slot`; a new floating
  primitive gets its slot added there.
- **Releases:** bump `version`, tag `vX.Y.Z`, and update each app's pinned
  tag. Breaking changes (renamed exports, ids or tokens) need a note in the
  tag message and an `aliases` path where stored values are involved.
- UI copy: sentence case, no em dashes or curly quotes.
