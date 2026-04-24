import { parseArgs } from 'node:util';
import { readdir, readFile, writeFile, rename, access, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, join, extname } from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import 'dotenv/config';
import exifr from 'exifr';
import sharp from 'sharp';
import { encode as encodeBlurhash } from 'blurhash';

const ORIGINALS_DIR = 'photos/originals';
const MANIFEST_PATH = 'src/data/photos.json';
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.heic', '.heif', '.png', '.webp']);
const CF_BASE = 'https://api.cloudflare.com/client/v4';

type Exif = {
  camera?: string;
  lens?: string;
  focalLength?: number;
  focalLength35?: number;
  aperture?: number;
  shutterSpeed?: string;
  iso?: number;
  exposureComp?: number;
  filmSimulation?: string;
};

type Photo = {
  id: string;
  cfImageId: string;
  originalFilename?: string;
  width: number;
  height: number;
  aspectRatio: number;
  blurhash: string;
  takenAt: string;
  exif: Exif;
  tags?: string[];
};

type Manifest = {
  generatedAt: string;
  photos: Photo[];
};

type SourceFile = {
  path: string;
  filename: string;
  id: string;
  bytes: Buffer;
};

type ExtractedMeta = {
  width: number;
  height: number;
  blurhash: string;
  takenAt: string;
  exif: Exif;
};

type CloudflareUploadResponse = {
  success: boolean;
  errors?: Array<{ message: string }>;
  result?: { id: string };
};

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function loadManifest(): Promise<Manifest> {
  if (!(await fileExists(MANIFEST_PATH))) {
    return { generatedAt: new Date(0).toISOString(), photos: [] };
  }
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  return JSON.parse(raw) as Manifest;
}

async function scanOriginals(): Promise<SourceFile[]> {
  await mkdir(ORIGINALS_DIR, { recursive: true });
  const entries = await readdir(ORIGINALS_DIR);
  const files: SourceFile[] = [];
  for (const name of entries) {
    const ext = extname(name).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;
    const path = join(ORIGINALS_DIR, name);
    const bytes = await readFile(path);
    const id = createHash('sha256').update(bytes).digest('hex').slice(0, 8);
    files.push({ path, filename: basename(path), id, bytes });
  }
  return files;
}

function parseFlags() {
  return parseArgs({
    options: {
      dry: { type: 'boolean', default: false },
      'keep-orphans': { type: 'boolean', default: false },
    },
  }).values;
}

function requireEnv(): { accountId: string; token: string } {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_IMAGES_TOKEN;
  if (!accountId || !token) {
    console.error('ERROR: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_IMAGES_TOKEN must be set in .env');
    process.exit(1);
  }
  return { accountId, token };
}

async function extractExif(bytes: Buffer): Promise<Exif> {
  try {
    const tags = await exifr.parse(bytes, {
      pick: [
        'Make', 'Model', 'LensModel', 'LensMake',
        'FocalLength', 'FocalLengthIn35mmFormat',
        'FNumber', 'ExposureTime', 'ISO',
        'ExposureCompensation',
        'DateTimeOriginal',
        'FilmMode',
      ],
      makerNote: true,
    });
    if (!tags) return {};
    return {
      camera: [tags.Make, tags.Model].filter(Boolean).join(' ').trim() || undefined,
      lens: tags.LensModel || undefined,
      focalLength: typeof tags.FocalLength === 'number' ? tags.FocalLength : undefined,
      focalLength35: typeof tags.FocalLengthIn35mmFormat === 'number' ? tags.FocalLengthIn35mmFormat : undefined,
      aperture: typeof tags.FNumber === 'number' ? tags.FNumber : undefined,
      shutterSpeed: formatShutterFromExposureTime(tags.ExposureTime),
      iso: typeof tags.ISO === 'number' ? tags.ISO : undefined,
      exposureComp: typeof tags.ExposureCompensation === 'number' ? tags.ExposureCompensation : undefined,
      filmSimulation: tags.FilmMode || undefined,
    };
  } catch (err) {
    console.warn(`  ! EXIF parse failed:`, err instanceof Error ? err.message : err);
    return {};
  }
}

function formatShutterFromExposureTime(t: unknown): string | undefined {
  if (typeof t !== 'number') return undefined;
  if (t >= 1) return String(Math.round(t * 10) / 10);
  return `1/${Math.round(1 / t)}`;
}

async function extractedTakenAt(bytes: Buffer): Promise<string> {
  try {
    const tags = await exifr.parse(bytes, { pick: ['DateTimeOriginal'] });
    const d = tags?.DateTimeOriginal;
    if (d instanceof Date) return d.toISOString();
  } catch {
    // fall through
  }
  return new Date().toISOString();
}

async function extractMeta(bytes: Buffer): Promise<ExtractedMeta> {
  const image = sharp(bytes, { failOn: 'none' });
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  const { data, info } = await image
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const blurhash = encodeBlurhash(new Uint8ClampedArray(data), info.width, info.height, 4, 3);

  const [exif, takenAt] = await Promise.all([extractExif(bytes), extractedTakenAt(bytes)]);

  return { width, height, blurhash, takenAt, exif };
}

async function uploadToCloudflare(
  bytes: Buffer,
  filename: string,
  accountId: string,
  token: string,
): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)]), filename);
  form.append('requireSignedURLs', 'false');

  const res = await fetch(`${CF_BASE}/accounts/${accountId}/images/v1`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = (await res.json()) as CloudflareUploadResponse;
  if (!json.success || !json.result) {
    const msg = json.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`Cloudflare upload failed: ${msg}`);
  }
  return json.result.id;
}

async function deleteFromCloudflare(imageId: string, accountId: string, token: string): Promise<void> {
  const res = await fetch(`${CF_BASE}/accounts/${accountId}/images/v1/${imageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cloudflare delete failed for ${imageId}: ${body}`);
  }
}

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

async function writeManifestAtomic(m: Manifest): Promise<void> {
  const tmp = `${MANIFEST_PATH}.tmp`;
  await writeFile(tmp, JSON.stringify(m, null, 2) + '\n', 'utf8');
  await rename(tmp, MANIFEST_PATH);
}

async function main() {
  const flags = parseFlags();
  const env = flags.dry ? { accountId: '', token: '' } : requireEnv();

  const manifest = await loadManifest();
  const existingIds = new Set(manifest.photos.map((p) => p.id));
  const sources = await scanOriginals();
  const sourceById = new Map(sources.map((s) => [s.id, s]));

  const newSources = sources.filter((s) => !existingIds.has(s.id));
  const orphans = manifest.photos.filter((p) => !sourceById.has(p.id));

  console.log(`Scan: ${sources.length} source files, ${newSources.length} new, ${orphans.length} orphaned manifest entries.`);
  console.log(`Mode: ${flags.dry ? 'DRY RUN' : 'LIVE'}${flags['keep-orphans'] ? ' (keep-orphans — no pruning)' : ''}`);

  if (flags.dry) {
    for (const s of newSources) console.log(`  + ${s.path} (${s.id})`);
    for (const o of orphans) console.log(`  - ${o.id} ${o.originalFilename ?? ''} (orphaned)`);
    return;
  }

  const added: Photo[] = [];
  const failed: string[] = [];

  for (const src of newSources) {
    console.log(`  → ${src.path}`);
    try {
      const meta = await extractMeta(src.bytes);
      const cfImageId = await uploadToCloudflare(src.bytes, `${src.id}${extname(src.path)}`, env.accountId, env.token);
      const photo: Photo = {
        id: src.id,
        cfImageId,
        originalFilename: src.filename,
        width: meta.width,
        height: meta.height,
        aspectRatio: meta.height > 0 ? meta.width / meta.height : 1,
        blurhash: meta.blurhash,
        takenAt: meta.takenAt,
        exif: meta.exif,
      };
      added.push(photo);
    } catch (err) {
      console.warn(`  ! failed ${src.path}:`, err instanceof Error ? err.message : err);
      failed.push(src.path);
    }
  }

  // Existing manifest entries: backfill originalFilename for any that lack it,
  // and update the filename if the source has been renamed.
  const kept = manifest.photos
    .filter((p) => sourceById.has(p.id))
    .map((p) => {
      const src = sourceById.get(p.id)!;
      if (p.originalFilename !== src.filename) {
        return { ...p, originalFilename: src.filename };
      }
      return p;
    });

  let photos: Photo[] = [...kept, ...added];

  if (!flags['keep-orphans'] && orphans.length > 0) {
    const labels = orphans.map((o) => `${o.id}${o.originalFilename ? ` (${o.originalFilename})` : ''}`);
    console.log(`Orphans to prune: ${labels.join(', ')}`);
    const ok = await confirm('Delete these from Cloudflare Images and the manifest?');
    if (ok) {
      for (const o of orphans) {
        try {
          await deleteFromCloudflare(o.cfImageId, env.accountId, env.token);
          console.log(`  - deleted ${o.id}${o.originalFilename ? ` (${o.originalFilename})` : ''}`);
        } catch (err) {
          console.warn(`  ! delete failed for ${o.id}:`, err instanceof Error ? err.message : err);
        }
      }
    } else {
      console.log('Pruning skipped — orphans retained in manifest.');
      photos = [...photos, ...orphans];
    }
  } else if (flags['keep-orphans']) {
    photos = [...photos, ...orphans];
  }

  photos.sort((a, b) => b.takenAt.localeCompare(a.takenAt));

  const nextManifest: Manifest = {
    generatedAt: new Date().toISOString(),
    photos,
  };
  await writeManifestAtomic(nextManifest);

  const pruned = flags['keep-orphans'] ? 0 : orphans.length;
  console.log(`Done. +${added.length} added · ${pruned} pruned · ${failed.length} failed · total ${photos.length}.`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
