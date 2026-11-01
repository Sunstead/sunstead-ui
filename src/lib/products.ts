/** The Sunstead products, by the id their icon and the website use. */
export const PRODUCTS = [
  { id: 'solstice', name: 'Solstice', tagline: 'Local-first Markdown notes' },
  { id: 'solstice-sync', name: 'Solstice Sync', tagline: 'Sync for Solstice vaults' },
  { id: 'atlas', name: 'Atlas', tagline: 'One search over your data' },
  { id: 'helion', name: 'Helion', tagline: 'Your homelab, in one place' },
  { id: 'swindle-games', name: 'Swindle Games', tagline: 'Party games in your browser' },
] as const;

export type Product = (typeof PRODUCTS)[number]['id'];

export function isProduct(id: string): id is Product {
  return PRODUCTS.some((p) => p.id === id);
}
