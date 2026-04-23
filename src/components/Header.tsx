import { manifest } from '@/lib/photos';

type Props = {
  onOpenFilters: () => void;
};

export function Header({ onOpenFilters }: Props) {
  const count = manifest.photos.length;
  const updated = new Date(manifest.generatedAt);
  const updatedStr = `${updated.getFullYear()}·${String(updated.getMonth() + 1).padStart(2, '0')}·${String(updated.getDate()).padStart(2, '0')}`;
  return (
    <header className="flex items-baseline justify-between px-6 py-5 border-b border-hairline gap-4">
      <h1 className="font-mono text-base tracking-tight text-ink truncate">
        ADAM PEARCE — PHOTOGRAPHS
      </h1>
      <div className="flex items-baseline gap-4">
        <p className="hidden sm:block font-mono text-[12px] uppercase tracking-[0.12em] text-ash">
          {String(count).padStart(3, '0')} · UPDATED {updatedStr}
        </p>
        <button
          type="button"
          onClick={onOpenFilters}
          className="lg:hidden font-mono text-[12px] uppercase tracking-[0.12em] text-ink hover:text-accent"
        >
          FILTERS
        </button>
      </div>
    </header>
  );
}
