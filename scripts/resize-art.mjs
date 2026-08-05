// Responsive image pass (Lighthouse: 848 KiB of oversized images on the
// landing page). Generates display-appropriate variants while keeping the
// full-res webps for full-bleed room backgrounds.
//
// Usage: node scripts/resize-art.mjs
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const kb = (bytes) => (bytes / 1024).toFixed(0) + 'KB';

async function out(file, outPath, fn) {
  const before = (await readFile(file)).byteLength;
  const tmp = outPath + '.tmp';
  await fn().toFile(tmp);
  const { rename } = await import('node:fs/promises');
  await rename(tmp, outPath);
  const after = (await readFile(outPath)).byteLength;
  console.log(`${file} -> ${outPath}  ${kb(before)} -> ${kb(after)}`);
}

// The navbar/footer round logo (40px display, 2-3x retina).
await out('public/brand/entrance.webp', 'public/brand/entrance-logo.webp', () =>
  sharp('public/brand/entrance.webp').resize(96, 96, { fit: 'cover' }).webp({ quality: 80 })
);

// The hero entrance (max display 288x384; 2x = 576x768).
await out('public/brand/entrance.webp', 'public/brand/entrance.webp', () =>
  sharp('public/brand/entrance.webp').resize(576, 768).webp({ quality: 80 })
);

// Landing floor cards (display ~256x144; 2x = 512x288, round to 640x360).
for (const floor of ['silver', 'gold', 'platinum', 'diamond']) {
  await out(
    `public/floors/${floor}.webp`,
    `public/floors/card-${floor}.webp`,
    () => sharp(`public/floors/${floor}.webp`).resize(640, 360).webp({ quality: 80 })
  );
}
