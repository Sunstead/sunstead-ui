/** Where the dim pages choice is kept, shared by every app on the origin. */
export const DIM_STORAGE_KEY = 'sunstead-pdf-dim';

/** The stored choice, or null when there is none (follow the theme). */
export function readDimChoice(): boolean | null {
  try {
    const value = localStorage.getItem(DIM_STORAGE_KEY);
    return value === null ? null : value === '1';
  } catch {
    return null;
  }
}

export function writeDimChoice(dim: boolean) {
  try {
    localStorage.setItem(DIM_STORAGE_KEY, dim ? '1' : '0');
  } catch {}
}
