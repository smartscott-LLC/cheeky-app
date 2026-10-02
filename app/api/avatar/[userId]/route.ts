import { NextResponse, type NextRequest } from 'next/server';
import { readManifest } from '@/utils/user-manifest';

/**
 * The public read door for bio-card surfaces: returns only the card-safe
 * subset of a member's manifest (model, snapshot, stage, display badge).
 * Cached at the edge — the "everyone clicks everyone" path stays smooth.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(userId)) {
    return NextResponse.json({ error: 'bad id' }, { status: 400 });
  }

  const manifest = await readManifest(userId);
  if (!manifest) {
    return NextResponse.json({ error: 'no manifest' }, { status: 404 });
  }

  return NextResponse.json(
    {
      name: manifest.name,
      model: manifest.model,
      stage: manifest.stage,
      snapshotUrl: manifest.card.snapshotUrl ?? null,
      displayBadge: manifest.card.displayBadge ?? null
    },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}
