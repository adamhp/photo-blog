import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { manifest } from '@/lib/photos';
import { useFilters, filterPhotos } from '@/lib/filters';
import { PhotoTile } from './PhotoTile';

export function Gallery() {
  const filters = useFilters();
  const photos = filterPhotos(manifest.photos, filters);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tileWidth, setTileWidth] = useState(250);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const styles = getComputedStyle(el);
      const tracks = styles.gridTemplateColumns.split(/\s+/).filter(Boolean);
      const cols = tracks.length || 1;
      const gap = parseFloat(styles.columnGap) || 0;
      const width = (el.clientWidth - (cols - 1) * gap) / cols;
      if (width > 0) setTileWidth(width);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      style={{ gridAutoRows: '10px', gridAutoFlow: 'dense' }}
    >
      <AnimatePresence initial={false}>
        {photos.map((photo) => (
          <PhotoTile key={photo.id} photo={photo} tileWidth={tileWidth} />
        ))}
      </AnimatePresence>
      {photos.length === 0 && (
        <p className="col-span-full font-mono text-base text-ash py-16 text-center">
          No photos match current filters.
        </p>
      )}
    </div>
  );
}
