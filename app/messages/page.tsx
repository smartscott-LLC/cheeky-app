import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { redirect } from 'next/navigation';

export default async function MessagesPage() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, user_id_a, user_id_b, created_at')
    .order('created_at', { ascending: false });

  const convs = conversations ?? [];
  const otherIds = convs.map((c) =>
    c.user_id_a === user.id ? c.user_id_b : c.user_id_a
  );

  let profileMap = new Map<string, { display_name: string | null }>();
  let lastByConv = new Map<string, { body: string; created_at: string }>();

  if (convs.length > 0) {
    const [{ data: profiles }, { data: lastMessages }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', otherIds),
      supabase
        .from('messages')
        .select('conversation_id, body, created_at')
        .in(
          'conversation_id',
          convs.map((c) => c.id)
        )
        .order('created_at', { ascending: false })
        .limit(200)
    ]);

    profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    for (const m of lastMessages ?? []) {
      if (!lastByConv.has(m.conversation_id)) {
        lastByConv.set(m.conversation_id, {
          body: m.body,
          created_at: m.created_at
        });
      }
    }
  }

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Messages</h1>
        <p className="mt-2">
          <Link
            href="/browse"
            className="text-sm font-semibold text-zinc-500 hover:text-white"
          >
            ← Back to the floor
          </Link>
        </p>
        {convs.length === 0 ? (
          <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/50 p-10 text-center">
            <h2 className="text-xl font-bold">No conversations yet.</h2>
            <p className="mt-2 text-zinc-400">
              Hit the floor, pick someone you like — when they pick you back,
              the chatting starts here.
            </p>
            <Link
              href="/browse"
              className="mt-6 inline-block rounded-lg bg-club px-6 py-3 font-bold text-white transition hover:bg-club-cotton"
            >
              Browse the floor
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {convs.map((c) => {
              const otherId =
                c.user_id_a === user.id ? c.user_id_b : c.user_id_a;
              const profile = profileMap.get(otherId);
              const last = lastByConv.get(c.id);
              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-600"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-lg font-bold">
                      {profile?.display_name || 'Member'}
                    </p>
                    {last && (
                      <p className="text-xs text-zinc-500">
                        {new Date(last.created_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  {last && (
                    <p className="mt-1 truncate text-sm text-zinc-400">
                      {last.body}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
