import { useNavigate } from '@tanstack/react-router';
import type { FilterState } from '@/lib/filters';
import { useFilters, computeFacets, hasAnyFilter, emptyFilters } from '@/lib/filters';

type Props = {
  variant?: 'desktop' | 'mobile';
};

export function FilterSidebar({ variant = 'desktop' }: Props) {
  const filters = useFilters();
  const setState = useFilters((s) => s.set);
  const navigate = useNavigate({ from: '/' });
  const facets = computeFacets(filters);

  const toggleValue = (group: keyof FilterState, value: string) => {
    const current = filters[group] as string[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    const nextFilters = { ...filters, [group]: next } as FilterState;
    setState(nextFilters);
    navigate({
      search: (prev) => ({
        ...prev,
        [group]: next.length > 0 ? next : undefined,
      }),
      replace: true,
    });
  };

  const clearAll = () => {
    setState(emptyFilters);
    navigate({
      search: (prev) => ({
        ...prev,
        camera: undefined,
        lens: undefined,
        focal: undefined,
        film: undefined,
        tag: undefined,
      }),
      replace: true,
    });
  };

  return (
    <aside
      className={
        variant === 'desktop'
          ? 'hidden lg:flex lg:flex-col gap-5 w-40 shrink-0 font-mono text-[11px]'
          : 'flex flex-col gap-5 font-mono text-[11px]'
      }
    >
      {hasAnyFilter(filters) && (
        <button
          type="button"
          onClick={clearAll}
          className="self-start text-[10px] uppercase tracking-[0.12em] text-accent hover:underline"
        >
          Clear all
        </button>
      )}
      {facets.map((facet) => (
        <section key={facet.key} className="flex flex-col gap-1">
          <div className="text-[9px] uppercase tracking-[0.14em] text-ash pb-1 border-b border-hairline">
            {facet.label}
          </div>
          {facet.values.map(({ value, count, active }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleValue(facet.key, value)}
              className={`flex items-center justify-between py-0.5 text-left transition-colors ${
                active ? 'text-accent' : 'text-graphite hover:text-ink'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                {active && <span className="inline-block w-1.5 h-1.5 bg-accent" aria-hidden />}
                <span className="truncate">{value}</span>
              </span>
              <span className="text-mist shrink-0">{count}</span>
            </button>
          ))}
        </section>
      ))}
      {facets.length === 0 && (
        <p className="text-ash">No filters available yet.</p>
      )}
    </aside>
  );
}
