import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { manifest, type Photo } from '@/lib/photos';
import { cfImageUrl } from '@/lib/cf-images';
import { buildExifRows } from '@/lib/exif-format';
import { Blurhash } from './Blurhash';

export function ExpandedPhoto() {
  const search = useSearch({ from: '/' });
  const navigate = useNavigate({ from: '/' });
  const photoId = search.photo;

  const photo: Photo | undefined = photoId
    ? manifest.photos.find((p) => p.id === photoId)
    : undefined;

  const currentIndex = photo ? manifest.photos.findIndex((p) => p.id === photo.id) : -1;

  const close = () => {
    navigate({ search: (prev) => ({ ...prev, photo: undefined }), replace: false });
  };

  const goTo = (idx: number) => {
    const target = manifest.photos[idx];
    if (!target) return;
    navigate({ search: (prev) => ({ ...prev, photo: target.id }), replace: true });
  };

  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft' && currentIndex > 0) goTo(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < manifest.photos.length - 1) goTo(currentIndex + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo?.id, currentIndex]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {photo && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-paper/85 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
        >
          <div
            className="relative w-full max-w-6xl h-full flex flex-col md:flex-row gap-6 items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              layoutId={`photo-${photo.id}`}
              className="relative bg-hairline overflow-hidden max-h-full"
              style={{
                aspectRatio: photo.aspectRatio,
                width: 'auto',
                maxWidth: '100%',
                height: photo.aspectRatio >= 1 ? 'auto' : '80vh',
              }}
            >
              <div className="absolute inset-0">
                <Blurhash hash={photo.blurhash} />
              </div>
              <img
                src={cfImageUrl(photo.cfImageId, 'medium')}
                alt=""
                className="relative w-full h-full object-contain"
              />
            </motion.div>

            <ExifPanel photo={photo} />

            {currentIndex > 0 && (
              <button
                type="button"
                onClick={() => goTo(currentIndex - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-sm px-3 py-2 text-ink hover:text-accent"
                aria-label="Previous photo"
              >
                ← PREV
              </button>
            )}
            {currentIndex < manifest.photos.length - 1 && (
              <button
                type="button"
                onClick={() => goTo(currentIndex + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-sm px-3 py-2 text-ink hover:text-accent"
                aria-label="Next photo"
              >
                NEXT →
              </button>
            )}

            <button
              type="button"
              onClick={close}
              className="absolute top-2 right-2 font-mono text-xs text-ink hover:text-accent px-3 py-2"
              aria-label="Close"
            >
              CLOSE ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function ExifPanel({ photo }: { photo: Photo }) {
  const rows = buildExifRows(photo.exif, photo.takenAt);
  return (
    <aside className="font-mono text-[11px] w-full md:w-64 shrink-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 self-center">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ash uppercase tracking-[0.08em] text-[10px]">{k}</dt>
          <dd className="text-ink">{v}</dd>
        </div>
      ))}
    </aside>
  );
}
