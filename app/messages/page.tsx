import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { openConversation } from '@/app/messages/actions';
import { getReturnFloor } from '@/utils/return-floor';
import { redirect } from 'next/navigation';
import MomentsStrip from '@/components/ui/Messages/MomentsStrip';

export default async function MessagesPage() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }
  const floorHref = await getReturnFloor();

  // Incoming waves — a one-tap "noticed you" waiting for a hello.
  const { data: waves } = await supabase
    .from('waves')
    .select('sender_id, created_at')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const waveSenders = (waves ?? []).map((w) => w.sender_id);
  const { data: waveProfiles } =
    waveSenders.length > 0
      ? await supabase
          .from('profiles')
          .select('id, display_name, photos(storage_path, is_primary)')
          .in('id', waveSenders)
          .filter('photos.held_at', 'is', 'null')
      : { data: [] };
  const wavePhoto = (id: string) => {
    const p = (waveProfiles ?? []).find((w) => w.id === id);
    return (
      p?.photos?.find((ph) => ph.is_primary)?.storage_path ??
      p?.photos?.[0]?.storage_path ??
      null
    );
  };
  const photoBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`;

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
  const unreadByConv = new Map<string, number>();

  if (convs.length > 0) {
    const [{ data: profiles }, { data: lastMessages }, { data: unreadRows }] =
      await Promise.all([
        supabase.from('profiles').select('id, display_name').in('id', otherIds),
        supabase
          .from('messages')
          .select('conversation_id, body, created_at')
          .in(
            'conversation_id',
            convs.map((c) => c.id)
          )
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('messages')
          .select('conversation_id')
          .in(
            'conversation_id',
            convs.map((c) => c.id)
          )
          .neq('sender_id', user.id)
          .is('read_at', null)
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
    // Unread counts per conversation (read_at is set when a thread opens).
    for (const m of unreadRows ?? []) {
      unreadByConv.set(
        m.conversation_id,
        (unreadByConv.get(m.conversation_id) ?? 0) + 1
      );
    }
  }

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="font-hero text-gold text-4xl sm:text-5xl">Cheeky Chats</h1>
        <p className="mt-2 font-body text-club">
          <Link
            href={floorHref}
            className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold font-body text-club transition hover:border-zinc-500 hover:text-white"
          >
            ← Back to the floor
          </Link>
        </p>

        <MomentsStrip />

        {(waves ?? []).length > 0 && (
          <div className="mt-8 rounded-xl border border-platinum/30 bg-platinum/5 p-5">
            <p className="text-sm font-bold uppercase tracking-[0.3em] font-body text-club">
              👋 Someone waved
            </p>
            <div className="mt-3 space-y-3">
              {(waves ?? []).map((w) => {
                const profile = (waveProfiles ?? []).find(
                  (p) => p.id === w.sender_id
                );
                const photo = wavePhoto(w.sender_id);
                return (
                  <div
                    key={w.sender_id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 overflow-hidden rounded-full bg-zinc-800">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`${photoBase}${photo}`}
                            alt={profile?.display_name || 'Member'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center font-bold text-cyan">
                            {(profile?.display_name || '?')
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold font-body text-club">
                          {profile?.display_name || 'Member'}
                        </p>
                        <p className="text-sm font-body text-club">waved at you</p>
                      </div>
                    </div>
                    <form action={openConversation.bind(null, w.sender_id)}>
                      <button
                        type="submit"
                        className="rounded-lg bg-platinum px-4 py-2 text-sm font-bold text-platinum-navy transition hover:bg-platinum-alice"
                      >
                        Say hi
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {convs.length === 0 ? (
          <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/50 p-10 text-center">
            <h2 className="font-header text-cyan text-2xl">No conversations yet.</h2>
            <p className="mt-2 font-body text-club">
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
                    <p className="flex items-center gap-2 text-xl font-bold font-body text-club">
                      {profile?.display_name || 'Member'}
                      {(unreadByConv.get(c.id) ?? 0) > 0 && (
                        <span className="rounded-full bg-gold px-2 py-0.5 font-header text-sm leading-none text-black">
                          {unreadByConv.get(c.id)}
                        </span>
                      )}
                    </p>
                    {last && (
                      <p className="text-sm font-body text-club">
                        {new Date(last.created_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  {last && (
                    <p className="mt-1 truncate text-base font-body text-club">
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
