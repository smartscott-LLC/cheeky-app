/**
 * Upload all app assets to Supabase Storage bucket 'cheeky-assets'.
 *
 * Usage: node scripts/upload-assets.mjs
 *
 * Scans public/ directories from both apps (cheeky-app + In-gameChatUI),
 * uploads each file to the cheeky-assets bucket under category folders,
 * and writes an asset manifest JSON file.
 */

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, relative, parse } from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: 'env.new' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY in env.new');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const BUCKET = 'cheeky-assets';
const MANIFEST_PATH = join(import.meta.dirname, '..', 'public', 'asset-manifest.json');

const CATEGORY_MAP = {
  'cheeky_icons_and_things': 'icons',
  'brand': 'brand',
  'personas': 'personas',
  'coat_check': 'coat-check',
  'floors': 'floors',
  'audio': 'audio',
  'icons': 'icons',
};

function detectCategory(relativePath) {
  for (const [prefix, category] of Object.entries(CATEGORY_MAP)) {
    if (relativePath.startsWith(prefix)) return category;
  }
  return 'misc';
}

async function scanDirectory(dir) {
  const files = [];

  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && /\.(webp|png|jpg|jpeg|svg|gif|ico|mp3|wav|ogg)$/i.test(entry.name)) {
        const rel = relative(dir, full);
        files.push({ path: rel, fullPath: full });
      }
    }
  }

  await walk(dir);
  return files;
}

async function uploadFile(filePath, storagePath) {
  const buffer = await readFile(filePath);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: getMimeType(filePath),
      upsert: true
    });

  if (error) {
    console.error(`  \u2717 Failed to upload ${storagePath}: ${error.message}`);
    return false;
  }
  return true;
}

function getMimeType(filePath) {
  const ext = parse(filePath).ext.toLowerCase();
  const mimes = {
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
  };
  return mimes[ext] ?? 'application/octet-stream';
}

function slugify(filename) {
  return parse(filename).name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/--+/g, '-');
}

function sanitizeKey(filename) {
  // Replace spaces, em-dashes, and other special chars with hyphens
  return filename
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/--+/g, '-');
}

async function main() {
  console.log(`\n\ud83d\udce6 Uploading assets to ${BUCKET} bucket...\n`);

  const cheekyDir = join(import.meta.dirname, '..', 'public');
  const loungeDir = join(import.meta.dirname, '..', '..', 'In-gameChatUI', 'public');

  const cheekyFiles = await scanDirectory(cheekyDir);
  let loungeFiles = [];
  try {
    loungeFiles = await scanDirectory(loungeDir);
  } catch {
    console.log('  (In-gameChatUI/public not found, skipping)');
  }

  // Deduplicate: lounge app has copies of the same icons
  const allFiles = [...cheekyFiles];
  for (const f of loungeFiles) {
    const cheekyMatch = cheekyFiles.find(cf => cf.path === f.path);
    if (!cheekyMatch) {
      allFiles.push(f);
    }
  }

  console.log(`  Found ${allFiles.length} assets to upload\n`);

  const manifest = [];
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of allFiles) {
    const category = detectCategory(file.path);
    const rawFilename = parse(file.path).base;

    // Preserve subdirectory structure within the category
    // e.g. "personas/bartender/fullbody.webp" → "personas/bartender/fullbody.webp"
    // e.g. "cheeky_icons_and_things/chat_bubble.webp" → "icons/chat_bubble.webp"
    const subpath = file.path.startsWith(category === 'misc' ? '' : Object.entries(CATEGORY_MAP).find(([,v]) => v === category)?.[0] ?? '')
      ? file.path.slice(file.path.indexOf('/') + 1)
      : rawFilename;

    const sanitized = sanitizeKey(rawFilename);
    // Use the subdirectory path for the storage key, but sanitize the filename part
    const dir = parse(subpath).dir;
    const storagePath = dir ? `${category}/${dir}/${sanitized}` : `${category}/${sanitized}`;
    const slug = slugify(parse(file.path).name);
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
    const s = await stat(file.fullPath);

    // Check if already uploaded (by sanitized name)
    const { data: existing } = await supabase.storage
      .from(BUCKET)
      .list(category, { limit: 1, search: sanitized });

    if (existing && existing.length > 0) {
      console.log(`  \u2713 ${storagePath} (already exists)`);
      skipped++;
    } else {
      const ok = await uploadFile(file.fullPath, storagePath);
      if (ok) {
        console.log(`  \u2713 ${storagePath}`);
        uploaded++;
      } else {
        failed++;
        continue;
      }
    }

    manifest.push({
      slug,
      category,
      filename: parse(file.path).base,
      url,
      sizeBytes: s.size,
      mimeType: getMimeType(file.fullPath),
    });
  }

  // Write manifest
  const manifestData = {
    generatedAt: new Date().toISOString(),
    bucket: BUCKET,
    baseUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`,
    total: manifest.length,
    assets: manifest,
  };

  await writeFile(MANIFEST_PATH, JSON.stringify(manifestData, null, 2));

  console.log(`\n\ud83d\udcc4 Manifest written to public/asset-manifest.json`);
  console.log(`\n\ud83d\udcca Summary:`);
  console.log(`  Uploaded:  ${uploaded}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Failed:    ${failed}`);
  console.log(`  Total:     ${manifest.length}`);
  console.log(`\n\u2705 Done!\n`);
}

main().catch((err) => {
  console.error('Upload failed:', err);
  process.exit(1);
});