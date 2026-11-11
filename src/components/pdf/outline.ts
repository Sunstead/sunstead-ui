/** The parts of a pdf.js document that resolve a destination. */
export interface DestinationResolver {
  getDestination(id: string): Promise<unknown[] | null>;
  getPageIndex(ref: { num: number; gen: number }): Promise<number>;
}

const isRef = (value: unknown): value is { num: number; gen: number } =>
  typeof value === 'object' && value !== null && 'num' in value && 'gen' in value;

/**
 * The 1-based page an outline entry or internal link points at, or null.
 *
 * A destination is either a name (looked up in the document) or an explicit
 * array whose first entry is the target page: a reference to the page object,
 * or, in some files, a plain zero-based page index.
 */
export async function destinationPage(doc: DestinationResolver, dest: unknown): Promise<number | null> {
  try {
    const explicit = typeof dest === 'string' ? await doc.getDestination(dest) : dest;
    if (!Array.isArray(explicit) || explicit.length === 0) return null;
    const [target] = explicit;
    if (typeof target === 'number' && Number.isInteger(target) && target >= 0) return target + 1;
    if (isRef(target)) return (await doc.getPageIndex(target)) + 1;
    return null;
  } catch {
    return null;
  }
}
