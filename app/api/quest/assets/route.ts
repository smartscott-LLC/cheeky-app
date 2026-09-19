import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Catalog baked into public/ at build time (assets are local-only, not deployable)
const CATALOG_PATH = path.join(process.cwd(), 'public', 'asset-catalog.json');
const TIER_FILE = '/tmp/asset_tiers.json';

export async function GET() {
  try {
    let catalog: Record<string, any> = {};
    if (fs.existsSync(CATALOG_PATH)) {
      catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
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
