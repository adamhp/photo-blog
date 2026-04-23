import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from '@tanstack/react-router';
import type { Photo } from '@/lib/photos';
import { cfImageUrl } from '@/lib/cf-images';
import { formatCaption } from '@/lib/exif-format';
import { Blurhash } from './Blurhash';

type Props = {
  photo: Photo;
  index: number;
};

// Row height in px used by Gallery's grid-auto-rows.
// Tile spans Math.round(assumedTileWidth / aspectRatio / ROW_HEIGHT) rows.
// ASSUMED_TILE_WIDTH should be near the average tile width across breakpoints
// (site is capped at ~1536px with 2–5 columns → tiles range ~170–290px wide).
const ROW_HEIGHT = 10;
const ASSUMED_TILE_WIDTH = 250;

export function PhotoTile({ photo, index }: Props) {
  const [loaded, setLoaded] = useState(false);
  const caption = formatCaption(photo, index);
  const rowSpan = Math.max(4, Math.round(ASSUMED_TILE_WIDTH / photo.aspectRatio / ROW_HEIGHT));

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
      <figcaption className="font-mono text-[10px] leading-snug tracking-[0.02em] text-graphite">
        {caption}
      </figcaption>
    </figure>
  );
}
