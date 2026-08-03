import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';

export async function GET(request: NextRequest) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the `@supabase/ssr` package. It exchanges an auth code for the user's session.
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        getErrorRedirect(
          `${requestUrl.origin}/signin`,
          error.name,
          "Sorry, we weren't able to log you in. Please try again."
        )
      );
    }
  }

  // Where to send them depends on whether they've cleared the door:
  // unverified members go straight to Brutus (the ID check) — one hoop,
  // two minutes, then the lobby. Verified members walk straight in.
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  let verified = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('verified_at')
      .eq('id', user.id)
      .maybeSingle();
    verified = Boolean(profile?.verified_at);
  }

  return NextResponse.redirect(
    getStatusRedirect(
      `${requestUrl.origin}${verified ? '/club' : '/verify'}`,
      'Welcome in.',
      verified
        ? 'The club is open.'
        : 'Now the Door Check — Brutus needs your ID.'
    )
  );
}
