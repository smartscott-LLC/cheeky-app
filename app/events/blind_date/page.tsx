import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import BlindDateHost from '@/components/ui/Events/BlindDateHost';
import BlindDateSuitor from '@/components/ui/Events/BlindDateSuitor';
import BlindDateLobby from '@/components/ui/Events/BlindDateLobby';

interface RoundRow {
  id: string;
  round_index: number;
  phase: string;
  phase_started_at: string;
  question: string | null;
  skipped: boolean;
  tally_user_id: string | null;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function profileMap(
  supabase: Supabase,
  ids: string[]
): Promise<Map<string, { display_name: string | null; photo: string | null }>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, photos(storage_path, is_primary)')
    .in('id', ids)
    .filter('photos.held_at', 'is', 'null');
  const map = new Map<string, { display_name: string | null; photo: string | null }>();
  for (const p of data ?? []) {
    map.set(p.id, {
      display_name: p.display_name,
      photo:
        p.photos?.find((ph) => ph.is_primary)?.storage_path ??
        p.photos?.[0]?.storage_path ??
        null
    });
  }
  return map;
}

function tallyCounts(rounds: RoundRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rounds) {
    if (r.tally_user_id) counts[r.tally_user_id] = (counts[r.tally_user_id] ?? 0) + 1;
  }
  return counts;
}

export default async function BlindDatePage() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  // The Gold room — only members on the Gold floor (or a guest up there) get in.
  const { data: tierData } = await supabase.rpc('current_tier', {
    p_user: user.id
  });
  const tier = (tierData as string) ?? 'standard';
  const rank =
    tier === 'gold' ? 1 : tier === 'platinum' ? 2 : tier === 'diamond' ? 3 : 0;
  if (rank < 1) {
    return (
      <div className="bg-black">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="font-body font-body text-club text-5xl">💘</p>
          <h1 className="font-hero text-gold mt-6 text-4xl">
            Blind Date is behind the rope.
          </h1>
          <p className="font-body font-body text-club mx-auto mt-3 max-w-md">
            Come see what&apos;s on this floor with a Gold card today — the
            room&apos;s worth it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/#membership"
              className="rounded-lg bg-club px-8 py-3 font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-club-cotton"
            >
              See the memberships
            </Link>
            <Link
              href="/events"
              className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold font-body font-body text-club transition hover:border-zinc-500 hover:text-white"
            >
              The Event Center
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Am I hosting? (open or running room)
  const { data: myRooms } = await supabase
    .from('events')
    .select('*')
    .eq('host_id', user.id)
    .eq('kind', 'blind_date')
    .in('status', ['open', 'running'])
    .order('created_at', { ascending: false })
    .limit(1);
  const myRoom = myRooms?.[0] ?? null;

  // Am I a suitor? (seated in an open/running room)
  type EventRow = NonNullable<typeof myRooms>[number];
  let myEvent: EventRow | null = null;
  if (!myRoom) {
    const { data: entries } = await supabase
      .from('event_entries')
      .select('event_id')
      .eq('user_id', user.id)
      .eq('status', 'reserved');
    const ids = (entries ?? []).map((e) => e.event_id);
    if (ids.length > 0) {
      const { data: seated } = await supabase
        .from('events')
        .select('*')
        .in('id', ids)
        .eq('kind', 'blind_date')
        .in('status', ['open', 'running'])
        .limit(1);
      myEvent = seated?.[0] ?? null;
    }
  }

  const photoBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`;
  const active = myRoom ?? myEvent;

  if (active) {
    const { data: rounds } = await supabase
      .from('blind_date_rounds')
      .select('*')
      .eq('event_id', active.id)
      .order('round_index');
    const roundRows = (rounds ?? []) as RoundRow[];
    const current =
      roundRows.filter((r) => r.phase !== 'done').sort((a, b) => b.round_index - a.round_index)[0] ??
      null;

    const { data: entries } = await supabase
      .from('event_entries')
      .select('user_id')
      .eq('event_id', active.id)
      .eq('status', 'reserved');
    const suitorIds = (entries ?? [])
      .map((e) => e.user_id)
      .filter((id) => id !== active.host_id);
    const profiles = await profileMap(supabase, suitorIds);
    const suitors = suitorIds.map((id) => ({
      userId: id,
      displayName: profiles.get(id)?.display_name ?? null,
      photo: profiles.get(id)?.photo ?? null
    }));

    const counts = tallyCounts(roundRows);

    if (myRoom) {
      // The host's room — she sees them blurred; all answers visible to her.
      let answers: { user_id: string; body: string }[] = [];
      if (current) {
        const { data: ans } = await supabase
          .from('blind_date_answers')
          .select('user_id, body')
          .eq('round_id', current.id);
        answers = (ans ?? []) as { user_id: string; body: string }[];
      }
      return (
        <div className="bg-black">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <Link
              href="/events"
              className="text-base font-semibold font-body font-body text-club hover:text-white"
            >
              ← The Event Center
            </Link>
            <h1 className="font-hero text-gold mt-6 text-center text-4xl sm:text-5xl">
              👑 Blind Date — the host&apos;s table
            </h1>
            <p className="font-body font-body text-club mx-auto mt-3 max-w-xl text-center">
              You can&apos;t see them yet — that&apos;s the point. Ask, read, and
              mark the best answer.
            </p>
            <div className="mt-8">
              <BlindDateHost
                eventId={active.id}
                eventStatus={active.status}
                tokenCost={active.token_cost}
                suitors={suitors}
                round={current}
                answers={answers}
                tallyCounts={counts}
                myUserId={user.id}
                photoBase={photoBase}
              />
            </div>
          </div>
        </div>
      );
    }

    if (myEvent) {
      // The suitor's room — she's visible now, your answers are yours alone.
      const hostProfile = await profileMap(
        supabase,
        active.host_id ? [active.host_id] : []
      );
      let myAnswer: string | null = null;
      if (current) {
        const { data: mine } = await supabase
          .from('blind_date_answers')
          .select('body')
          .eq('round_id', current.id)
          .eq('user_id', user.id)
          .maybeSingle();
        myAnswer = mine?.body ?? null;
      }
      return (
        <div className="bg-black">
          <div className="mx-auto max-w-3xl px-6 py-16">
            <Link
              href="/events"
              className="text-base font-semibold font-body font-body text-club hover:text-white"
            >
              ← The Event Center
            </Link>
            <h1 className="font-hero text-gold mt-6 text-center text-4xl sm:text-5xl">
              💘 Blind Date
            </h1>
            <p className="font-body font-body text-club mx-auto mt-3 max-w-xl text-center">
              Four rounds. Answer her questions. Most marks wins the date.
            </p>
            <div className="mt-8">
              <BlindDateSuitor
                eventId={active.id}
                eventStatus={active.status}
                tokenCost={active.token_cost}
                hostName={hostProfile.get(active.host_id ?? '')?.display_name ?? null}
                hostPhoto={hostProfile.get(active.host_id ?? '')?.photo ?? null}
                suitors={suitors}
                round={current}
                myAnswer={myAnswer}
                tallyCounts={counts}
                myUserId={user.id}
                photoBase={photoBase}
              />
            </div>
          </div>
        </div>
      );
    }
  }

  // The lobby — host a room, or take a seat in one that's open.
  const { data: openRooms } = await supabase
    .from('events')
    .select('id')
    .eq('kind', 'blind_date')
    .eq('status', 'open')
    .order('created_at')
    .limit(10);
  const rooms: { id: string; seated: number; maxSeats: number }[] = [];
  for (const room of openRooms ?? []) {
    const { count } = await supabase
      .from('event_entries')
      .select('user_id', { count: 'exact', head: true })
      .eq('event_id', room.id)
      .eq('status', 'reserved');
    rooms.push({ id: room.id, seated: count ?? 0, maxSeats: 5 });
  }

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/events"
          className="text-base font-semibold font-body font-body text-club hover:text-white"
        >
          ← The Event Center
        </Link>
        <h1 className="font-hero text-gold mt-6 text-center text-4xl sm:text-5xl">
          💘 Blind Date
        </h1>
        <p className="font-body font-body text-club mx-auto mt-3 max-w-xl text-center">
          The Gold floor&apos;s room. One hostess, up to five suitors, four
          rounds of questions — personality decides, the marks decide more.
        </p>
        <div className="mt-8">
          <BlindDateLobby rooms={rooms} canHost={rank >= 1} />
        </div>
      </div>
    </div>
  );
}
