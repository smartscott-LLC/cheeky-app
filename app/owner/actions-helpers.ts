// Shared owner-authorization helper. Re-used by app/owner/actions.ts and
// any other server action that gates on the owner key (the Den's back
// door or the legacy ADMIN_KEY).

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function authorized(key?: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabaseAdmin
      .from('owner_accounts')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) return true;
  }
  const adminKey = process.env.ADMIN_KEY;
  return Boolean(adminKey && key === adminKey);
}
