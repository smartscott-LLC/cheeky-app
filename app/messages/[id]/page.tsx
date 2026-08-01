import MessageThread from '@/components/ui/Messages/MessageThread';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { redirect } from 'next/navigation';

export default async function ThreadPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  const { data: conversation } = await supabase
    .from('conversations')
    .select('user_id_a, user_id_b')
    .eq('id', id)
    .maybeSingle();

  if (!conversation) {
    return redirect('/messages');
  }

  const otherId =
    conversation.user_id_a === user.id
      ? conversation.user_id_b
      : conversation.user_id_a;

  const [{ data: otherProfile }, { data: messages }, { data: myBlocks }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, bio, verified_at, photos(storage_path, is_primary)')
        .eq('id', otherId)
        .maybeSingle(),
      supabase
        .from('messages')
        .select('id, sender_id, body, created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })
        .limit(200),
      supabase
        .from('blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', otherId)
    ]);

  const primaryPhoto =
    otherProfile?.photos?.find((p) => p.is_primary)?.storage_path ??
    otherProfile?.photos?.[0]?.storage_path ??
    null;

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <MessageThread
          conversationId={id}
          other={{
            id: otherId,
            display_name: otherProfile?.display_name ?? 'Member',
            verified_at: otherProfile?.verified_at ?? null,
            primaryPhoto
          }}
          initialMessages={(messages ?? []).map((m) => ({
            id: m.id,
            sender_id: m.sender_id,
            body: m.body,
            created_at: m.created_at
          }))}
          blocked={(myBlocks ?? []).length > 0}
          photoBase={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
