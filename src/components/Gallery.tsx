import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { manifest } from '@/lib/photos';
import { layoutBento } from '@/lib/bento';
import { useFilters, filterPhotos } from '@/lib/filters';
import { PhotoTile } from './PhotoTile';

// Column counts per Tailwind breakpoint (md / lg / xl), widest first.
const BREAKPOINTS: [query: string, columns: number][] = [
  ['(min-width: 80rem)', 5],
  ['(min-width: 64rem)', 4],
  ['(min-width: 48rem)', 3],
];
const DEFAULT_COLUMNS = 2;

// Must match PhotoTile: figure gap-1.5 (6px) + caption h-4 (16px).
const CAPTION_HEIGHT = 22;
const GAP = 12;

function getColumnCount() {
  return BREAKPOINTS.find(([q]) => window.matchMedia(q).matches)?.[1] ?? DEFAULT_COLUMNS;
}

function subscribe(onChange: () => void) {
  const lists = BREAKPOINTS.map(([q]) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener('change', onChange));
  return () => lists.forEach((l) => l.removeEventListener('change', onChange));
}

function useColumnCount() {
  return useSyncExternalStore(subscribe, getColumnCount, () => DEFAULT_COLUMNS);
}

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export function Gallery() {
  const filters = useFilters();
  const photos = filterPhotos(manifest.photos, filters);
  const columnCount = useColumnCount();
  const [containerRef, containerWidth] = useContainerWidth();

  const { tiles, height } = layoutBento(photos, {
    columns: columnCount,
    containerWidth,
    gap: GAP,
    captionHeight: CAPTION_HEIGHT,
  });

  // The container always renders so its width stays measured across filter changes.
  return (
    <div ref={containerRef} className="relative" style={tiles.length > 0 ? { height } : undefined}>
      {photos.length === 0 && (
        <p className="font-mono text-base text-ash py-16 text-center">
          No photos match current filters.
        </p>
      )}
      {containerWidth > 0 &&
        tiles.map((tile) => (
          <div
            key={tile.photo.id}
            className="absolute"
            style={{ left: tile.x, top: tile.y, width: tile.width }}
          >
            <PhotoTile
              photo={tile.photo}
              imageHeight={tile.imageHeight}
              variant={tile.span === 2 ? 'medium' : 'thumb'}
            />
          </div>
        ))}
    </div>
  );
}
