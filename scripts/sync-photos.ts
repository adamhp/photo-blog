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
import { Listr } from 'listr2';

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

type Failure = { filename: string; reason: string };

type SyncContext = {
  env: { accountId: string; token: string };
  newSources: SourceFile[];
  orphans: Photo[];
  kept: Photo[];
  added: Photo[];
  failed: Failure[];
  deletedOrphanIds: Set<string>;
  pruneOrphans: boolean;
  totalPhotos: number;
};

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function c(color: keyof typeof COLORS, text: string | number): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

async function main() {
  const flags = parseFlags();
  const env = flags.dry ? { accountId: '', token: '' } : requireEnv();

  const manifest = await loadManifest();
  const sources = await scanOriginals();
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const existingIds = new Set(manifest.photos.map((p) => p.id));
  const newSources = sources.filter((s) => !existingIds.has(s.id));
  const orphans = manifest.photos.filter((p) => !sourceById.has(p.id));

  console.log();
  console.log(c('bold', '  photo sync'));
  console.log(c('gray', `  ${ORIGINALS_DIR} → ${MANIFEST_PATH}`));
  console.log();
  console.log(`  ${c('gray', 'sources  ')} ${sources.length}`);
  console.log(`  ${c('gray', 'new      ')} ${c(newSources.length > 0 ? 'cyan' : 'gray', newSources.length)}`);
  console.log(`  ${c('gray', 'orphaned ')} ${c(orphans.length > 0 ? 'yellow' : 'gray', orphans.length)}`);
  console.log();

  if (flags.dry) {
    console.log(c('bold', '  DRY RUN — no changes will be made'));
    console.log();
    for (const s of newSources) console.log(c('green', `  + ${s.filename}`) + c('gray', ` (${s.id})`));
    for (const o of orphans) {
      const label = o.originalFilename ?? o.id;
      console.log(c('yellow', `  - ${label}`) + c('gray', ` (${o.id})`));
    }
    console.log();
    return;
  }

  // Orphan confirmation happens BEFORE Listr takes over the TTY, so the prompt
  // renders cleanly.
  let pruneOrphans = false;
  if (!flags['keep-orphans'] && orphans.length > 0) {
    console.log(c('bold', '  orphans to prune:'));
    for (const o of orphans) {
      const label = o.originalFilename ?? o.id;
      console.log(c('yellow', `    - ${label}`) + c('gray', ` (${o.id})`));
    }
    console.log();
    pruneOrphans = await confirm('  Delete these from Cloudflare Images and the manifest?');
    console.log();
  }

  const kept = manifest.photos
    .filter((p) => sourceById.has(p.id))
    .map((p) => {
      const src = sourceById.get(p.id)!;
      if (p.originalFilename !== src.filename) {
        return { ...p, originalFilename: src.filename };
      }
      return p;
    });

  const ctx: SyncContext = {
    env,
    newSources,
    orphans,
    kept,
    added: [],
    failed: [],
    deletedOrphanIds: new Set(),
    pruneOrphans,
    totalPhotos: 0,
  };

  const tasks = new Listr<SyncContext>(
    [
      {
        title:
          newSources.length === 0
            ? 'No new photos to upload'
            : `Upload ${newSources.length} new photo${newSources.length === 1 ? '' : 's'}`,
        skip: () => newSources.length === 0,
        task: async (ctx, task) => {
          let i = 0;
          for (const src of ctx.newSources) {
            i += 1;
            task.output = `${c('gray', `[${i}/${ctx.newSources.length}]`)} ${src.filename}`;
            try {
              const meta = await extractMeta(src.bytes);
              const cfImageId = await uploadToCloudflare(
                src.bytes,
                `${src.id}${extname(src.path)}`,
                ctx.env.accountId,
                ctx.env.token,
              );
              ctx.added.push({
                id: src.id,
                cfImageId,
                originalFilename: src.filename,
                width: meta.width,
                height: meta.height,
                aspectRatio: meta.height > 0 ? meta.width / meta.height : 1,
                blurhash: meta.blurhash,
                takenAt: meta.takenAt,
                exif: meta.exif,
              });
            } catch (err) {
              ctx.failed.push({
                filename: src.filename,
                reason: err instanceof Error ? err.message : String(err),
              });
            }
          }
          task.title = `Uploaded ${ctx.added.length}/${ctx.newSources.length} new photo${ctx.newSources.length === 1 ? '' : 's'}`;
        },
      },
      {
        title:
          orphans.length === 0 || !pruneOrphans
            ? 'No orphans to prune'
            : `Prune ${orphans.length} orphan${orphans.length === 1 ? '' : 's'}`,
        skip: () => orphans.length === 0 || !pruneOrphans,
        task: async (ctx, task) => {
          let i = 0;
          for (const o of ctx.orphans) {
            i += 1;
            const label = o.originalFilename ?? o.id;
            task.output = `${c('gray', `[${i}/${ctx.orphans.length}]`)} ${label}`;
            try {
              await deleteFromCloudflare(o.cfImageId, ctx.env.accountId, ctx.env.token);
              ctx.deletedOrphanIds.add(o.id);
            } catch (err) {
              ctx.failed.push({
                filename: label,
                reason: err instanceof Error ? err.message : String(err),
              });
            }
          }
          task.title = `Pruned ${ctx.deletedOrphanIds.size}/${ctx.orphans.length} orphan${ctx.orphans.length === 1 ? '' : 's'}`;
        },
      },
      {
        title: 'Write manifest',
        task: async (ctx, task) => {
          const retained = ctx.pruneOrphans
            ? ctx.kept
            : [...ctx.kept, ...ctx.orphans];
          const photos = [...retained, ...ctx.added].sort((a, b) => b.takenAt.localeCompare(a.takenAt));
          const nextManifest: Manifest = {
            generatedAt: new Date().toISOString(),
            photos,
          };
          await writeManifestAtomic(nextManifest);
          ctx.totalPhotos = photos.length;
          task.title = `Wrote manifest (${photos.length} photo${photos.length === 1 ? '' : 's'})`;
        },
      },
    ],
    {
      concurrent: false,
      exitOnError: false,
      rendererOptions: {
        collapseSubtasks: false,
      },
    },
  );

  await tasks.run(ctx);

  console.log();
  const parts = [
    c('green', `+${ctx.added.length} added`),
    c('yellow', `-${ctx.deletedOrphanIds.size} pruned`),
    ctx.failed.length > 0 ? c('red', `${ctx.failed.length} failed`) : c('gray', '0 failed'),
    c('gray', `${ctx.totalPhotos} total`),
  ];
  console.log(`  ${parts.join('  ·  ')}`);
  console.log();

  if (ctx.failed.length > 0) {
    console.log(c('red', c('bold', '  failures:')));
    for (const f of ctx.failed) {
      console.log(`    ${c('red', f.filename)} ${c('gray', '—')} ${f.reason}`);
    }
    console.log();
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
