#!/usr/bin/env node
/**
 * src/assets/brand/ is where every Sunstead icon lives for everything that
 * shows another product's icon (ProductIcon, the website). Solstice, Solstice
 * Sync and Atlas draw theirs in their own repos, so this copies them in from
 * sibling checkouts under ~/Documents/Code, then rebuilds the components. Helion's
 * tile, Swindle Games' and the Sunstead mark are edited here directly.
 *
 *   npm run sync:brand
 */
import { copyFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const code = path.resolve(root, '..');

const SOURCES = {
  solstice: 'Solstice/apps/desktop/src/assets/icons/app/icon_square.svg',
  'solstice-sync': 'Solstice/apps/sync/icon.svg',
  atlas: 'Atlas/app/public/icon_app_3.svg',
};

for (const [id, rel] of Object.entries(SOURCES)) {
  const from = path.join(code, rel);
  if (!existsSync(from)) {
    console.warn(`skipped ${id}: ${from} not found`);
    continue;
  }
  copyFileSync(from, path.join(root, 'src/assets/brand', `${id}.svg`));
  console.log(`${id} <- ${rel}`);
}

execFileSync('node', [path.join(root, 'scripts/build-brand.mjs')], { stdio: 'inherit' });
