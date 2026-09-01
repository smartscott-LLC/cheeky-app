import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';

export async function GET(request: NextRequest) {
  // The `/auth/reset_password` route exchanges the recovery code for a
  // session and sends the member to the Update Password form. Handles both
  // link formats Supabase can send: ?code (PKCE) and ?token_hash (recovery
  // token) — the fresh-project default may use either.
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        getErrorRedirect(
          `${requestUrl.origin}/signin/forgot_password`,
          error.name,
          "Sorry, we weren't able to log you in. Please try again."
        )
      );
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'recovery'
    });
    if (error) {
      return NextResponse.redirect(
        getErrorRedirect(
          `${requestUrl.origin}/signin/forgot_password`,
          error.name,
          "Sorry, we weren't able to log you in. Please try again."
        )
      );
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(
    getStatusRedirect(
      `${requestUrl.origin}/signin/update_password`,
      'You are now signed in.',
      'Please enter a new password for your account.'
    )
  );
}
