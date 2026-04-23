# Photo Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static photo gallery site that renders ~100 photographs with EXIF metadata, filterable by camera/lens/focal-length/film-sim/tag, with motion.dev shared-element expansion animations and deep-linkable URLs.

**Architecture:** Vite + React + TypeScript SPA. A local Node sync script reads originals from `photos/originals/` (gitignored), extracts EXIF via `exifr`, uploads to Cloudflare Images, and emits `src/data/photos.json` (committed). The site reads the manifest at runtime — no API calls at build. URL search params drive all state (filters + expanded photo). Deploys as static output to Vercel.

**Tech Stack:** Vite · React 19 · TypeScript (strict) · TailwindCSS v4 · motion (formerly Framer Motion) · TanStack Router · Zustand · exifr · sharp · blurhash · Cloudflare Images · Vercel

**Per the spec, no test suite is included.** Each task verifies via type-checking, build, and browser inspection, then commits.

---

## File Structure

**New files created:**

```
.gitignore
.env.example
README.md
package.json
tsconfig.json
tsconfig.node.json
vite.config.ts
postcss.config.js
index.html
vercel.json
photos/originals/.gitkeep
scripts/sync-photos.ts
src/main.tsx
src/vite-env.d.ts
src/styles/theme.css
src/data/photos.json
src/routes/__root.tsx
src/routes/index.tsx
src/lib/photos.ts
src/lib/exif-format.ts
src/lib/filters.ts
src/lib/cf-images.ts
src/components/Header.tsx
src/components/Gallery.tsx
src/components/PhotoTile.tsx
src/components/FilterSidebar.tsx
src/components/ExpandedPhoto.tsx
src/components/Blurhash.tsx
```

Each file has a single clear responsibility. `src/lib/` holds pure functions + a Zustand store; `src/components/` holds view components only.

---

## Task 1: Repo init + Vite scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/vite-env.d.ts`, `.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
cd c:/Users/adamp/dev/photo-blog
git init -b main
```

- [ ] **Step 2: Create `.gitignore`**

Write to `.gitignore`:
```
# Dependencies
node_modules/

# Build output
dist/
.vite/

# Environment
.env
.env.local

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Photo originals (source of truth — kept locally, uploaded to Cloudflare Images via sync script)
photos/originals/

# Brainstorm workspace
.superpowers/
```

- [ ] **Step 3: Create `package.json`**

Write to `package.json`:
```json
{
  "name": "photo-blog",
  "private": true,
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit",
    "photos:sync": "tsx scripts/sync-photos.ts"
  }
}
```

- [ ] **Step 4: Install runtime dependencies**

```bash
npm install react react-dom motion @tanstack/react-router zustand zod blurhash @fontsource-variable/inter @fontsource-variable/jetbrains-mono
```

- [ ] **Step 5: Install dev dependencies**

```bash
npm install -D typescript @types/react @types/react-dom @types/node vite @vitejs/plugin-react tailwindcss @tailwindcss/vite @tanstack/router-devtools @tanstack/router-vite-plugin tsx dotenv exifr sharp
```

- [ ] **Step 6: Create `tsconfig.json`**

Write to `tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 7: Create `tsconfig.app.json`**

Write to `tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "baseUrl": "."
  },
  "include": ["src"]
}
```

- [ ] **Step 8: Create `tsconfig.node.json`**

Write to `tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["vite.config.ts", "scripts/**/*.ts"]
}
```

- [ ] **Step 9: Create `vite.config.ts`**

Write to `vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import path from 'node:path';

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 10: Create `index.html`**

Write to `index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <title>Photographs</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 11: Create placeholder `src/main.tsx`**

Write to `src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ padding: 32, fontFamily: 'system-ui' }}>
      <p>Bootstrapping…</p>
    </div>
  </StrictMode>,
);
```

- [ ] **Step 12: Create `src/vite-env.d.ts`**

Write to `src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CF_ACCOUNT_HASH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 13: Create `photos/originals/.gitkeep`**

The directory is gitignored but we want the folder structure visible:
```bash
mkdir -p photos/originals
touch photos/originals/.gitkeep
```

(The `.gitkeep` file is inside a gitignored directory, so it won't be committed — that's fine. The folder is created for local use.)

- [ ] **Step 14: Verify build pipeline works**

```bash
npm run dev
```

Expected: Vite prints `Local: http://localhost:5173/`. Open the URL in a browser — page shows "Bootstrapping…". Stop the dev server with Ctrl+C.

- [ ] **Step 15: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: exits with code 0, no output.

- [ ] **Step 16: Commit**

```bash
git add -A
git commit -m "chore: initial Vite + React + TS scaffold"
```

---

## Task 2: TailwindCSS v4 theme tokens + fonts

**Files:**
- Create: `src/styles/theme.css`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create `src/styles/theme.css`**

Write to `src/styles/theme.css`:
```css
@import "tailwindcss";

/* Self-hosted fonts (loaded by @fontsource packages) */
@import "@fontsource-variable/inter";
@import "@fontsource-variable/jetbrains-mono";

@theme {
  /* Neutrals */
  --color-paper: #ffffff;
  --color-ink: #111111;
  --color-graphite: #444444;
  --color-ash: #888888;
  --color-mist: #bbbbbb;
  --color-hairline: #e8e8e8;

  /* One restrained accent */
  --color-accent: #cc2b1e;

  /* Typography */
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, monospace;

  /* Layout */
  --spacing-tile-gap: 12px;
  --breakpoint-md: 720px;
  --breakpoint-lg: 1100px;
}

/* Global baseline */
html,
body {
  background: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

body {
  margin: 0;
}

* {
  box-sizing: border-box;
}

button {
  font-family: inherit;
}

/* Motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Import theme in `src/main.tsx`**

Replace `src/main.tsx` contents with:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/theme.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="p-8 font-sans">
      <p className="font-mono text-sm text-ash">Bootstrapping…</p>
    </div>
  </StrictMode>,
);
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Open http://localhost:5173/. The "Bootstrapping…" text should render in JetBrains Mono Variable, grey. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(style): Tailwind v4 theme tokens + self-hosted fonts"
```

---

## Task 3: Env, prerequisites README, initial manifest

**Files:**
- Create: `.env.example`, `README.md`, `src/data/photos.json`

- [ ] **Step 1: Create `.env.example`**

Write to `.env.example`:
```
# Cloudflare Images credentials — used only by scripts/sync-photos.ts
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_IMAGES_TOKEN=

# Account hash from imagedelivery.net URLs — used at build time to construct image URLs
# Example: https://imagedelivery.net/<ACCOUNT_HASH>/<imageId>/thumb
VITE_CF_ACCOUNT_HASH=
```

- [ ] **Step 2: Create `README.md`**

Write to `README.md`:
```markdown
# Photographs

A static photo gallery. Photos live in `photos/originals/` (local only, gitignored). Running `npm run photos:sync` extracts EXIF, uploads to Cloudflare Images, and writes `src/data/photos.json` which the site renders at runtime.

## One-time setup

1. Enable **Cloudflare Images** on your Cloudflare account.
2. In the Cloudflare Images dashboard, create three **variants**:
   - `thumb` — max 600w, fit: scale-down
   - `medium` — max 1600w, fit: scale-down
   - `full` — original, no transform
3. Create a **Cloudflare API token** with scope **Cloudflare Images: Edit**.
4. Copy `.env.example` to `.env` and fill in:
   - `CLOUDFLARE_ACCOUNT_ID` — from Cloudflare dashboard URL
   - `CLOUDFLARE_IMAGES_TOKEN` — the API token from step 3
   - `VITE_CF_ACCOUNT_HASH` — the hash in `imagedelivery.net/<hash>/...` URLs
5. For Vercel deployment, add `VITE_CF_ACCOUNT_HASH` to the project's build environment variables.
6. Node 20+ required.

## Workflow

- Drop photos into `photos/originals/` (any of `.jpg .jpeg .heic .png .webp`).
- Run `npm run photos:sync`. The script uploads new photos and updates `src/data/photos.json`. Commit the manifest.
- `npm run dev` to preview locally. `npm run build` to produce a static bundle. `npm run typecheck` to type-check without emitting.

## Sync flags

- `npm run photos:sync -- --dry` — show what would change, no API calls.
- `npm run photos:sync -- --prune` — also remove manifest entries whose originals were deleted from disk.
```

- [ ] **Step 3: Create initial empty manifest**

Write to `src/data/photos.json`:
```json
{
  "generatedAt": "1970-01-01T00:00:00.000Z",
  "photos": []
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: env template, README, empty manifest"
```

---

## Task 4: Data types and manifest loader (`lib/photos.ts`, `lib/cf-images.ts`)

**Files:**
- Create: `src/lib/photos.ts`, `src/lib/cf-images.ts`

- [ ] **Step 1: Create `src/lib/photos.ts`**

Write to `src/lib/photos.ts`:
```ts
import rawManifest from '@/data/photos.json';

export type Exif = {
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

export type Photo = {
  id: string;
  cfImageId: string;
  width: number;
  height: number;
  aspectRatio: number;
  blurhash: string;
  takenAt: string;
  exif: Exif;
  tags?: string[];
};

export type PhotoManifest = {
  generatedAt: string;
  photos: Photo[];
};

export const manifest: PhotoManifest = rawManifest as PhotoManifest;

export function getPhotoById(id: string): Photo | undefined {
  return manifest.photos.find((p) => p.id === id);
}
```

- [ ] **Step 2: Create `src/lib/cf-images.ts`**

Write to `src/lib/cf-images.ts`:
```ts
export type Variant = 'thumb' | 'medium' | 'full';

const ACCOUNT_HASH = import.meta.env.VITE_CF_ACCOUNT_HASH;

export function cfImageUrl(cfImageId: string, variant: Variant): string {
  if (!ACCOUNT_HASH) {
    throw new Error('VITE_CF_ACCOUNT_HASH is not set — images cannot be built');
  }
  return `https://imagedelivery.net/${ACCOUNT_HASH}/${cfImageId}/${variant}`;
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: exits 0, no output.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(lib): photo types, manifest loader, CF image URL builder"
```

---

## Task 5: EXIF formatters (`lib/exif-format.ts`)

**Files:**
- Create: `src/lib/exif-format.ts`

- [ ] **Step 1: Create `src/lib/exif-format.ts`**

Write to `src/lib/exif-format.ts`:
```ts
import type { Exif, Photo } from './photos';

export function formatAperture(f?: number): string | undefined {
  if (f === undefined) return undefined;
  // Trim trailing zero on whole-number f-stops, keep tenths otherwise
  const s = Number.isInteger(f) ? f.toFixed(0) : f.toFixed(1);
  return `ƒ/${s}`;
}

export function formatShutter(s?: string): string | undefined {
  if (s === undefined || s.length === 0) return undefined;
  return s.includes('/') ? `${s}s` : `${s}s`;
}

export function formatIso(iso?: number): string | undefined {
  return iso === undefined ? undefined : `ISO ${iso}`;
}

export function formatFocalLength(actual?: number, eq35?: number): string | undefined {
  if (actual === undefined && eq35 === undefined) return undefined;
  if (actual !== undefined && eq35 !== undefined && actual !== eq35) {
    return `${Math.round(actual)}mm / ${Math.round(eq35)}mm`;
  }
  const value = actual ?? eq35;
  return value === undefined ? undefined : `${Math.round(value)}mm`;
}

export function formatExposureComp(ev?: number): string | undefined {
  if (ev === undefined || ev === 0) return undefined;
  const sign = ev > 0 ? '+' : '';
  // Preserve fractional values like -0.333 → "-1/3ev" is nicer, but decimals work too
  const rounded = Math.abs(ev * 3) % 1 === 0 ? fractional(ev) : ev.toFixed(2);
  return `${sign}${rounded}ev`;
}

function fractional(ev: number): string {
  const thirds = Math.round(ev * 3);
  if (thirds % 3 === 0) return String(thirds / 3);
  return `${thirds}/3`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}·${m}·${day}`;
}

export function formatIndex(n: number): string {
  return `№${String(n + 1).padStart(3, '0')}`;
}

/**
 * One-line caption shown under each tile in the grid.
 * Skips any parts that are undefined so missing EXIF doesn't produce "· · · ·".
 */
export function formatCaption(photo: Photo, index: number): string {
  const e = photo.exif;
  const parts: string[] = [formatIndex(index)];
  if (e.camera) parts.push(shortenCamera(e.camera));
  if (e.lens) parts.push(shortenLens(e.lens));
  const aperture = formatAperture(e.aperture);
  if (aperture) parts.push(aperture);
  const shutter = formatShutter(e.shutterSpeed);
  if (shutter) parts.push(shutter);
  const iso = formatIso(e.iso);
  if (iso) parts.push(iso);
  if (e.filmSimulation) parts.push(e.filmSimulation.toUpperCase());
  return parts.join(' · ');
}

function shortenCamera(name: string): string {
  return name
    .replace(/^FUJIFILM\s+/i, '')
    .replace(/^Apple\s*/i, '')
    .trim();
}

function shortenLens(name: string): string {
  // "XF23mmF2 R WR" → "XF23"
  const m = name.match(/^(XF|XC)(\d+)(?:mm)?/i);
  if (m) return `${m[1].toUpperCase()}${m[2]}`;
  return name;
}

/**
 * Key-value pairs shown in the expanded photo's EXIF panel.
 */
export function buildExifRows(exif: Exif, takenAt: string): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  rows.push(['Date', formatDate(takenAt)]);
  if (exif.camera) rows.push(['Camera', exif.camera]);
  if (exif.lens) rows.push(['Lens', exif.lens]);
  const focal = formatFocalLength(exif.focalLength, exif.focalLength35);
  if (focal) rows.push(['Focal', focal]);
  const aperture = formatAperture(exif.aperture);
  if (aperture) rows.push(['Aperture', aperture]);
  const shutter = formatShutter(exif.shutterSpeed);
  if (shutter) rows.push(['Shutter', shutter]);
  const iso = formatIso(exif.iso);
  if (iso) rows.push(['ISO', iso]);
  const comp = formatExposureComp(exif.exposureComp);
  if (comp) rows.push(['Exp. comp', comp]);
  if (exif.filmSimulation) rows.push(['Film sim', exif.filmSimulation]);
  return rows;
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(lib): EXIF formatters and caption builder"
```

---

## Task 6: Filter store and facet computation (`lib/filters.ts`)

**Files:**
- Create: `src/lib/filters.ts`

- [ ] **Step 1: Create `src/lib/filters.ts`**

Write to `src/lib/filters.ts`:
```ts
import { create } from 'zustand';
import type { Photo } from './photos';
import { manifest } from './photos';

export type FocalBucket = '≤24mm' | '35mm' | '50mm' | '85mm' | '135mm+';

export function focalBucket(focal?: number): FocalBucket | undefined {
  if (focal === undefined) return undefined;
  if (focal <= 24) return '≤24mm';
  if (focal < 45) return '35mm';
  if (focal < 70) return '50mm';
  if (focal < 120) return '85mm';
  return '135mm+';
}

export type FilterState = {
  camera: string[];
  lens: string[];
  focal: FocalBucket[];
  film: string[];
  tag: string[];
};

export const emptyFilters: FilterState = {
  camera: [],
  lens: [],
  focal: [],
  film: [],
  tag: [],
};

type FilterActions = {
  set: (next: FilterState) => void;
  toggle: (group: keyof FilterState, value: string) => void;
  clear: () => void;
};

export const useFilters = create<FilterState & FilterActions>((set, get) => ({
  ...emptyFilters,
  set: (next) => set(next),
  toggle: (group, value) => {
    const current = get()[group] as string[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    set({ [group]: next } as Partial<FilterState>);
  },
  clear: () => set(emptyFilters),
}));

/**
 * OR within a group, AND across groups.
 */
export function matchesFilters(photo: Photo, f: FilterState): boolean {
  if (f.camera.length > 0 && (!photo.exif.camera || !f.camera.includes(photo.exif.camera))) return false;
  if (f.lens.length > 0 && (!photo.exif.lens || !f.lens.includes(photo.exif.lens))) return false;
  if (f.focal.length > 0) {
    const b = focalBucket(photo.exif.focalLength);
    if (!b || !f.focal.includes(b)) return false;
  }
  if (f.film.length > 0 && (!photo.exif.filmSimulation || !f.film.includes(photo.exif.filmSimulation))) return false;
  if (f.tag.length > 0) {
    const tags = photo.tags ?? [];
    if (!f.tag.some((t) => tags.includes(t))) return false;
  }
  return true;
}

export function filterPhotos(photos: Photo[], f: FilterState): Photo[] {
  return photos.filter((p) => matchesFilters(p, f));
}

/**
 * Facet counts: for each possible value in a group, count photos that WOULD match
 * if that value were selected on top of the currently-active filters of the OTHER groups.
 * This is the standard e-commerce pattern — clicking a value always shows a non-zero count.
 */
export type Facet = {
  key: keyof FilterState;
  label: string;
  values: Array<{ value: string; count: number; active: boolean }>;
};

export function computeFacets(f: FilterState): Facet[] {
  const all = manifest.photos;
  const facets: Facet[] = [];

  const groups: Array<{ key: keyof FilterState; label: string; extract: (p: Photo) => string[] }> = [
    { key: 'camera', label: 'Camera', extract: (p) => (p.exif.camera ? [p.exif.camera] : []) },
    { key: 'lens', label: 'Lens', extract: (p) => (p.exif.lens ? [p.exif.lens] : []) },
    { key: 'focal', label: 'Focal length', extract: (p) => {
      const b = focalBucket(p.exif.focalLength);
      return b ? [b] : [];
    }},
    { key: 'film', label: 'Film sim', extract: (p) => (p.exif.filmSimulation ? [p.exif.filmSimulation] : []) },
    { key: 'tag', label: 'Tag', extract: (p) => p.tags ?? [] },
  ];

  for (const g of groups) {
    // Exclude this group's own selections from the "other filters" pass
    const other: FilterState = { ...f, [g.key]: [] };
    const pool = all.filter((p) => matchesFilters(p, other));
    const counts = new Map<string, number>();
    for (const p of pool) {
      for (const v of g.extract(p)) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const active = f[g.key] as string[];
    const values = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, count, active: active.includes(value) }));
    if (values.length > 0) facets.push({ key: g.key, label: g.label, values });
  }
  return facets;
}

export function hasAnyFilter(f: FilterState): boolean {
  return f.camera.length + f.lens.length + f.focal.length + f.film.length + f.tag.length > 0;
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(lib): filter state, facet computation, focal-length bucketing"
```

---

## Task 7: Sync script — scaffold, arg parsing, file scanning

**Files:**
- Create: `scripts/sync-photos.ts`

- [ ] **Step 1: Create `scripts/sync-photos.ts`**

Write to `scripts/sync-photos.ts`:
```ts
import { parseArgs } from 'node:util';
import { readdir, readFile, writeFile, rename, access, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, extname } from 'node:path';
import 'dotenv/config';

const ORIGINALS_DIR = 'photos/originals';
const MANIFEST_PATH = 'src/data/photos.json';
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.heic', '.heif', '.png', '.webp']);

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
  id: string;
  bytes: Buffer;
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
    files.push({ path, id, bytes });
  }
  return files;
}

function parseFlags() {
  return parseArgs({
    options: {
      dry: { type: 'boolean', default: false },
      prune: { type: 'boolean', default: false },
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

async function main() {
  const flags = parseFlags();
  if (!flags.dry) requireEnv();

  const manifest = await loadManifest();
  const existingIds = new Set(manifest.photos.map((p) => p.id));
  const sources = await scanOriginals();

  const newSources = sources.filter((s) => !existingIds.has(s.id));
  const sourceIds = new Set(sources.map((s) => s.id));
  const orphans = manifest.photos.filter((p) => !sourceIds.has(p.id));

  console.log(`Scan: ${sources.length} source files, ${newSources.length} new, ${orphans.length} orphaned manifest entries.`);
  console.log(`Mode: ${flags.dry ? 'DRY RUN' : 'LIVE'}${flags.prune ? ' (prune enabled)' : ''}`);

  if (flags.dry) {
    for (const s of newSources) console.log(`  + ${s.path} (${s.id})`);
    for (const o of orphans) console.log(`  - ${o.id} (orphaned)`);
    return;
  }

  // TODO: process newSources, prune orphans, write manifest (next tasks)
  console.log('Sync scaffolding in place — extraction/upload not yet implemented.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Dry run**

```bash
npm run photos:sync -- --dry
```

Expected: prints `Scan: 0 source files, 0 new, 0 orphaned manifest entries.` and `Mode: DRY RUN`. No errors. (The directory is empty at this point.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(sync): scaffolding — arg parsing, scanning, content-hash IDs"
```

---

## Task 8: Sync script — EXIF extraction and blurhash

**Files:**
- Modify: `scripts/sync-photos.ts`

- [ ] **Step 1: Add EXIF + blurhash helpers**

At the top of `scripts/sync-photos.ts`, after the existing imports, add:
```ts
import exifr from 'exifr';
import sharp from 'sharp';
import { encode as encodeBlurhash } from 'blurhash';
```

- [ ] **Step 2: Add extraction functions**

Append to `scripts/sync-photos.ts` (before `async function main()`):
```ts
type ExtractedMeta = {
  width: number;
  height: number;
  blurhash: string;
  takenAt: string;
  exif: Exif;
};

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
      tiff: true,
      ifd0: true,
      exif: true,
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
  // Represent as 1/x (e.g., 0.004 → "1/250")
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

  // Blurhash: downscale to 32×32 RGBA
  const { data, info } = await image
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const blurhash = encodeBlurhash(new Uint8ClampedArray(data), info.width, info.height, 4, 3);

  const [exif, takenAt] = await Promise.all([extractExif(bytes), extractedTakenAt(bytes)]);

  return { width, height, blurhash, takenAt, exif };
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(sync): EXIF extraction via exifr + blurhash generation via sharp"
```

---

## Task 9: Sync script — Cloudflare Images upload

**Files:**
- Modify: `scripts/sync-photos.ts`

- [ ] **Step 1: Add upload function**

Append to `scripts/sync-photos.ts` (before `async function main()`):
```ts
const CF_BASE = 'https://api.cloudflare.com/client/v4';

type CloudflareUploadResponse = {
  success: boolean;
  errors?: Array<{ message: string }>;
  result?: { id: string };
};

async function uploadToCloudflare(
  bytes: Buffer,
  filename: string,
  accountId: string,
  token: string,
): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([bytes]), filename);
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
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(sync): Cloudflare Images upload and delete helpers"
```

---

## Task 10: Sync script — main processing loop + manifest write + prune

**Files:**
- Modify: `scripts/sync-photos.ts`

- [ ] **Step 1: Add readline-based confirm helper**

At the top of `scripts/sync-photos.ts`, add this import:
```ts
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
```

Then append to the file (before `async function main()`):
```ts
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
```

- [ ] **Step 2: Replace `main()` with full processing loop**

Replace the existing `main()` function in `scripts/sync-photos.ts` with:
```ts
async function main() {
  const flags = parseFlags();
  const env = flags.dry ? { accountId: '', token: '' } : requireEnv();

  const manifest = await loadManifest();
  const existingIds = new Set(manifest.photos.map((p) => p.id));
  const sources = await scanOriginals();

  const newSources = sources.filter((s) => !existingIds.has(s.id));
  const sourceIds = new Set(sources.map((s) => s.id));
  const orphans = manifest.photos.filter((p) => !sourceIds.has(p.id));

  console.log(`Scan: ${sources.length} source files, ${newSources.length} new, ${orphans.length} orphaned manifest entries.`);
  console.log(`Mode: ${flags.dry ? 'DRY RUN' : 'LIVE'}${flags.prune ? ' (prune enabled)' : ''}`);

  if (flags.dry) {
    for (const s of newSources) console.log(`  + ${s.path} (${s.id})`);
    for (const o of orphans) console.log(`  - ${o.id} (orphaned)`);
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

  let photos = [...manifest.photos, ...added];

  if (flags.prune && orphans.length > 0) {
    console.log(`Orphans to prune: ${orphans.map((o) => o.id).join(', ')}`);
    const ok = await confirm('Delete these from Cloudflare Images and the manifest?');
    if (ok) {
      for (const o of orphans) {
        try {
          await deleteFromCloudflare(o.cfImageId, env.accountId, env.token);
          console.log(`  - deleted ${o.id}`);
        } catch (err) {
          console.warn(`  ! delete failed for ${o.id}:`, err instanceof Error ? err.message : err);
        }
      }
      const orphanIds = new Set(orphans.map((o) => o.id));
      photos = photos.filter((p) => !orphanIds.has(p.id));
    } else {
      console.log('Pruning skipped.');
    }
  }

  photos.sort((a, b) => b.takenAt.localeCompare(a.takenAt));

  const nextManifest: Manifest = {
    generatedAt: new Date().toISOString(),
    photos,
  };
  await writeManifestAtomic(nextManifest);

  console.log(`Done. +${added.length} added · ${failed.length} failed · total ${photos.length}.`);
  if (failed.length > 0) process.exitCode = 1;
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 4: Dry run**

```bash
npm run photos:sync -- --dry
```

Expected: still prints the same scan summary. No errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(sync): main processing loop, atomic manifest write, prune mode"
```

---

## Task 11: Router setup — `__root`, `index` route, zod search schema

**Files:**
- Create: `src/routes/__root.tsx`, `src/routes/index.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create `src/routes/__root.tsx`**

Write to `src/routes/__root.tsx`:
```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return <Outlet />;
}
```

- [ ] **Step 2: Create `src/routes/index.tsx`**

Write to `src/routes/index.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const focalBucketSchema = z.enum(['≤24mm', '35mm', '50mm', '85mm', '135mm+']);

export const searchSchema = z.object({
  camera: z.array(z.string()).optional(),
  lens: z.array(z.string()).optional(),
  focal: z.array(focalBucketSchema).optional(),
  film: z.array(z.string()).optional(),
  tag: z.array(z.string()).optional(),
  photo: z.string().optional(),
});

export type GallerySearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: GalleryPage,
});

function GalleryPage() {
  return (
    <div className="p-8 font-sans">
      <p className="font-mono text-sm text-ash">Router ready — gallery coming next.</p>
    </div>
  );
}
```

- [ ] **Step 3: Replace `src/main.tsx`**

Write to `src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import './styles/theme.css';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

- [ ] **Step 4: Run dev server to let the plugin generate `routeTree.gen.ts`**

```bash
npm run dev
```

Expected: Vite starts; TanStack Router plugin auto-generates `src/routeTree.gen.ts`. Open http://localhost:5173/ — page shows "Router ready — gallery coming next."

Also try http://localhost:5173/?camera=X-T5 — page renders fine (search params validated by zod, unknown values simply don't apply yet).

Stop the dev server.

- [ ] **Step 5: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(router): TanStack Router with zod-validated search schema"
```

---

## Task 12: Header component

**Files:**
- Create: `src/components/Header.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create `src/components/Header.tsx`**

Write to `src/components/Header.tsx`:
```tsx
import { manifest } from '@/lib/photos';

export function Header() {
  const count = manifest.photos.length;
  const updated = new Date(manifest.generatedAt);
  const updatedStr = `${updated.getFullYear()}·${String(updated.getMonth() + 1).padStart(2, '0')}·${String(updated.getDate()).padStart(2, '0')}`;
  return (
    <header className="flex items-baseline justify-between px-6 py-5 border-b border-hairline">
      <h1 className="font-sans text-sm tracking-tight text-ink">
        ADAM PATTERSON — PHOTOGRAPHS
      </h1>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ash">
        {String(count).padStart(3, '0')} · UPDATED {updatedStr}
      </p>
    </header>
  );
}
```

(Site name is placeholder-ish — replace "ADAM PATTERSON" with whatever you want later.)

- [ ] **Step 2: Render Header in the index route**

Replace `src/routes/index.tsx` contents with:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { Header } from '@/components/Header';

const focalBucketSchema = z.enum(['≤24mm', '35mm', '50mm', '85mm', '135mm+']);

export const searchSchema = z.object({
  camera: z.array(z.string()).optional(),
  lens: z.array(z.string()).optional(),
  focal: z.array(focalBucketSchema).optional(),
  film: z.array(z.string()).optional(),
  tag: z.array(z.string()).optional(),
  photo: z.string().optional(),
});

export type GallerySearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: GalleryPage,
});

function GalleryPage() {
  return (
    <div className="min-h-dvh bg-paper">
      <Header />
      <main className="p-6">
        <p className="font-mono text-sm text-ash">Gallery body goes here.</p>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Open http://localhost:5173/. Expect: a minimal header with site name (Inter) on the left and `000 · UPDATED 1970·01·01` (mono) on the right, thin hairline rule underneath. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): Header component"
```

---

## Task 13: PhotoTile + Blurhash components

**Files:**
- Create: `src/components/Blurhash.tsx`, `src/components/PhotoTile.tsx`

- [ ] **Step 1: Create `src/components/Blurhash.tsx`**

Write to `src/components/Blurhash.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import { decode } from 'blurhash';

type Props = {
  hash: string;
  width?: number;
  height?: number;
  className?: string;
};

/**
 * Decodes a blurhash into a 32x32 canvas. Scaled up via CSS.
 */
export function Blurhash({ hash, width = 32, height = 32, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    try {
      const pixels = decode(hash, width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const imageData = ctx.createImageData(width, height);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // Invalid hash — leave the canvas blank; parent shows solid bg
    }
  }, [hash, width, height]);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
```

- [ ] **Step 2: Create `src/components/PhotoTile.tsx`**

Write to `src/components/PhotoTile.tsx`:
```tsx
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
// Tile spans Math.round(tileWidth / aspectRatio / ROW_HEIGHT) rows.
const ROW_HEIGHT = 10;

export function PhotoTile({ photo, index }: Props) {
  const [loaded, setLoaded] = useState(false);
  const caption = formatCaption(photo, index);

  return (
    <figure
      className="flex flex-col gap-1.5"
      style={{
        gridRow: `span ${Math.max(4, Math.round(estimatedHeight(photo.aspectRatio) / ROW_HEIGHT))}`,
      }}
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

// Tiles in a 3-column grid on desktop are ~1/3 of viewport width.
// We return a rough px figure so grid-row spans are proportional to aspect ratio.
function estimatedHeight(aspectRatio: number): number {
  const assumedTileWidth = 400;
  return assumedTileWidth / aspectRatio;
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): PhotoTile with motion layoutId, Blurhash placeholder"
```

---

## Task 14: Gallery component

**Files:**
- Create: `src/components/Gallery.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create `src/components/Gallery.tsx`**

Write to `src/components/Gallery.tsx`:
```tsx
import { AnimatePresence } from 'motion/react';
import { manifest } from '@/lib/photos';
import { useFilters, filterPhotos } from '@/lib/filters';
import { PhotoTile } from './PhotoTile';

export function Gallery() {
  const filters = useFilters();
  const photos = filterPhotos(manifest.photos, filters);

  return (
    <div
      className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      style={{
        gridAutoRows: '10px',
      }}
    >
      <AnimatePresence initial={false}>
        {photos.map((photo, index) => (
          <PhotoTile key={photo.id} photo={photo} index={index} />
        ))}
      </AnimatePresence>
      {photos.length === 0 && (
        <p className="col-span-full font-mono text-xs text-ash py-16 text-center">
          No photos match current filters.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Render Gallery in the index route**

Replace the `GalleryPage` function in `src/routes/index.tsx` with:
```tsx
function GalleryPage() {
  return (
    <div className="min-h-dvh bg-paper">
      <Header />
      <main className="flex flex-col lg:flex-row gap-6 px-6 pt-6 pb-16">
        <div className="flex-1 min-w-0">
          <Gallery />
        </div>
        {/* FilterSidebar will go here in Task 15 */}
      </main>
    </div>
  );
}
```

At the top of `src/routes/index.tsx`, add:
```tsx
import { Gallery } from '@/components/Gallery';
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Open http://localhost:5173/. Expect: header + "No photos match current filters." message (because manifest is still empty). Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): Gallery component with responsive masonry grid"
```

---

## Task 15: FilterSidebar — desktop

**Files:**
- Create: `src/components/FilterSidebar.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create `src/components/FilterSidebar.tsx`**

Write to `src/components/FilterSidebar.tsx`:
```tsx
import { useNavigate } from '@tanstack/react-router';
import type { FilterState } from '@/lib/filters';
import { useFilters, computeFacets, hasAnyFilter, emptyFilters } from '@/lib/filters';

type Props = {
  variant?: 'desktop' | 'mobile';
};

export function FilterSidebar({ variant = 'desktop' }: Props) {
  const filters = useFilters();
  const setState = useFilters((s) => s.set);
  const navigate = useNavigate({ from: '/' });
  const facets = computeFacets(filters);

  const toggleValue = (group: keyof FilterState, value: string) => {
    const current = filters[group] as string[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    const nextFilters = { ...filters, [group]: next } as FilterState;
    setState(nextFilters);
    navigate({
      search: (prev) => ({
        ...prev,
        [group]: next.length > 0 ? next : undefined,
      }),
      replace: true,
    });
  };

  const clearAll = () => {
    setState(emptyFilters);
    navigate({
      search: (prev) => ({
        ...prev,
        camera: undefined,
        lens: undefined,
        focal: undefined,
        film: undefined,
        tag: undefined,
      }),
      replace: true,
    });
  };

  return (
    <aside
      className={
        variant === 'desktop'
          ? 'hidden lg:flex lg:flex-col gap-5 w-40 shrink-0 font-mono text-[11px]'
          : 'flex flex-col gap-5 font-mono text-[11px]'
      }
    >
      {hasAnyFilter(filters) && (
        <button
          type="button"
          onClick={clearAll}
          className="self-start text-[10px] uppercase tracking-[0.12em] text-accent hover:underline"
        >
          Clear all
        </button>
      )}
      {facets.map((facet) => (
        <section key={facet.key} className="flex flex-col gap-1">
          <div className="text-[9px] uppercase tracking-[0.14em] text-ash pb-1 border-b border-hairline">
            {facet.label}
          </div>
          {facet.values.map(({ value, count, active }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleValue(facet.key, value)}
              className={`flex items-center justify-between py-0.5 text-left transition-colors ${
                active ? 'text-accent' : 'text-graphite hover:text-ink'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                {active && <span className="inline-block w-1.5 h-1.5 bg-accent" aria-hidden />}
                <span className="truncate">{value}</span>
              </span>
              <span className="text-mist shrink-0">{count}</span>
            </button>
          ))}
        </section>
      ))}
      {facets.length === 0 && (
        <p className="text-ash">No filters available yet.</p>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Sync filter store with URL on mount**

Create `src/lib/use-sync-filters-from-url.ts`:
```ts
import { useEffect } from 'react';
import { useSearch } from '@tanstack/react-router';
import type { FilterState } from './filters';
import { useFilters, emptyFilters } from './filters';

export function useSyncFiltersFromUrl() {
  const search = useSearch({ from: '/' });
  const set = useFilters((s) => s.set);

  useEffect(() => {
    const next: FilterState = {
      ...emptyFilters,
      camera: search.camera ?? [],
      lens: search.lens ?? [],
      focal: search.focal ?? [],
      film: search.film ?? [],
      tag: search.tag ?? [],
    };
    set(next);
  }, [search.camera, search.lens, search.focal, search.film, search.tag, set]);
}
```

- [ ] **Step 3: Wire everything into the route**

Replace the `GalleryPage` function in `src/routes/index.tsx` with:
```tsx
function GalleryPage() {
  useSyncFiltersFromUrl();
  return (
    <div className="min-h-dvh bg-paper">
      <Header />
      <main className="flex flex-col lg:flex-row gap-8 px-6 pt-6 pb-16">
        <div className="flex-1 min-w-0">
          <Gallery />
        </div>
        <FilterSidebar />
      </main>
    </div>
  );
}
```

Add these imports to `src/routes/index.tsx`:
```tsx
import { FilterSidebar } from '@/components/FilterSidebar';
import { useSyncFiltersFromUrl } from '@/lib/use-sync-filters-from-url';
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Open http://localhost:5173/. Expect: desktop view shows header + empty gallery + "No filters available yet." sidebar on the right (empty manifest → no facets). Resize viewport below 1100px → sidebar hides (we'll add mobile drawer next). Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): FilterSidebar (desktop) with facet computation and URL sync"
```

---

## Task 16: FilterSidebar — mobile drawer

**Files:**
- Create: `src/components/FilterDrawer.tsx`
- Modify: `src/components/Header.tsx`, `src/routes/index.tsx`

- [ ] **Step 1: Create `src/components/FilterDrawer.tsx`**

Write to `src/components/FilterDrawer.tsx`:
```tsx
import { AnimatePresence, motion } from 'motion/react';
import { FilterSidebar } from './FilterSidebar';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function FilterDrawer({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-ink/30 lg:hidden z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 bottom-0 w-72 max-w-[80vw] bg-paper p-6 z-50 overflow-y-auto lg:hidden"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex justify-between items-baseline mb-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ash">
                Filters
              </span>
              <button
                type="button"
                onClick={onClose}
                className="font-mono text-xs text-ink hover:text-accent"
                aria-label="Close filters"
              >
                CLOSE ✕
              </button>
            </div>
            <FilterSidebar variant="mobile" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Modify Header to include a filter trigger**

Replace `src/components/Header.tsx` with:
```tsx
import { manifest } from '@/lib/photos';

type Props = {
  onOpenFilters: () => void;
};

export function Header({ onOpenFilters }: Props) {
  const count = manifest.photos.length;
  const updated = new Date(manifest.generatedAt);
  const updatedStr = `${updated.getFullYear()}·${String(updated.getMonth() + 1).padStart(2, '0')}·${String(updated.getDate()).padStart(2, '0')}`;
  return (
    <header className="flex items-baseline justify-between px-6 py-5 border-b border-hairline gap-4">
      <h1 className="font-sans text-sm tracking-tight text-ink truncate">
        ADAM PATTERSON — PHOTOGRAPHS
      </h1>
      <div className="flex items-baseline gap-4">
        <p className="hidden sm:block font-mono text-[10px] uppercase tracking-[0.12em] text-ash">
          {String(count).padStart(3, '0')} · UPDATED {updatedStr}
        </p>
        <button
          type="button"
          onClick={onOpenFilters}
          className="lg:hidden font-mono text-[10px] uppercase tracking-[0.12em] text-ink hover:text-accent"
        >
          FILTERS
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Wire the drawer into the route**

Update `src/routes/index.tsx` `GalleryPage` component:
```tsx
function GalleryPage() {
  useSyncFiltersFromUrl();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-paper">
      <Header onOpenFilters={() => setDrawerOpen(true)} />
      <main className="flex flex-col lg:flex-row gap-8 px-6 pt-6 pb-16">
        <div className="flex-1 min-w-0">
          <Gallery />
        </div>
        <FilterSidebar />
      </main>
      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
```

Add these imports:
```tsx
import { useState } from 'react';
import { FilterDrawer } from '@/components/FilterDrawer';
```

- [ ] **Step 4: Verify responsive behavior**

```bash
npm run dev
```

Open http://localhost:5173/. Resize the window below 1100px: a "FILTERS" button should appear in the header. Clicking it slides a drawer in from the right. Clicking the backdrop or CLOSE dismisses it. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): mobile filter drawer with motion slide-in"
```

---

## Task 17: ExpandedPhoto with motion.dev shared-element animation

**Files:**
- Create: `src/components/ExpandedPhoto.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create `src/components/ExpandedPhoto.tsx`**

Write to `src/components/ExpandedPhoto.tsx`:
```tsx
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

  const photo: Photo | undefined = photoId ? manifest.photos.find((p) => p.id === photoId) : undefined;

  // Sibling navigation respects current filter: use the unfiltered manifest for "all photos"
  // (simpler; if you want prev/next to respect filters later, pass the filtered list in as a prop)
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
```

- [ ] **Step 2: Mount ExpandedPhoto in the route**

Update `src/routes/index.tsx` `GalleryPage`:
```tsx
function GalleryPage() {
  useSyncFiltersFromUrl();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-paper">
      <Header onOpenFilters={() => setDrawerOpen(true)} />
      <main className="flex flex-col lg:flex-row gap-8 px-6 pt-6 pb-16">
        <div className="flex-1 min-w-0">
          <Gallery />
        </div>
        <FilterSidebar />
      </main>
      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <ExpandedPhoto />
    </div>
  );
}
```

Add the import:
```tsx
import { ExpandedPhoto } from '@/components/ExpandedPhoto';
```

- [ ] **Step 3: Typecheck and run**

```bash
npm run typecheck
npm run dev
```

Expected: typecheck exits 0. Dev server starts. With an empty manifest, you can't see the expansion in action yet — it'll come alive when you run `photos:sync` with real photos.

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): ExpandedPhoto with motion.dev shared-element animation + keyboard nav"
```

---

## Task 18: Vercel deployment config

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create `vercel.json`**

Write to `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The `rewrites` rule makes SPA routes work on Vercel — any request gets served `index.html` and the router takes over.

- [ ] **Step 2: Verify production build works locally**

```bash
npm run build
```

Expected: TypeScript compiles, Vite produces a `dist/` directory.

```bash
npm run preview
```

Expected: preview server runs the production build. Open http://localhost:4173/ — same UI as dev mode. Stop preview server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: Vercel deployment config"
```

---

## Post-implementation checklist (manual, not automated)

After all 18 tasks are complete, walk through this list in the browser with a small set of real photos:

- [ ] Place 5–10 photos in `photos/originals/` and run `npm run photos:sync`. Verify the manifest populates.
- [ ] Open `npm run dev` and check: gallery grid renders, tile captions show correct EXIF, filter sidebar populates with facets.
- [ ] Click a tile: expansion animates via motion.dev, URL updates to `?photo=<id>`.
- [ ] Arrow-key navigation moves between photos; Escape closes.
- [ ] Copy the `?photo=xxx` URL, open in a new tab: the photo is expanded on load.
- [ ] Toggle a filter: URL updates, tiles animate out, facet counts refresh.
- [ ] Copy a filtered URL, open in a new tab: filters are applied.
- [ ] Resize below 1100px: sidebar collapses, FILTERS button appears in header, drawer slide-in works.
- [ ] Try an unknown `?camera=NotARealCamera` — it's silently dropped.
- [ ] Try an unknown `?photo=xxxxxxxx` — gallery renders, no expansion, no crash.
- [ ] Run `npm run build && npm run preview` and spot-check the production bundle.
- [ ] Deploy to Vercel, ensure `VITE_CF_ACCOUNT_HASH` is set in project env vars, verify the live site.

## Notes for later iteration

These were called out in the spec as explicitly deferred. When you come back to them:

- **Captions/titles per photo.** Add `caption?: string` to `Photo`, surface in `ExpandedPhoto`, and add an editor or sidecar file workflow for adding captions.
- **Dark mode.** Add a second set of `--color-*` tokens under a `[data-theme="dark"]` selector; swap via OS preference or a toggle.
- **GPS map view.** EXIF GPS tags are already parseable by `exifr` — add `location?: {lat, lng}` to the data model and a new `<MapView>` component.
- **Filter-aware prev/next.** `ExpandedPhoto` currently navigates siblings in the unfiltered manifest. Change it to accept the filtered list via context or prop.
- **Watch mode / CI sync.** Right now the sync is manual. If you add more photos frequently, `chokidar` + `p-limit(4)` would make incremental syncs fast.
