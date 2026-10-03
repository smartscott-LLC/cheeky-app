import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { saveAvatar } from '@/utils/top';

/**
 * The maker's single write door (PRD-avatar-maker / PRD-user-manifest).
 * Session-gated; accepts the v0 avatar contract, which THE TOP folds into
 * v1's model (+ assets.displayBadge) sections and re-indexes in the
 * directory. Clients never touch Storage; nobody writes manifests raw.
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

  const saved = await saveAvatar(user.id, raw);
  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: 422 });
  }
  return NextResponse.json({ ok: true });
}
