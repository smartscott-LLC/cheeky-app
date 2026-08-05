'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { joinEvent, leaveEvent, pickOnFloor } from '@/app/events/actions';
import MatchedOverlay from '@/components/ui/Events/MatchedOverlay';
import posthog from 'posthog-js';

interface Participant {
  userId: string;
  status: string;
  profile: {
    display_name: string | null;
    verified_at: string | null;
    photo: string | null;
  } | null;
}

interface EventFloorProps {
  event: {
    id: string;
    status: string;
    startsAt: string;
    tokenCost: number;
    minFill: number;
  };
  kind: string;
  roomName: string;
  participants: Participant[];
  myEntry: { status: string } | null;
  myPicks: number;
  myUserId: string;
  spotlightIds: string[];
  photoBase: string;
}

const PICK_BUDGET = 10;
const ROUND_SECONDS = 120;

// Per-floor skin — the grid engine is shared, the room palette follows
// the floor (Dance Floor = club pink, Themed Night = gold, Rooftop = diamond).
const ACCENTS: Record<
  string,
  {
    kicker: string;
    cta: string;
    lockedBorder: string;
    lockedText: string;
    verified: string;
  }
> = {
  dance_floor: {
    kicker: 'text-club',
    cta: 'bg-club hover:bg-club-cotton',
    lockedBorder: 'border-club/60',
    lockedText: 'text-club/70',
    verified: 'text-club'
  },
  themed_night: {
    kicker: 'text-gold',
    cta: 'bg-gold hover:bg-gold-royal',
    lockedBorder: 'border-gold/60',
    lockedText: 'text-gold/70',
    verified: 'text-gold'
  },
  rooftop: {
    kicker: 'text-diamond',
    cta: 'bg-diamond hover:bg-diamond-raspberry',
    lockedBorder: 'border-diamond/60',
    lockedText: 'text-diamond/70',
    verified: 'text-diamond'
  }
};

function describePickError(code: string): string {
  switch (code) {
    case 'pick_budget_exceeded':
      return 'You used all 10 picks. Now you wait — same as everyone.';
    case 'pickee_unavailable':
      return "They're already dancing with someone.";
    case 'round_not_active':
      return "The round's already moving.";
    case 'blocked':
      return 'This person blocked you or you blocked them.';
    default:
      return 'Could not pick. Try again.';
  }
}

export default function EventFloor({
  event,
  kind,
  roomName,
  participants: initialParticipants,
  myEntry: initialEntry,
  myPicks: initialPicks,
  myUserId,
  spotlightIds: initialSpotlightIds,
  photoBase
}: EventFloorProps) {
  const accent = ACCENTS[kind] ?? ACCENTS.dance_floor;
  const supabase = createClient();
  const router = useRouter();
  const [participants, setParticipants] = useState(initialParticipants);
  const [myEntry, setMyEntry] = useState(initialEntry);
  const [myPicks, setMyPicks] = useState(initialPicks);
  const [eventStatus, setEventStatus] = useState(event.status);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState<{ convId: string | null } | null>(null);
  const [spotlightIds, setSpotlightIds] = useState(initialSpotlightIds);

  const refresh = async () => {
    const [
      { data: ev },
      { data: entries },
      { data: picks },
      { data: spotlights }
    ] = await Promise.all([
      supabase.from('events').select('status').eq('id', event.id).maybeSingle(),
      supabase
        .from('event_entries')
        .select('user_id, status')
        .eq('event_id', event.id),
      supabase
        .from('event_picks')
        .select('id')
        .eq('event_id', event.id)
        .eq('picker_id', myUserId),
      supabase
        .from('center_stage')
        .select('user_id')
        .gt('center_stage_until', new Date().toISOString())
    ]);

    if (ev?.status) setEventStatus(ev.status);
    if (spotlights) setSpotlightIds(spotlights.map((s) => s.user_id));

    const ids = (entries ?? []).map((e) => e.user_id);
    const { data: profiles } =
      ids.length > 0
        ? await supabase
            .from('profiles')
            .select(
              'id, display_name, verified_at, photos(storage_path, is_primary)'
            )
            .in('id', ids)
        : { data: [] };

    const profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        {
          display_name: p.display_name,
          verified_at: p.verified_at,
          photo:
            p.photos?.find((ph) => ph.is_primary)?.storage_path ??
            p.photos?.[0]?.storage_path ??
            null
        }
      ])
    );

    setParticipants(
      (entries ?? []).map((e) => ({
        userId: e.user_id,
        status: e.status,
        profile: profileMap.get(e.user_id) ?? null
      }))
    );
    setMyEntry((entries ?? []).find((e) => e.user_id === myUserId) ?? null);
    setMyPicks((picks ?? []).length);
  };

  useEffect(() => {
    const stateTimer = setInterval(refresh, 2500);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(stateTimer);
      clearInterval(clock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const startsAt = new Date(event.startsAt).getTime();
  const roundEndsAt = startsAt + ROUND_SECONDS * 1000;
  const secondsToRound = Math.max(0, Math.floor((startsAt - now) / 1000));
  const secondsLeftInRound = Math.max(
    0,
    Math.floor((roundEndsAt - now) / 1000)
  );
  const mm = Math.floor(secondsToRound / 60);
  const ss = String(secondsToRound % 60).padStart(2, '0');

  const joined = Boolean(
    myEntry && myEntry.status !== 'released' && myEntry.status !== 'canceled'
  );
  const dancing = myEntry?.status === 'locked';

  const handleJoin = async () => {
    setBusy(true);
    setError(null);
    const res = await joinEvent(event.id);
    setBusy(false);
    if (res.error) {
      setError(
        res.error === 'insufficient_tokens'
          ? 'Not enough tokens for the door. Top up or earn some, then come back.'
          : res.error === 'tier_required'
            ? 'That room is on a higher floor — climb the ladder first.'
            : 'Could not join. Try again.'
      );
      return;
    }
    posthog.capture('event_joined', {
      event_kind: kind,
      token_cost: event.tokenCost
    });
    await refresh();
  };

  const handleLeave = async () => {
    const res = await leaveEvent(event.id);
    if (!res.error) posthog.capture('event_left', { event_kind: kind });
    await refresh();
  };

  const handlePick = async (userId: string) => {
    setBusy(true);
    setError(null);
    const res = await pickOnFloor(event.id, userId);
    setBusy(false);
    if (res.error) {
      setError(describePickError(res.error));
      await refresh();
      return;
    }
    posthog.capture('event_pick_made', {
      event_kind: kind,
      resulted_in_match: res.matched
    });
    if (res.matched) {
      // Find the song-chat conversation, then hit the MATCHED moment.
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(user_id_a.eq.${myUserId},user_id_b.eq.${userId}),and(user_id_a.eq.${userId},user_id_b.eq.${myUserId})`
        )
        .maybeSingle();
      setMatch({ convId: conv?.id ?? null });
      return;
    }
    await refresh();
  };

  // ---- Status banner ----
  const statusBanner = (() => {
    if (eventStatus === 'canceled')
      return {
        title: 'Canceled',
        body: 'Not enough heads. Your tokens are back.'
      };
    if (dancing)
      return {
        title: "You're dancing!",
        body: 'Head to the song. Make it count.'
      };
    if (joined && eventStatus === 'running')
      return {
        title: 'Picking time',
        body: `${PICK_BUDGET - myPicks} picks left. First mutual pick locks it in.`
      };
    if (joined)
      return {
        title: "You're on the floor",
        body: `Hold placed. Doors open in ${mm}:${ss}.`
      };
    if (eventStatus === 'open')
      return {
        title: 'Doors open',
        body: `Entry is ${event.tokenCost} tokens (reserved — back if no match). Starts in ${mm}:${ss}.`
      };
    return { title: `${roomName} is moving`, body: 'Check back next hour.' };
  })();

  const pickable = eventStatus === 'running' && joined && !dancing;

  return (
    <div className="mx-auto max-w-4xl">
      {match && (
        <MatchedOverlay
          onDone={() =>
            router.push(
              match.convId ? `/messages/${match.convId}` : '/messages'
            )
          }
        />
      )}

      {/* Banner */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
        <p
          className={`text-sm font-bold uppercase tracking-[0.3em] ${accent.kicker}`}
        >
          {eventStatus === 'running'
            ? `Round closes in ${Math.floor(secondsLeftInRound / 60)}:${String(
                secondsLeftInRound % 60
              ).padStart(2, '0')}`
            : eventStatus === 'open'
              ? `Doors open in ${mm}:${ss}`
              : eventStatus === 'canceled'
                ? 'Canceled'
                : 'The floor is moving'}
        </p>
        <h2 className="mt-2 text-2xl font-extrabold">{statusBanner.title}</h2>
        <p className="mt-1 text-zinc-400">{statusBanner.body}</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {!joined && eventStatus === 'open' && (
            <button
              onClick={handleJoin}
              disabled={busy}
              className={`rounded-lg px-6 py-2.5 font-bold text-white transition ${accent.cta}`}
            >
              {busy ? 'Checking…' : `Join for ${event.tokenCost} tokens`}
            </button>
          )}
          {joined && eventStatus === 'open' && (
            <button
              onClick={handleLeave}
              className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-500"
            >
              Leave (hold released)
            </button>
          )}
          {dancing && (
            <span
              className={`rounded-lg px-5 py-2.5 font-bold text-white ${accent.cta}`}
            >
              💃 One song. Make it count.
            </span>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-club">{error}</p>}
        {joined && eventStatus !== 'running' && eventStatus !== 'closed' && (
          <p className="mt-3 text-xs text-zinc-500">
            {participants.length} on the floor now. Needs {event.minFill} to
            run.
          </p>
        )}
      </div>

      {/* Grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {[...participants]
          .sort((a, b) => {
            const sa = spotlightIds.includes(a.userId) ? 0 : 1;
            const sb = spotlightIds.includes(b.userId) ? 0 : 1;
            return sa - sb;
          })
          .map((p) => {
            const locked = p.status === 'locked';
            const spotlight = spotlightIds.includes(p.userId);
            const canPick =
              pickable &&
              p.userId !== myUserId &&
              !locked &&
              p.status === 'reserved';
            return (
              <div
                key={p.userId}
                className={`overflow-hidden rounded-xl border bg-zinc-900/50 ${
                  locked
                    ? accent.lockedBorder
                    : spotlight
                      ? 'border-gold/70 shadow-[0_0_24px_rgba(210,148,54,0.35)]'
                      : 'border-zinc-800'
                }`}
              >
                <div className="flex aspect-square items-center justify-center bg-zinc-800">
                  {p.profile?.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${photoBase}${p.profile.photo}`}
                      alt={p.profile.display_name || 'Member'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-extrabold text-zinc-600">
                      {(p.profile?.display_name || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                  {locked && (
                    <span
                      className={`absolute m-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white ${accent.cta}`}
                    >
                      Dancing
                    </span>
                  )}
                  {spotlight && !locked && (
                    <span className="absolute m-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase text-black">
                      🌟 Center Stage
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold">
                    {p.profile?.display_name || 'Member'}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    {p.profile?.verified_at && (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide ${accent.verified}`}
                      >
                        ✓
                      </span>
                    )}
                    {canPick ? (
                      <button
                        onClick={() => handlePick(p.userId)}
                        disabled={busy}
                        className={`ml-auto rounded-md px-3 py-1 text-xs font-bold text-white transition ${accent.cta}`}
                      >
                        Pick
                      </button>
                    ) : locked ? (
                      <span className={`ml-auto text-xs ${accent.lockedText}`}>
                        💃
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {participants.length === 0 && (
        <p className="mt-10 text-center text-zinc-500">
          No one on the floor yet. Be the first through the door.
        </p>
      )}
    </div>
  );
}
