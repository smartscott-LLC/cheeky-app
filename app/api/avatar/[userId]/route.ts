import { NextResponse, type NextRequest } from 'next/server';
import { readFull } from '@/utils/top';
import { supabaseAdmin } from '@/utils/supabase/admin';

/**
 * THE TOP's public read door for bio-card surfaces: sub-address projections
 * against a member's manifest, privacy-gated at the apex. `?fields=` takes a
 * comma list of card-safe sub-addresses; profile.age/height/location are
 * only ever returned when the member's show* flags allow — the gating lives
 * HERE so no consumer can forget it. Edge-cached: the everyone-clicks-
 * everyone path stays smooth.
 */

const DEFAULT_FIELDS = [
  'profile.displayName',
  'profile.oneLiner',
  'profile.photos',
  'membership.tier',
  'membership.verified',
  'assets.displayBadge',
  'model'
];

const ALLOWED_FIELDS = new Set([
  ...DEFAULT_FIELDS,
  'profile.bio',
  'profile.gender',
  'profile.hobbies',
  'profile.age',
  'profile.height',
  'profile.location',
  'assets.badges',
  'model.snapshotUrl',
  'model.name',
  'meta.persona'
]);

// sub-address → show-flag that gates it (privacy enforced at the apex)
const GATED: Record<string, 'showAge' | 'showHeight' | 'showLocation'> = {
  'profile.age': 'showAge',
  'profile.height': 'showHeight',
  'profile.location': 'showLocation'
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(userId)) {
    return NextResponse.json({ error: 'bad id' }, { status: 400 });
  }

  const requested = new URL(request.url).searchParams
    .get('fields')
    ?.split(',')
    .map((f) => f.trim())
    .filter(Boolean);
  const fields = requested && requested.length > 0 ? requested : DEFAULT_FIELDS;

  const illegal = fields.filter((f) => !ALLOWED_FIELDS.has(f));
  if (illegal.length > 0) {
    return NextResponse.json(
      { error: `fields not card-safe: ${illegal.join(', ')}` },
      { status: 400 }
    );
  }

  const manifest = await readFull(userId);
  if (!manifest) {
    return NextResponse.json({ error: 'no manifest' }, { status: 404 });
  }

  // one internal read of profile for the show-gates (cache-backed)
  const profile = manifest.profile;
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const gate = GATED[f];
    if (gate && !profile?.[gate]) continue; // member chose not to show
    const [section, key] = f.split('.');
    const data = manifest[section as 'profile'] as
      Record<string, unknown> | undefined;
    if (data == null) continue;
    out[f] = key ? data[key] : data;
  }

  // Guest passes expire silently (no webhook), so the mirrored tier can lag.
  // Any membership display surface gets the LIVE vote overlaid — one cheap
  // RPC, edge-cached with the response. The mirror is the view;
  // current_tier() is the truth.
  if ('membership.tier' in out || 'membership' in out) {
    const { data: liveTier } = await supabaseAdmin.rpc('current_tier', {
      p_user: userId
    });
    const norm = liveTier === 'standard' ? 'silver' : (liveTier ?? 'silver');
    if ('membership.tier' in out) out['membership.tier'] = norm;
    const whole = out['membership'];
    if (whole && typeof whole === 'object')
      (whole as Record<string, unknown>).tier = norm;
  }

  return NextResponse.json(
    { userId, updatedAt: manifest.updatedAt, fields: out },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    }
  );
}
