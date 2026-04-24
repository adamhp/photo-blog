import { useEffect, useState } from 'react';
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
  const [mediumLoaded, setMediumLoaded] = useState(false);

  // Reset the loaded flag every time we switch to a different photo so the
  // blurhash shows while the new medium variant fetches.
  useEffect(() => {
    setMediumLoaded(false);
  }, [photoId]);

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
            className="relative flex flex-col md:flex-row items-center md:items-start gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left spacer on desktop — mirrors the EXIF panel's width so the photo sits visually at the viewport center. */}
            <div className="hidden md:block w-64 shrink-0" aria-hidden />

            <div className="relative">
              <motion.div
                layoutId={`photo-${photo.id}`}
                className="relative bg-hairline overflow-hidden"
                style={{
                  aspectRatio: photo.aspectRatio,
                  width: `min(calc(100vw - var(--lightbox-horizontal-budget)), calc(85vh * ${photo.aspectRatio}), ${photo.width}px)`,
                  maxHeight: '85vh',
                }}
              >
                <div className="absolute inset-0">
                  <Blurhash hash={photo.blurhash} />
                </div>
                {!mediumLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg
                      className="w-12 h-12 animate-spin text-ink"
                      viewBox="0 0 256 256"
                      fill="currentColor"
                      aria-label="Loading"
                      role="status"
                      style={{ animationDuration: '2.5s' }}
                    >
                      <path d="M228,128A99.99968,99.99968,0,0,0,57.28906,57.29,100,100,0,0,0,127.98486,228l.01514.001.01343-.001A100.00078,100.00078,0,0,0,228,128Zm-18.92285,43.55811L148.07349,160.4209,210.40332,87.044a92.25448,92.25448,0,0,1-1.32617,84.51416ZM106.853,152.89551,95.8667,122.1333l21.14722-24.895,32.13305,5.86621L160.1333,133.8667l-21.14722,24.895ZM206.24243,79.585,166.114,126.82568,133.74658,36.19629a91.30856,91.30856,0,0,1,59.30713,26.75A92.674,92.674,0,0,1,206.24243,79.585ZM62.94629,62.94629a91.33444,91.33444,0,0,1,62.25879-26.87842l20.8352,58.33838L51.324,77.11426A92.91923,92.91923,0,0,1,62.94629,62.94629ZM46.92285,84.44189,107.92651,95.5791l-62.32983,73.377a92.25448,92.25448,0,0,1,1.32617-84.51416ZM49.75757,176.415,89.886,129.17432l32.36743,90.62939a91.30856,91.30856,0,0,1-59.30713-26.75A92.674,92.674,0,0,1,49.75757,176.415Zm81.03735,43.51709-20.8352-58.33838,29.87866,5.45508.02661.00488,64.811,11.832a92.91923,92.91923,0,0,1-11.62232,14.168A91.33444,91.33444,0,0,1,130.79492,219.93213Z" />
                    </svg>
                  </div>
                )}
                <img
                  src={cfImageUrl(photo.cfImageId, 'medium')}
                  alt=""
                  onLoad={() => setMediumLoaded(true)}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-out"
                  style={{ opacity: mediumLoaded ? 1 : 0 }}
                />
              </motion.div>

              {currentIndex > 0 && (
                <button
                  type="button"
                  onClick={() => goTo(currentIndex - 1)}
                  className="absolute left-0 top-full mt-3 font-mono text-base px-1 py-1.5 text-ink hover:text-accent"
                  aria-label="Previous photo"
                >
                  ← PREV
                </button>
              )}
              {currentIndex < manifest.photos.length - 1 && (
                <button
                  type="button"
                  onClick={() => goTo(currentIndex + 1)}
                  className="absolute right-0 top-full mt-3 font-mono text-base px-1 py-1.5 text-ink hover:text-accent"
                  aria-label="Next photo"
                >
                  NEXT →
                </button>
              )}
            </div>

            <ExifPanel photo={photo} />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            className="fixed top-4 right-4 font-mono text-base text-ink hover:text-accent px-3 py-2 z-10"
            aria-label="Close"
          >
            CLOSE ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function ExifPanel({ photo }: { photo: Photo }) {
  const rows = buildExifRows(photo.exif, photo.takenAt);
  return (
    <aside className="font-mono text-[13px] w-full md:w-64 shrink-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 self-start">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ash uppercase tracking-[0.08em] text-[12px]">{k}</dt>
          <dd className="text-ink">{v}</dd>
        </div>
      ))}
    </aside>
  );
}
