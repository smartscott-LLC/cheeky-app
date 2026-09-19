import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ASSET_DIR = '/home/server/Pictures/avatar/split_assets';

export async function GET(request: Request, { params }: { params: Promise<{ path: string }> }) {
  const { path: filePath } = await params;
  const decoded = decodeURIComponent(filePath);
  const fullPath = path.join(ASSET_DIR, decoded);
  
  if (!fs.existsSync(fullPath) || !fullPath.startsWith(ASSET_DIR)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  const buffer = fs.readFileSync(fullPath);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'model/gltf-binary',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
