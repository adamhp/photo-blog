import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from '@tanstack/react-router';
import type { Photo } from '@/lib/photos';
import { cfImageUrl } from '@/lib/cf-images';
import { formatAperture, formatIso, formatShutter } from '@/lib/exif-format';
import { Blurhash } from './Blurhash';

type Props = {
  photo: Photo;
  tileWidth: number;
};

// Row height in px used by Gallery's grid-auto-rows.
// Span = ceil((photo height + caption height) / ROW_HEIGHT).
const ROW_HEIGHT = 10;
const CAPTION_HEIGHT = 26; // figcaption text-[12px] + gap-1.5 + a couple px slack

export function PhotoTile({ photo, tileWidth }: Props) {
  const [loaded, setLoaded] = useState(false);
  const photoHeight = tileWidth / photo.aspectRatio;
  const rowSpan = Math.max(4, Math.ceil((photoHeight + CAPTION_HEIGHT) / ROW_HEIGHT));

  const aperture = formatAperture(photo.exif.aperture) ?? '—';
  const shutter = formatShutter(photo.exif.shutterSpeed) ?? '—';
  const iso = formatIso(photo.exif.iso) ?? '—';

  return (
    <figure
      className="flex flex-col gap-1.5"
      style={{ gridRow: `span ${rowSpan}` }}
    >
      <Link
        to="/"
        search={(prev) => ({ ...prev, photo: photo.id })}
        replace={false}
        className="block relative overflow-hidden bg-hairline"
        style={{ aspectRatio: photo.aspectRatio }}
      >
        <motion.div
          layoutId={`photo-${photo.id}`}
          className="absolute inset-0"
        >
          <div className="absolute inset-0">
            <Blurhash hash={photo.blurhash} />
          </div>
          <img
            src={cfImageUrl(photo.cfImageId, 'thumb')}
            alt=""
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className="relative w-full h-full object-cover transition-opacity duration-200"
            style={{ opacity: loaded ? 1 : 0 }}
          />
        </motion.div>
      </Link>
      <figcaption className="flex justify-between font-mono text-[12px] leading-snug tracking-[0.02em] text-graphite">
        <span>{aperture}</span>
        <span>{shutter}</span>
        <span>{iso}</span>
      </figcaption>
    </figure>
  );
}
