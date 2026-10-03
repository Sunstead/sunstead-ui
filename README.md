# @sunstead/ui

Shared UI for Sunstead apps (Atlas, Cosmos, Solstice): the theme registry and
provider, theme CSS, base tokens, and shadcn primitives on
[Base UI](https://base-ui.com) (style `base-nova`, base colour neutral).

## Using it

It is **source-only**: there is no build step. Apps import the
`.ts`/`.tsx`/`.css` files and compile them with their own Vite, TypeScript
and Tailwind.

```jsonc
// package.json: pin a tag
"@sunstead/ui": "github:Sunstead/sunstead-ui#v0.2.0"
```

```css
/* the app's main CSS */
@import 'tailwindcss';
@import '@sunstead/ui/styles.css';
@source '../node_modules/@sunstead/ui/src';
```

```tsx
import { ThemeProvider } from '@sunstead/ui/theme-provider';
import { Button } from '@sunstead/ui/components/button';

<ThemeProvider app="atlas">...</ThemeProvider>
```

- **Exports:** `styles.css`, `themes`, `theme-provider`, `use-theme`,
  `utils`, `components/<name>`, `hooks/<name>`.
- **Peers:** react 19, react-dom, tailwindcss 4, lucide-react 1.
- **Each app's `index.html`** paints the stored theme before any script
  runs, from its own copy of the theme ids (`storageKeys(app)` names the
  localStorage keys). Each app tests that copy against `THEMES`.
- **Renamed ids:** pass `aliases` to `ThemeProvider` (and mirror them in
  `index.html`) so old stored values keep working, e.g. Cosmos's
  `cosmos-dark` → `sunstead-dark`.
- **Working across repos:** `npm link` this repo into the app, or point the
  dependency at `file:../sunstead-ui` locally. Never commit a `file:` path.

## Developing

```sh
npm install
npm run typecheck
npm run lint
npm test          # theme registry and token checks
```

See `CLAUDE.md` for conventions. Releases are tags (`v0.2.0`); bump
`version` in `package.json` with them.

## Origin

Themes, provider and primitives came from Cosmos (`app/src/themes`,
`app/src/lib/themes.ts`) with the base pair renamed from `cosmos-*` to
`sunstead-*`. The package started in the Atlas repo (`packages/sunstead-ui`)
and was split out with its history in 0.2.0, when the primitives moved from
Radix to Base UI.
