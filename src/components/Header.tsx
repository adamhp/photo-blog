import { manifest } from '@/lib/photos';

export function Header() {
  const count = manifest.photos.length;
  const updated = new Date(manifest.generatedAt);
  const updatedStr = `${updated.getFullYear()}·${String(updated.getMonth() + 1).padStart(2, '0')}·${String(updated.getDate()).padStart(2, '0')}`;
  return (
    <header className="flex items-baseline justify-between px-6 py-5 border-b border-hairline">
      <h1 className="font-sans text-sm tracking-tight text-ink">
        ADAM PATTERSON — PHOTOGRAPHS
      </h1>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ash">
        {String(count).padStart(3, '0')} · UPDATED {updatedStr}
      </p>
    </header>
  );
}
