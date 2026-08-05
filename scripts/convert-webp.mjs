// Perf pass: converts every served PNG under public/ to WebP (quality 80).
// The true originals live in persona_assets/ — the PNGs converted here are
// the served copies only. public/icons/ is skipped on purpose: the PWA
// manifest and Play Store listing require PNG icons.
//
// Usage: node scripts/convert-webp.mjs
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, out);
    else if (entry.name.endsWith('.png')) out.push(p);
  }
  return out;
}

const kb = (bytes) => (bytes / 1024).toFixed(0) + 'KB';

const all = await walk('public');
const images = all.filter((f) => !f.startsWith('public/icons'));

let totalBefore = 0;
let totalAfter = 0;

for (const file of images) {
  const out = file.replace(/\.png$/, '.webp');
  const before = (await readFile(file)).byteLength;
  await sharp(file).webp({ quality: 80 }).toFile(out);
  const after = (await readFile(out)).byteLength;
  totalBefore += before;
  totalAfter += after;
  console.log(
    `${file}  ${kb(before)} -> ${kb(after)}  (${Math.round((1 - after / before) * 100)}% smaller)`
  );
}
console.log(
  `\nTotal: ${kb(totalBefore)} -> ${kb(totalAfter)} (${Math.round((1 - totalAfter / totalBefore) * 100)}% smaller)`
);
console.log(`Skipped: ${all.length - images.length} icon PNG (manifest/Play requirement)`);
