import { AnimatePresence } from 'motion/react';
import { manifest } from '@/lib/photos';
import { useFilters, filterPhotos } from '@/lib/filters';
import { PhotoTile } from './PhotoTile';

export function Gallery() {
  const filters = useFilters();
  const photos = filterPhotos(manifest.photos, filters);

  return (
    <div
      className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      style={{ gridAutoRows: '10px' }}
    >
      <AnimatePresence initial={false}>
        {photos.map((photo) => (
          <PhotoTile key={photo.id} photo={photo} />
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
