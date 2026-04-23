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
