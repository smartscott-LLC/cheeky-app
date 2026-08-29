// POST /api/chat/stream-token — issues a Stream user token for the signed-in
// member. The client uses this to connectUser(); the secret never leaves
// the server.

import { NextResponse } from 'next/server';
import { getUser } from '@/utils/supabase/queries';
import { createClient } from '@/utils/supabase/server';
import { issueStreamToken, streamEnabled } from '@/utils/stream/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!streamEnabled()) {
    return NextResponse.json({ enabled: false }, { status: 200 });
  }
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, photos(storage_path, is_primary)')
    .eq('id', user.id)
    .maybeSingle();

  const primary = (profile?.photos ?? []).find((p: { is_primary: boolean }) => p.is_primary);
  const photo = primary?.storage_path as string | undefined;
  const image = photo
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/${photo}`
    : null;

  try {
    const bundle = await issueStreamToken({
      userId: user.id,
      name: (profile?.display_name as string | null) ?? 'Member',
      image: image ?? null
    });
    return NextResponse.json({
      enabled: true,
      apiKey: bundle.apiKey,
      token: bundle.token,
      userId: bundle.userId,
      name: bundle.name
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'token_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
