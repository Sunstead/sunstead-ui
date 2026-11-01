import type { ComponentType, SVGProps } from 'react';
import { AtlasMark } from './brand/atlas';
import { HelionMark } from './brand/helion';
import { SolsticeMark } from './brand/solstice';
import { SolsticeSyncMark } from './brand/solstice-sync';
import { SwindleGamesMark } from './brand/swindle-games';
import type { Product } from '../lib/products';

const MARKS: Record<Product, ComponentType<SVGProps<SVGSVGElement>>> = {
  solstice: SolsticeMark,
  'solstice-sync': SolsticeSyncMark,
  atlas: AtlasMark,
  helion: HelionMark,
  'swindle-games': SwindleGamesMark,
};

interface ProductIconProps extends SVGProps<SVGSVGElement> {
  product: Product;
  size?: number;
}

/**
 * A Sunstead product's icon: its app icon, a tile with its own ground
 * (Swindle Games' is a glyph on none).
 */
export function ProductIcon({ product, size = 24, ...props }: ProductIconProps) {
  const Mark = MARKS[product];
  return <Mark width={size} height={size} aria-hidden {...props} />;
}
