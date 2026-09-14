'use server';

import { createClient } from '@/utils/supabase/server';

export async function blockUser(targetId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: 'not_signed_in' };
  if (targetId === user.id) return { error: 'cannot_block_self' };

  const { error } = await supabase.from('blocks').insert({
    blocker_id: user.id,
    blocked_id: targetId
  });
  if (error) {
    console.error('blockUser failed:', error.message);
    return { error: error.message };
  }
  return {};
}

export async function unblockUser(
  targetId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: 'not_signed_in' };

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', targetId);
  if (error) {
    console.error('unblockUser failed:', error.message);
    return { error: error.message };
  }
  return {};
}

export async function getMyBlocks(): Promise<
  Array<{
    id: string;
    blocked_id: string;
    display_name: string | null;
    photo: string | null;
  }>
> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: blocks } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', user.id);

  const blockedIds = (blocks ?? []).map((b) => b.blocked_id);
  if (blockedIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, photos(storage_path, is_primary)')
    .in('id', blockedIds);

  return (profiles ?? []).map((p) => {
    const photos = p.photos as unknown as
      Array<{ storage_path: string; is_primary: boolean }> | undefined;
    return {
      id: p.id,
      blocked_id: p.id,
      display_name: p.display_name,
      photo:
        photos?.find((ph) => ph.is_primary)?.storage_path ??
        photos?.[0]?.storage_path ??
        null
    };
  });
}
