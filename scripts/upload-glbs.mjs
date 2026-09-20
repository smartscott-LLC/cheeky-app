#!/usr/bin/env node
/**
 * Upload GLB assets to Supabase Storage
 * Usage: SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-glbs.mjs [sourceDir] [bucket] [maxFiles]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ioqeddpgdilyyajsygmz.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SOURCE_DIR = process.argv[2] || '/home/server/Pictures/avatar/split_assets';
const BUCKET = process.argv[3] || 'quest-assets';
const MAX_FILES = parseInt(process.argv[4]) || 0;

if (!SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

async function uploadFile(filePath, key) {
  const buffer = fs.readFileSync(filePath);
  const contentType = 'model/gltf-binary';
  
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${key}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': contentType,
      'x-upsert': 'true'
    },
    body: buffer
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed: ${res.status} ${err}`);
  }
  
  return { success: true, size: buffer.length };
}

async function main() {
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log('');
  
  // Get all GLB files
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.glb')) {
        files.push(full);
      }
    }
  }
  walk(SOURCE_DIR);
  
  console.log(`Found ${files.length} GLB files`);
  if (MAX_FILES > 0) {
    console.log(`Limiting to ${MAX_FILES} files`);
    files.splice(MAX_FILES);
  }
  
  // Upload each file
  let uploaded = 0;
  let failed = 0;
  let totalSize = 0;
  
  for (const file of files) {
    const relPath = path.relative(SOURCE_DIR, file);
    const key = `assets/${relPath}`;
    
    try {
      const result = await uploadFile(file, key);
      uploaded++;
      totalSize += result.size;
      if (uploaded % 10 === 0 || uploaded === files.length) {
        console.log(`Uploaded ${uploaded}/${files.length} (${(totalSize/1024/1024).toFixed(1)}MB)`);
      }
    } catch (err) {
      failed++;
      console.error(`Failed: ${relPath} - ${err.message}`);
    }
  }
  
  console.log('');
  console.log(`Done: ${uploaded} uploaded, ${failed} failed, ${(totalSize/1024/1024).toFixed(1)}MB total`);
  console.log(`Base URL: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`);
}

main().catch(console.error);
