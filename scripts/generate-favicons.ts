import sharp from 'sharp';
import { readFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

const SRC = 'public/aperture.svg';
const OUT_DIR = 'public';

const sizes: Array<{ name: string; size: number }> = [
  { name: 'favicon-16.png', size: 16 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-48.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-192.png', size: 192 },
  { name: 'favicon-512.png', size: 512 },
];

async function main() {
  const svg = await readFile(SRC);
  await copyFile(SRC, join(OUT_DIR, 'favicon.svg'));
  console.log(`✓ favicon.svg`);

  for (const { name, size } of sizes) {
    // density 2400 rasterizes the 24x24 SVG at ~800 px internally, plenty of
    // headroom for the largest (512) output.
    await sharp(svg, { density: 2400 })
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(join(OUT_DIR, name));
    console.log(`✓ ${name} (${size}×${size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
