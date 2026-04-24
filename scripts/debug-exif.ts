/**
 * Dump the full EXIF / metadata of a photo in photos/originals/ so you can
 * compare what's actually in the file vs. what sync-photos.ts extracts.
 *
 * Usage:
 *   npm run exif:debug              # picks a random file
 *   npm run exif:debug -- <name>    # specific file (exact or stem match)
 */

import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { parseArgs } from 'node:util';
import exifr from 'exifr';
import sharp from 'sharp';

const ORIGINALS_DIR = 'photos/originals';
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.heic', '.heif', '.png', '.webp']);

// ICC color-profile tags that exifr emits — dense binary-ish objects that
// bury the actual photographic metadata. Pass --icc to the script to
// include them anyway.
const ICC_KEYS = new Set([
  'BlueTRC', 'GreenTRC', 'RedTRC',
  'BlueMatrixColumn', 'GreenMatrixColumn', 'RedMatrixColumn',
  'WTPT', 'BKPT',
  'MediaWhitePoint', 'MediaBlackPoint',
  'Luminance', 'Chromaticity',
  'CIED', 'DMDD', 'DMND', 'DESC', 'TECH', 'CPRT',
  'ProfileDescription', 'ProfileCopyright', 'ProfileVersion',
]);

async function main() {
  const { positionals } = parseArgs({ allowPositionals: true });

  const all = await readdir(ORIGINALS_DIR);
  const files = all.filter((n) => IMAGE_EXTS.has(extname(n).toLowerCase()));
  if (files.length === 0) {
    console.error(`No photos in ${ORIGINALS_DIR}`);
    process.exit(1);
  }

  const arg = positionals[0];
  let target: string;
  if (arg) {
    const match = files.find(
      (f) => f === arg || basename(f) === arg || basename(f, extname(f)) === arg,
    );
    if (!match) {
      console.error(`Not found: ${arg}`);
      console.error(`Available (first 10): ${files.slice(0, 10).join(', ')}${files.length > 10 ? ', …' : ''}`);
      process.exit(1);
    }
    target = match;
  } else {
    target = files[Math.floor(Math.random() * files.length)]!;
  }

  const path = join(ORIGINALS_DIR, target);
  const bytes = await readFile(path);

  console.log();
  console.log(`File:  ${path}`);
  console.log(`Size:  ${(bytes.byteLength / 1024).toFixed(1)} KB`);

  // 1) Sharp's read of the image itself
  try {
    const meta = await sharp(bytes, { failOn: 'none' }).metadata();
    console.log();
    console.log('── sharp ──');
    console.log(`  format:      ${meta.format}`);
    console.log(`  dimensions:  ${meta.width}×${meta.height}`);
    if (meta.orientation) console.log(`  orientation: ${meta.orientation}`);
    if (meta.space) console.log(`  colorspace:  ${meta.space}`);
    if (meta.density) console.log(`  density:     ${meta.density} dpi`);
  } catch (err) {
    console.warn('sharp failed:', err instanceof Error ? err.message : err);
  }

  // 2) Full exifr dump (all segments enabled; sorted alphabetically for scanning).
  //    ICC color-profile chunks are filtered out — they're huge byte-array objects
  //    that bury the actual photographic tags. Pass --icc to include them.
  console.log();
  console.log('── exifr (full, ICC stripped) ──');
  try {
    const tags = await exifr.parse(bytes, true);
    if (tags) {
      const includeIcc = process.argv.includes('--icc');
      const entries = Object.entries(tags).sort(([a], [b]) => a.localeCompare(b));
      const filtered = entries.filter(([k, v]) => {
        if (includeIcc) return true;
        if (ICC_KEYS.has(k)) return false;
        // Heuristic: skip objects that look like byte arrays (dense numeric keys)
        if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
          const keys = Object.keys(v as Record<string, unknown>);
          if (keys.length > 4 && keys.every((k) => /^\d+$/.test(k))) return false;
        }
        return true;
      });
      console.log(
        JSON.stringify(
          Object.fromEntries(filtered),
          (_k, v) => (v instanceof Date ? v.toISOString() : v),
          2,
        ),
      );
    } else {
      console.log('  (no tags returned)');
    }
  } catch (err) {
    console.warn('exifr failed:', err instanceof Error ? err.message : err);
  }

  // 3) Mapped via the same logic as sync-photos.ts, so you can compare the raw
  //    dump above with what would actually land in the manifest.
  console.log();
  console.log('── mapped as sync-photos.ts would store it ──');
  try {
    const tags = (await exifr.parse(bytes, {
      pick: [
        'Make', 'Model', 'LensModel', 'LensMake',
        'FocalLength', 'FocalLengthIn35mmFormat',
        'FNumber', 'ExposureTime', 'ISO',
        'ExposureCompensation',
        'DateTimeOriginal',
        'FilmMode',
      ],
      makerNote: true,
    })) ?? {};

    const t = tags as Record<string, unknown>;

    const shutterSpeed = (() => {
      const v = t.ExposureTime;
      if (typeof v !== 'number') return undefined;
      if (v >= 1) return String(Math.round(v * 10) / 10);
      return `1/${Math.round(1 / v)}`;
    })();

    const mapped = {
      camera:
        [t.Make, t.Model].filter(Boolean).map(String).join(' ').trim() || undefined,
      lens: typeof t.LensModel === 'string' ? t.LensModel : undefined,
      focalLength: typeof t.FocalLength === 'number' ? t.FocalLength : undefined,
      focalLength35:
        typeof t.FocalLengthIn35mmFormat === 'number' ? t.FocalLengthIn35mmFormat : undefined,
      aperture: typeof t.FNumber === 'number' ? t.FNumber : undefined,
      shutterSpeed,
      iso: typeof t.ISO === 'number' ? t.ISO : undefined,
      exposureComp:
        typeof t.ExposureCompensation === 'number' ? t.ExposureCompensation : undefined,
      filmSimulation: typeof t.FilmMode === 'string' ? t.FilmMode : undefined,
      takenAt: t.DateTimeOriginal instanceof Date ? t.DateTimeOriginal.toISOString() : undefined,
    };

    console.log(JSON.stringify(mapped, null, 2));
  } catch (err) {
    console.warn('mapped extraction failed:', err instanceof Error ? err.message : err);
  }

  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
