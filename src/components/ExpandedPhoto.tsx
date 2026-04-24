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
                      className="w-12 h-12 animate-spin text-ink drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]"
                      viewBox="-50 -50 100 100"
                      aria-label="Loading"
                      role="status"
                      style={{ animationDuration: '2.5s' }}
                    >
                      {/* Outer aperture body */}
                      <circle cx="0" cy="0" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.25" />
                      {/* Hexagonal iris opening */}
                      <polygon
                        points="0,-18 15.59,-9 15.59,9 0,18 -15.59,9 -15.59,-9"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      {/* Six blade edges: hex vertices → outer ring */}
                      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="0" y1="-18" x2="0" y2="-40" />
                        <line x1="15.59" y1="-9" x2="34.64" y2="-20" />
                        <line x1="15.59" y1="9" x2="34.64" y2="20" />
                        <line x1="0" y1="18" x2="0" y2="40" />
                        <line x1="-15.59" y1="9" x2="-34.64" y2="20" />
                        <line x1="-15.59" y1="-9" x2="-34.64" y2="-20" />
                      </g>
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
