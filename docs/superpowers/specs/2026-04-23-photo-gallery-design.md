# Photo Gallery — Design

**Date:** 2026-04-23
**Status:** Design approved pending user spec review

## Overview

A personal photo gallery (not a blog — no written content) presenting ~100 photographs with their EXIF metadata. Content is static and updated rarely. The site ships as a prerendered static bundle; all data is computed at sync time and baked into a JSON manifest that the React app reads at runtime.

**Aesthetic direction:** Bauhaus / Scandinavian / Engineering — specifically the "engineering archive" take: monospace EXIF captions under every thumbnail, numbered tiles, hairline rules, paper-white palette, single restrained accent color. Inspired by Sam Becker's photos.sambecker.com, but denser and more data-forward.

**Key interactions:**
- A masonry grid presents all photos in chronological order.
- A right-side filter rail lets you narrow by EXIF-derived facets (camera, lens, focal length, film simulation, tag).
- Clicking a photo triggers a `motion.dev` shared-element layout animation that morphs the thumbnail into a large centered view with full EXIF.
- Every state is deep-linkable via URL search params.

## Stack

- **Build tool:** Vite + React 19 + TypeScript (strict)
- **Styling:** TailwindCSS v4, CSS-first config via `@theme`
- **Fonts:** Inter (sans) + JetBrains Mono (mono), self-hosted via `@fontsource`
- **Animation:** `motion` package (formerly Framer Motion / motion.dev)
- **Routing:** TanStack Router — search-params-as-state, typed via zod
- **State:** Zustand store for filter state, mirrored from URL
- **Image host:** Cloudflare Images (named variants configured in dashboard)
- **Hosting:** Vercel (static output)
- **Node tooling:** `exifr` for EXIF parsing, `sharp` + `blurhash` for placeholders, `fetch` for Cloudflare Images REST API

## Directory layout

```
photo-blog/
├── photos/originals/           # gitignored; source photos live here
├── scripts/
│   └── sync-photos.ts          # Node script: EXIF + upload + manifest
├── src/
│   ├── data/photos.json        # generated manifest, committed
│   ├── components/
│   │   ├── Gallery.tsx
│   │   ├── PhotoTile.tsx
│   │   ├── ExpandedPhoto.tsx
│   │   ├── FilterSidebar.tsx
│   │   └── Header.tsx
│   ├── lib/
│   │   ├── photos.ts           # type-safe manifest loader + derived data
│   │   ├── exif-format.ts      # formatters (ƒ/1.4, 1/250s, etc.)
│   │   └── filters.ts          # Zustand store + facet computation
│   ├── routes/
│   │   └── index.tsx           # the single route
│   ├── styles/theme.css        # Tailwind v4 @theme tokens
│   └── main.tsx
├── .env.example                # CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_IMAGES_TOKEN
├── vercel.json
└── package.json
```

Two npm scripts:
- `photos:sync` — run locally after dropping new photos into `photos/originals/`.
- `build` — pure static build, no API calls.

## Data model

`src/data/photos.json` is the single source of truth the site reads at runtime.

```ts
export type Photo = {
  id: string;                    // first 8 chars of SHA-256 of file bytes — stable across renames
  cfImageId: string;             // Cloudflare Images ID
  width: number;
  height: number;
  aspectRatio: number;           // width/height, precomputed for masonry sizing
  blurhash: string;              // ~30 chars, decoded client-side to a placeholder
  takenAt: string;               // ISO 8601, from EXIF DateTimeOriginal
  exif: {
    camera?: string;
    lens?: string;
    focalLength?: number;        // mm, actual
    focalLength35?: number;      // mm, 35mm-equivalent
    aperture?: number;           // f-stop as number; formatted at render
    shutterSpeed?: string;       // "1/250" or "2"
    iso?: number;
    exposureComp?: number;       // e.g., -0.333
    filmSimulation?: string;
  };
  tags?: string[];               // optional manual tags via sidecar file
};

export type PhotoManifest = {
  generatedAt: string;
  photos: Photo[];               // pre-sorted reverse-chronological by takenAt
};
```

**Invariants:**
- All EXIF fields are optional. UI renders gracefully when any are missing.
- `aspectRatio` is precomputed so masonry tiles size before images load.
- Manifest is sorted at write time; site never re-sorts.
- `id` is deterministic from file bytes — renames and path changes don't produce duplicates.

Cloudflare Images URLs are built at render time: `https://imagedelivery.net/<account-hash>/<cfImageId>/<variant>`. Variants: `thumb` (~600w), `medium` (~1600w), `full` (original). Configured once in the Cloudflare dashboard — not per-sync.

## Prerequisites (one-time setup)

Before the sync script can run:

1. **Cloudflare Images enabled** on the account (paid feature).
2. **Three variants configured** in the Cloudflare dashboard: `thumb` (max 600w, fit:scale-down), `medium` (max 1600w, fit:scale-down), `full` (original, no transform). The site references these by name — if they don't exist, images 404.
3. **`.env` file** (gitignored) with:
   - `CLOUDFLARE_ACCOUNT_ID` — from dashboard URL.
   - `CLOUDFLARE_IMAGES_TOKEN` — API token with "Cloudflare Images: Edit" scope.
   - `VITE_CF_ACCOUNT_HASH` — the `imagedelivery.net` account hash (different from account ID), used at build time to construct image URLs.
4. **Node 20+** installed.

Vercel deployment needs `VITE_CF_ACCOUNT_HASH` added as a build-time env var in the project settings. The server-only token is not needed at build (the sync script is local-only).

## Build pipeline — `scripts/sync-photos.ts`

**Invocation:**
```
npm run photos:sync              # normal: additive diff
npm run photos:sync -- --dry     # show what would change, no API calls
npm run photos:sync -- --prune   # also remove manifest entries whose originals were deleted
```

**Steps per run:**

1. Load `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_IMAGES_TOKEN` from `.env`. Exit with a clear message if missing.
2. Read existing `src/data/photos.json` (if present) into a `Map<id, Photo>`.
3. Scan `photos/originals/` for `.jpg`, `.jpeg`, `.heic`, `.png`, `.webp`.
4. For each source file:
   - Compute SHA-256 of bytes → `id` = first 8 chars.
   - If `id` is in the manifest: skip (idempotency).
   - Else: parse EXIF with `exifr`; read dimensions; generate blurhash via `sharp` (downscale to 32×32) + `blurhash` package; upload original to Cloudflare Images (`POST /accounts/<id>/images/v1`, multipart); build `Photo` object; add to pending.
5. If `--prune`: find manifest entries whose source file no longer exists on disk; prompt before calling Cloudflare delete endpoint and removing from manifest.
6. Sort all photos by `takenAt` desc. Write `src/data/photos.json` atomically (write to temp, rename).
7. Report: `+3 added, 0 skipped, 1 pruned — total 67 photos`.

**Error handling (at boundaries):**
- Cloudflare upload fails → log filename + response body, continue to next file. Next run retries (content-hash idempotency).
- EXIF parse fails → log, still upload, store `exif: {}`.
- Any filesystem / network flake is recoverable by re-running.

**Not in scope:**
- Variant generation (Cloudflare does it server-side).
- Parallel uploads (serial is fine at this scale; add `p-limit` later if needed).
- Watch mode.

## Components

### `<Gallery>` — masonry grid
- Reads filtered photos from the Zustand filter store.
- CSS Grid with `grid-auto-rows: 10px` + per-tile `grid-row: span N` computed from `aspectRatio`. Preserves chronological left-to-right reading order (unlike CSS columns).
- Responsive column count: 3 desktop (≥1100px), 2 tablet (720–1100px), 1 mobile (≤720px).
- Wraps children in motion.dev `<AnimatePresence>` so filter-change tile removals animate out.

### `<PhotoTile>` — single tile
- A `motion.div` with `layoutId={photo.id}` — the handoff point for the expansion animation.
- Renders the Cloudflare `thumb` variant. Blurhash canvas sits under the `<img>` until `onLoad`.
- Below each tile: monospace one-liner — `№001 · X-T5 · XF23 · ƒ/2 · 1/250 · ISO400` — built by pure `formatCaption(photo)`.
- Click navigates to `?photo=<id>`. Does not manage expansion state.

### `<ExpandedPhoto>` — expansion overlay
- Portal-mounted. Renders when URL has `?photo=<id>`.
- Reads the photo via search param; finds it in the manifest.
- Contains a `motion.div` with the **same** `layoutId={photo.id}` — this is what makes the thumbnail morph.
- Layout: large photo centered on a dimmed backdrop; EXIF as a right-side panel (desktop) or bottom panel (mobile), monospace key-value aligned.
- Prev/next: arrow keys + visible nav buttons; each updates the URL.
- Close: Escape, backdrop click, or close button — clears `?photo` param.
- Unknown `?photo=xxx` → render nothing (no crash, no 404).

### `<FilterSidebar>` — right rail
- Groups: Camera · Lens · Focal length (buckets: ≤24mm / 35mm / 50mm / 85mm / 135mm+) · Film simulation · Tag.
- Each value displays its count within the current filter set.
- Semantics: **OR within a group, AND across groups.** Two cameras selected → photos from either; camera + lens → photos matching both.
- Active filters sync to URL (`?camera=X-T5&lens=XF23`). "Clear all" appears when any filter is active.
- Unknown filter values in URL → silently dropped.
- On mobile, collapses behind a trigger button in the header.

### `<Header>` — minimal masthead
- Left: site name in Inter.
- Right: image count + last-updated date in JetBrains Mono, from `manifest.generatedAt`.
- 1px hairline rule underneath. No nav.

### Shared state
- `lib/filters.ts` — Zustand store. Initializes from URL on mount, writes back on change via `navigate({ search })`.
- `lib/photos.ts` — imports the manifest, exposes memoized derived data (facet options and counts).
- Photo expansion state = `?photo` search param read via `useSearch()`. No store state for it.

## Routing & URL state

Single route (`/`). All state is in search params so every view is shareable.

```
/                                         full gallery
/?camera=X-T5                             filtered
/?camera=X-T5&lens=XF23                   multi-filter
/?photo=a3f9c1                            gallery + expanded photo
/?camera=X-T5&photo=a3f9c1                filtered + expanded
/?focal=35&film=classic-chrome            bucketed focal + film sim
```

**TanStack Router specifics:**
- `src/routes/index.tsx` defines the single route.
- `validateSearch` uses zod to type-check search params.
- Filter changes navigate with `replace: true` (don't flood history).
- Photo expansion navigates with `replace: false` (back button closes it).

**Deep-link edge cases:**
- Unknown `?photo=<id>` → ignore the param, show gallery.
- Unknown filter value → silently drop the filter.

## Styling system

TailwindCSS v4 with CSS-first config in `src/styles/theme.css`.

```css
@import "tailwindcss";

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
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Layout */
  --spacing-tile-gap: 12px;
  --breakpoint-md: 720px;
  --breakpoint-lg: 1100px;
}
```

**Conventions:**
- Only the tokens above for color. No ad-hoc hex values in components.
- EXIF/metadata/counts use `font-mono`. Headings and body use `font-sans`.
- Borders are 1px `--color-hairline`, structural only.
- Accent is used sparingly: active filter, hovered interactive element, focus ring. Everything else is greyscale.
- No dark mode in v1.

**Responsive:**
- ≤720px: 1 column; filter sidebar collapses behind a header trigger button.
- 720–1100px: 2 columns; sidebar collapses behind trigger.
- ≥1100px: 3 columns; sidebar always visible on the right.

**Motion defaults:**
- Easing: `[0.22, 1, 0.36, 1]` (ease-out-quart).
- Durations: tile hover 150ms; filter layout shuffles 250ms; expanded photo open/close 350ms; blurhash→image crossfade 200ms.

## Testing

None. This is a display-only static site and the user prefers to verify visually in the browser. Components are simple enough that tests would slow iteration more than they'd catch bugs.

## Out of scope for v1

- Written content / captions per photo (the data model has no `caption` field).
- Dark mode.
- GPS / map view.
- Drag-to-reorder or browser-side editing.
- Virtualization (~100 photos doesn't warrant it).
- E2E tests / visual regression.
- Watch mode for sync script.

All are additive and can be introduced later without disturbing the core architecture.
