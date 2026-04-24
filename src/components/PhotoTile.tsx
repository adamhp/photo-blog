import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from '@tanstack/react-router';
import type { Photo } from '@/lib/photos';
import { cfImageUrl } from '@/lib/cf-images';
import { formatAperture, formatIso, formatShutter } from '@/lib/exif-format';
import { Blurhash } from './Blurhash';

type Props = {
  photo: Photo;
};

export function PhotoTile({ photo }: Props) {
  const [loaded, setLoaded] = useState(false);

  const aperture = formatAperture(photo.exif.aperture) ?? '—';
  const shutter = formatShutter(photo.exif.shutterSpeed) ?? '—';
  const iso = formatIso(photo.exif.iso) ?? '—';

  return (
    <figure className="break-inside-avoid mb-3 flex flex-col gap-1.5">
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
