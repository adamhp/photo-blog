import { create } from 'zustand';
import type { Photo } from './photos';
import { manifest } from './photos';

export function focalLabel(focal?: number): string | undefined {
  if (focal === undefined) return undefined;
  return `${Math.round(focal)}mm`;
}

export type FilterState = {
  camera: string[];
  lens: string[];
  focal: string[];
  film: string[];
  tag: string[];
};

export const emptyFilters: FilterState = {
  camera: [],
  lens: [],
  focal: [],
  film: [],
  tag: [],
};

type FilterActions = {
  set: (next: FilterState) => void;
  toggle: (group: keyof FilterState, value: string) => void;
  clear: () => void;
};

export const useFilters = create<FilterState & FilterActions>((set, get) => ({
  ...emptyFilters,
  set: (next) => set(next),
  toggle: (group, value) => {
    const current = get()[group] as string[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    set({ [group]: next } as Partial<FilterState>);
  },
  clear: () => set(emptyFilters),
}));

/**
 * OR within a group, AND across groups.
 */
export function matchesFilters(photo: Photo, f: FilterState): boolean {
  if (f.camera.length > 0 && (!photo.exif.camera || !f.camera.includes(photo.exif.camera))) return false;
  if (f.lens.length > 0 && (!photo.exif.lens || !f.lens.includes(photo.exif.lens))) return false;
  if (f.focal.length > 0) {
    const label = focalLabel(photo.exif.focalLength);
    if (!label || !f.focal.includes(label)) return false;
  }
  if (f.film.length > 0 && (!photo.exif.filmSimulation || !f.film.includes(photo.exif.filmSimulation))) return false;
  if (f.tag.length > 0) {
    const tags = photo.tags ?? [];
    if (!f.tag.some((t) => tags.includes(t))) return false;
  }
  return true;
}

export function filterPhotos(photos: Photo[], f: FilterState): Photo[] {
  return photos.filter((p) => matchesFilters(p, f));
}

/**
 * Facet counts: for each possible value in a group, count photos that WOULD match
 * if that value were selected on top of the currently-active filters of the OTHER
 * groups. Standard e-commerce pattern — clicking a value always yields a non-zero count.
 */
export type Facet = {
  key: keyof FilterState;
  label: string;
  values: Array<{ value: string; count: number; active: boolean }>;
};

export function computeFacets(f: FilterState): Facet[] {
  const all = manifest.photos;
  const facets: Facet[] = [];

  const groups: Array<{ key: keyof FilterState; label: string; extract: (p: Photo) => string[] }> = [
    { key: 'camera', label: 'Camera', extract: (p) => (p.exif.camera ? [p.exif.camera] : []) },
    { key: 'lens', label: 'Lens', extract: (p) => (p.exif.lens ? [p.exif.lens] : []) },
    { key: 'focal', label: 'Focal length', extract: (p) => {
      const label = focalLabel(p.exif.focalLength);
      return label ? [label] : [];
    }},
    { key: 'film', label: 'Film sim', extract: (p) => (p.exif.filmSimulation ? [p.exif.filmSimulation] : []) },
    { key: 'tag', label: 'Tag', extract: (p) => p.tags ?? [] },
  ];

  for (const g of groups) {
    const other: FilterState = { ...f, [g.key]: [] };
    const pool = all.filter((p) => matchesFilters(p, other));
    const counts = new Map<string, number>();
    for (const p of pool) {
      for (const v of g.extract(p)) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const active = f[g.key] as string[];
    const values = [...counts.entries()]
      .sort((a, b) => {
        // Focal length: always numeric ascending (28mm → 43mm → 50mm), not
        // by count — the natural order is more intuitive for a focal list.
        if (g.key === 'focal') {
          return parseInt(a[0], 10) - parseInt(b[0], 10);
        }
        // Everything else: count desc, then alphabetical.
        return b[1] - a[1] || a[0].localeCompare(b[0]);
      })
      .map(([value, count]) => ({ value, count, active: active.includes(value) }));
    if (values.length > 0) facets.push({ key: g.key, label: g.label, values });
  }
  return facets;
}

export function hasAnyFilter(f: FilterState): boolean {
  return f.camera.length + f.lens.length + f.focal.length + f.film.length + f.tag.length > 0;
}
