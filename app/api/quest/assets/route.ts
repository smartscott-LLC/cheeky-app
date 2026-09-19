import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ASSET_DIR = '/home/server/Pictures/avatar/split_assets';
const TIER_FILE = '/tmp/asset_tiers.json';

export async function GET() {
  try {
    const categories = fs.readdirSync(ASSET_DIR);
    const catalog: Record<string, any> = {};

    for (const cat of categories) {
      const catPath = path.join(ASSET_DIR, cat);
      if (!fs.statSync(catPath).isDirectory()) continue;

      const files = fs.readdirSync(catPath).filter(f => f.endsWith('.glb'));
      const assets = files.map((f: string) => {
        const fullPath = path.join(catPath, f);
        const stat = fs.statSync(fullPath);
        return { name: f, path: `${cat}/${f}`, sizeKB: Math.round(stat.size / 1024) };
      });
      catalog[cat] = { count: assets.length, totalSizeKB: assets.reduce((s: number, a: any) => s + a.sizeKB, 0), assets };
    }

    let tiers: Record<string, string> = {};
    if (fs.existsSync(TIER_FILE)) {
      tiers = JSON.parse(fs.readFileSync(TIER_FILE, 'utf8'));
    }

    return NextResponse.json({ catalog, tiers });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tiers: Record<string, string> = await request.json();
    fs.writeFileSync(TIER_FILE, JSON.stringify(tiers, null, 2));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
