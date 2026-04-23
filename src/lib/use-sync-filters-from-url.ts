import { useEffect } from 'react';
import { useSearch } from '@tanstack/react-router';
import type { FilterState } from './filters';
import { useFilters, emptyFilters } from './filters';

export function useSyncFiltersFromUrl() {
  const search = useSearch({ from: '/' });
  const set = useFilters((s) => s.set);

  useEffect(() => {
    const next: FilterState = {
      ...emptyFilters,
      camera: search.camera ?? [],
      lens: search.lens ?? [],
      focal: search.focal ?? [],
      film: search.film ?? [],
      tag: search.tag ?? [],
    };
    set(next);
  }, [search.camera, search.lens, search.focal, search.film, search.tag, set]);
}
