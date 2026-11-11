# @sunstead/ui

Shared UI for Sunstead apps (Atlas, Cosmos, Solstice): the theme registry and
provider, theme CSS, base tokens, and shadcn primitives on
[Base UI](https://base-ui.com) (style `base-vega` with translucent menus, base
colour neutral). The look is Solstice's: its components came in as they were.

## Themes

24 themes, grouped by scheme only. A tech theme (Hologram, Terminal, Red
Alert, Blueprint) is square, mono and bracketed, but sits under Dark or Light
with the rest, and Follow system can pair it.

- **Dark:** Atlas Dark, Sunstead Dark, Nebula, Aurora, Mars, Event Horizon, Eclipse,
  Deep Field, Stone, Ember, Concrete, Inferno, Hologram, Terminal, Red Alert.
- **Light:** Atlas Light, Sunstead Light, Solar, Lunar, Comet, Orchard, Brutalist,
  Bubblegum, Blueprint.

## Using it

It is **source-only**: there is no build step. Apps import the
`.ts`/`.tsx`/`.css` files and compile them with their own Vite, TypeScript
and Tailwind.

```jsonc
// package.json: pin a tag
"@sunstead/ui": "github:Sunstead/sunstead-ui#v0.3.0"
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
  `utils`, `components/<name>`, `hooks/<name>`, `pdf`.
- **Peers:** react 19, react-dom, tailwindcss 4, lucide-react 1.
- **Each app's `index.html`** paints the stored theme before any script
  runs, from its own copy of the theme ids (`storageKeys(app)` names the
  localStorage keys). Each app tests that copy against `THEMES`.
- **An app's own default:** pass `defaults` to `ThemeProvider`
  (`{ theme, pair }`) and use the same ids in `index.html`'s fallback. Atlas
  defaults to Atlas Dark, paired with Atlas Light; others get Sunstead's.
- **Renamed ids:** pass `aliases` to `ThemeProvider` (and mirror them in
  `index.html`) so old stored values keep working, e.g. Cosmos's
  `cosmos-dark` → `sunstead-dark`.
- **Without the provider:** an app with its own theme settings (Solstice)
  can call `applyTheme(themeById(id))` itself. `[data-theme]` blocks work
  on any element, so a picker can preview a theme by setting `data-theme`
  on a swatch.
- **Touch density:** set `data-touch` on `<html>` where touch is the main
  input (decide once, at startup) and buttons and sidebar rows grow to about
  40pt. Write your own touch sizes with the `touch:` variant.
- **Sidebar `className`** lands on the sidebar's container, which the rail
  hangs half outside: `overflow-hidden` there clips half the rail. Clip the
  inner element instead (`*:data-[sidebar=sidebar]:overflow-hidden`).
- **Working across repos:** `npm link` this repo into the app, or point the
  dependency at `file:../sunstead-ui` locally. Never commit a `file:` path.

## PDF viewer

`@sunstead/ui/pdf` is a pdf.js viewer (react-pdf 10.5.0 on pdfjs-dist
5.4.296, pinned together). It is its own entry point, so an app that never
imports it never bundles pdf.js. Lazy-load it:

```tsx
const PdfViewer = lazy(() => import('@sunstead/ui/pdf').then((m) => ({ default: m.PdfViewer })));

<PdfViewer
  url='/v1/items/abc/blob'
  title='Report.pdf'
  initialFind='quarterly'
  cMapUrl='/pdfjs/cmaps/'
  standardFontDataUrl='/pdfjs/standard_fonts/'
/>
```

| Prop | |
| --- | --- |
| `url` | The PDF. Fetched by pdf.js with the page's cookies. A new URL starts over. |
| `title` | The document's name, for screen readers. |
| `initialFind` | Opens find on this text, at the first match. A new value searches again. |
| `cMapUrl` | Where the app serves `pdfjs-dist/cmaps/`, ending in `/`. |
| `standardFontDataUrl` | Where the app serves `pdfjs-dist/standard_fonts/`, ending in `/`. |
| `className` | On the viewer's root. It fills its parent, so give the parent a height. |

- **Serve the cmaps and standard fonts.** Copy `node_modules/pdfjs-dist/cmaps`
  and `standard_fonts` into the app's static files (with
  `vite-plugin-static-copy`, or a copy step in the build) and pass their URLs.
  Without them, PDFs in CJK and other non-Latin encodings, and PDFs that use
  the standard 14 fonts without embedding them, render with missing or wrong
  glyphs.
- **The worker** is bundled from `pdfjs-dist/build/pdf.worker.min.mjs` by
  `new URL(..., import.meta.url)` (`src/components/pdf/worker.ts`), which
  Vite turns into a chunk. No CDN.
- **What it does:** pages virtualized as you scroll (exact-size placeholders);
  fit page (the default), fit width, or zoom from 20% to 600% with the
  buttons, Ctrl/Cmd+wheel or a pinch; PageUp/PageDown and Home/End; find
  (Cmd/Ctrl-F inside the viewer, Enter and Shift+Enter, Escape to close);
  page thumbnails and the outline in a side rail; internal links scroll,
  external links open in a new tab; password PDFs ask inline; a file that
  fails shows a Retry button.
- **Dim pages** inverts page canvases (`invert(0.88) hue-rotate(180deg)`) for
  dark themes. It follows the theme (on when `useTheme()` is dark, or the
  system is, without a provider) until the reader toggles it; the choice is
  kept in localStorage as `sunstead-pdf-dim`.
- **Peers:** the app needs nothing more than the other exports do; react-pdf
  and pdfjs-dist come with this package. Their CSS (text and annotation
  layers) is imported by the viewer, so the app's bundler must handle CSS
  imports from dependencies (Vite does).

## Developing

```sh
npm install
npm run typecheck
npm run lint
npm test          # theme registry and token checks
```

See `CLAUDE.md` for conventions. Releases are tags (`v0.3.0`); bump
`version` in `package.json` with them.

## Origin

Themes, provider and primitives came from Cosmos (`app/src/themes`,
`app/src/lib/themes.ts`) with the base pair renamed from `cosmos-*` to
`sunstead-*`. The package started in the Atlas repo (`packages/sunstead-ui`)
and was split out with its history in 0.2.0, when the primitives moved from
Radix to Base UI. In 0.3.0 the primitives became Solstice's (base-vega), and
Solstice's themes joined: Stone, Ember, Concrete, Inferno, Orchard, Brutalist
and Bubblegum as they were, the rest merged into their Sunstead lookalikes.
