import { manifest } from '@/lib/photos';
import { useFilters, filterPhotos } from '@/lib/filters';
import { PhotoTile } from './PhotoTile';

export function Gallery() {
  const filters = useFilters();
  const photos = filterPhotos(manifest.photos, filters);

  if (photos.length === 0) {
    return (
      <p className="font-mono text-base text-ash py-16 text-center">
        No photos match current filters.
      </p>
    );
  }

  return (
    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3">
      {photos.map((photo) => (
        <PhotoTile key={photo.id} photo={photo} />
      ))}
    </div>
  );
}
