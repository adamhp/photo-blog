import { cfImageUrl } from '@/lib/cf-images';
import { buildExifRows } from '@/lib/exif-format';
import { manifest, type Photo } from '@/lib/photos';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Blurhash } from './Blurhash';

export function ExpandedPhoto() {
  const search = useSearch({ from: '/' });
  const navigate = useNavigate({ from: '/' });
  const photoId = search.photo;
  const [mediumLoaded, setMediumLoaded] = useState(false);
  const [direction, setDirection] = useState(0);
  const photoDragX = useMotionValue(0);
  const panAxisRef = useRef<'none' | 'horizontal' | 'vertical'>('none');

  // Reset the loaded flag every time we switch to a different photo so the
  // blurhash shows while the new medium variant fetches.
  useEffect(() => {
    setMediumLoaded(false);
  }, [photoId]);

  const photo: Photo | undefined = photoId
    ? manifest.photos.find((p) => p.id === photoId)
    : undefined;

  const currentIndex = photo
    ? manifest.photos.findIndex((p) => p.id === photo.id)
    : -1;

  const close = () => {
    navigate({
      search: (prev) => ({ ...prev, photo: undefined }),
      replace: false,
      resetScroll: false,
    });
  };

  const goTo = (idx: number, dir: number) => {
    const target = manifest.photos[idx];
    if (!target) return;
    setDirection(dir);
    navigate({
      search: (prev) => ({ ...prev, photo: target.id }),
      replace: true,
      resetScroll: false,
    });
  };

  useEffect(() => {
    if (!photo) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [photo]);

  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft' && currentIndex > 0) goTo(currentIndex - 1, -1);
      if (e.key === 'ArrowRight' && currentIndex < manifest.photos.length - 1)
        goTo(currentIndex + 1, 1);
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
          className='fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-paper/85 backdrop-blur-sm'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
        >
          <motion.div
            className='relative w-full h-full md:w-auto md:h-auto flex flex-col md:flex-row items-center md:items-start gap-6 touch-pan-y'
            onClick={(e) => e.stopPropagation()}
            onPanStart={() => {
              panAxisRef.current = 'none';
            }}
            onPan={(_, info) => {
              if (panAxisRef.current === 'none') {
                const ax = Math.abs(info.offset.x);
                const ay = Math.abs(info.offset.y);
                if (ax < 8 && ay < 8) return;
                panAxisRef.current = ax > ay ? 'horizontal' : 'vertical';
              }
              if (panAxisRef.current === 'horizontal') {
                photoDragX.set(info.offset.x * 0.7);
              }
            }}
            onPanEnd={(_, info) => {
              const axis = panAxisRef.current;
              panAxisRef.current = 'none';
              if (axis !== 'horizontal') return;
              const offset = info.offset.x;
              const velocity = info.velocity.x;
              if (
                (offset < -60 || velocity < -500) &&
                currentIndex < manifest.photos.length - 1
              ) {
                animate(photoDragX, 0, { duration: 0.15 });
                goTo(currentIndex + 1, 1);
              } else if (
                (offset > 60 || velocity > 500) &&
                currentIndex > 0
              ) {
                animate(photoDragX, 0, { duration: 0.15 });
                goTo(currentIndex - 1, -1);
              } else {
                animate(photoDragX, 0, {
                  type: 'spring',
                  stiffness: 400,
                  damping: 40,
                });
              }
            }}
          >
            {/* Left spacer on desktop — mirrors the EXIF panel's width so the photo sits visually at the viewport center. */}
            <div className='hidden md:block w-64 shrink-0' aria-hidden />

            <motion.div
              className='relative w-full flex-2 min-h-0 flex items-center justify-center md:w-auto md:flex-initial md:block'
              style={{ x: photoDragX }}
            >
              <AnimatePresence
                initial={false}
                mode='popLayout'
                custom={direction}
              >
                <motion.div
                  key={photo.id}
                  className='relative bg-hairline overflow-hidden'
                  style={{
                    aspectRatio: photo.aspectRatio,
                    width: `min(calc(100vw - var(--lightbox-horizontal-budget)), calc(var(--lightbox-photo-max-height) * ${photo.aspectRatio}), ${photo.width}px)`,
                    maxHeight: 'var(--lightbox-photo-max-height)',
                  }}
                  custom={direction}
                  variants={{
                    enter: (dir: number) => ({
                      x: dir > 0 ? '100%' : '-100%',
                      opacity: 0,
                    }),
                    center: { x: 0, opacity: 1 },
                    exit: (dir: number) => ({
                      x: dir > 0 ? '-100%' : '100%',
                      opacity: 0,
                    }),
                  }}
                  initial='enter'
                  animate='center'
                  exit='exit'
                  transition={{
                    x: { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 },
                    opacity: { duration: 0.15 },
                  }}
                >
                  <div className='absolute inset-0'>
                    <Blurhash hash={photo.blurhash} />
                  </div>
                  {!mediumLoaded && (
                    <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                      <img
                        src='/aperture.svg'
                        alt=''
                        aria-label='Loading'
                        role='status'
                        className='w-12 h-12 animate-spin'
                        style={{ animationDuration: '2.5s' }}
                      />
                    </div>
                  )}
                  <img
                    src={cfImageUrl(photo.cfImageId, 'medium')}
                    alt=''
                    draggable={false}
                    onLoad={() => setMediumLoaded(true)}
                    className='absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-out select-none'
                    style={{ opacity: mediumLoaded ? 1 : 0 }}
                  />
                </motion.div>
              </AnimatePresence>

              {currentIndex > 0 && (
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(currentIndex - 1, -1);
                  }}
                  className='hidden md:block absolute left-0 top-full mt-3 font-mono text-base px-1 py-1.5 text-ink hover:text-accent'
                  aria-label='Previous photo'
                >
                  ← PREV
                </button>
              )}
              {currentIndex < manifest.photos.length - 1 && (
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(currentIndex + 1, 1);
                  }}
                  className='hidden md:block absolute right-0 top-full mt-3 font-mono text-base px-1 py-1.5 text-ink hover:text-accent'
                  aria-label='Next photo'
                >
                  NEXT →
                </button>
              )}
            </motion.div>

            <ExifPanel photo={photo} />
          </motion.div>

          {currentIndex > 0 && (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                goTo(currentIndex - 1, -1);
              }}
              className='md:hidden fixed bottom-2 left-2 z-10 font-mono text-sm px-1 py-1.5 text-ink hover:text-accent'
              aria-label='Previous photo'
            >
              ← PREV
            </button>
          )}
          {currentIndex < manifest.photos.length - 1 && (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                goTo(currentIndex + 1, 1);
              }}
              className='md:hidden fixed bottom-2 right-2 z-10 font-mono text-sm px-1 py-1.5 text-ink hover:text-accent'
              aria-label='Next photo'
            >
              NEXT →
            </button>
          )}

          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            className='fixed bottom-2 left-1/2 -translate-x-1/2 z-10 md:top-4 md:right-4 md:bottom-auto md:left-auto md:translate-x-0 font-mono text-2xl md:text-base leading-none text-ink hover:text-accent px-2 py-1 md:px-3 md:py-2'
            aria-label='Close'
          >
            <span className='hidden md:inline'>CLOSE </span>✕
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
    <aside className='font-mono text-xs w-full flex-1 min-h-0 overflow-y-auto py-6 md:w-64 md:flex-none md:overflow-visible md:pb-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 self-start'>
      {rows.map(([k, v]) => (
        <div key={k} className='contents'>
          <dt className='text-ash uppercase tracking-[0.08em] text-xs'>{k}</dt>
          <dd className='text-ink'>{v}</dd>
        </div>
      ))}
    </aside>
  );
}
