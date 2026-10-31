import type { ComponentType, SVGProps } from 'react';
import { AtlasMark } from './brand/atlas';
import { HelionMark } from './brand/helion';
import { SolsticeMark } from './brand/solstice';
import { SolsticeSyncMark } from './brand/solstice-sync';
import type { Product } from '../lib/products';

const MARKS: Record<Product, ComponentType<SVGProps<SVGSVGElement>>> = {
  solstice: SolsticeMark,
  'solstice-sync': SolsticeSyncMark,
  atlas: AtlasMark,
  helion: HelionMark,
};

interface ProductIconProps extends SVGProps<SVGSVGElement> {
  product: Product;
  size?: number;
}

/**
 * A Sunstead product's icon. Helion's follows the theme (`--mark-0`,
 * `--mark-1`); the others are tiles with their own ground.
 */
export function ProductIcon({ product, size = 24, ...props }: ProductIconProps) {
  const Mark = MARKS[product];
  return <Mark width={size} height={size} aria-hidden {...props} />;
}
