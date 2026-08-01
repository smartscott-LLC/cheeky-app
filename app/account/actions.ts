'use server';

import { createClient } from '@/utils/supabase/server';

export async function updateProfile(
  displayName: string,
  bio: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'not signed in' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName.trim().slice(0, 50),
      bio: bio.trim().slice(0, 500)
    })
    .eq('id', user.id);

  if (error) {
    console.error('updateProfile failed:', error.message);
    return { error: error.message };
  }
  return {};
}
