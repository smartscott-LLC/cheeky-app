// One-time perf pass: converts the served floor/entrance art to WebP
// (the same 2MB PNGs were the LCP weight). The true originals live in
// persona_assets/ — the PNGs this converts are the served copies only.
//
// Usage: node scripts/convert-webp.mjs
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const IMAGES = [
  'public/brand/entrance.png',
  'public/brand/floor-free.png',
  'public/brand/floor-gold.png',
  'public/brand/floor-platinum.png',
  'public/brand/floor-diamond.png',
  'public/brand/club-interior.png',
  'public/floors/silver.png',
  'public/floors/gold.png',
  'public/floors/platinum.png',
  'public/floors/diamond.png'
];

const kb = (bytes) => (bytes / 1024).toFixed(0) + 'KB';

let totalBefore = 0;
let totalAfter = 0;

for (const file of IMAGES) {
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
