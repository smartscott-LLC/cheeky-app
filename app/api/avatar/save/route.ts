import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { saveManifest, validateManifest } from '@/utils/user-manifest';

/**
 * The single write door for user manifests (PRD-avatar-maker contract).
 * The maker calls this (same-site server-to-server once on its subdomain;
 * same-origin in dev). One validator, one home — nobody writes Storage raw.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const checked = validateManifest(raw, user.id);
  if (!checked.ok) {
    return NextResponse.json({ error: checked.error }, { status: 422 });
  }

  const saved = await saveManifest(user.id, checked.manifest);
  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, updatedAt: checked.manifest.updatedAt });
}
