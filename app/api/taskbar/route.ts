// The Tiki Taskbar's data endpoint. One round trip to the taskbar_state RPC
// (usage counts), then the "left" math against the tier caps. Hard-capped
// allowances only — token-spend items and hourly events never appear. The
// client polls this; no realtime in v1.
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { capsForTier, rankForTier, tilesForRank } from '@/utils/taskbar';

interface TaskbarStateRow {
  tier: string | null;
  messages_sent_today: number | null;
  new_people_today: number | null;
  checked_in_today: boolean | null;
  matchmaker_plays_left: number | null;
  blind_date_joins_today: number | null;
  gift_ready: boolean | null;
  gift_ready_in_minutes: number | null;
}

const left = (cap: number | null, used: number | null): number | null => {
  if (cap === null) return null; // unlimited — the bar renders ∞
  return Math.max(0, cap - (used ?? 0));
};

export async function GET() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return NextResponse.json({ tier: null, tiles: [] });

  const { data: profile } = await supabase
    .from('profiles')
    .select('verified_at')
    .eq('id', user.id)
    .maybeSingle();

  // Street zone: no events, no tokens, no caps — the bar's one job is the door.
  if (!profile?.verified_at) {
    return NextResponse.json({
      tier: 'guest',
      tiles: [{ key: 'verify', icon: '🪪', label: 'Get your card', href: '/verify', count: null }]
    });
  }

  const { data: state } = await supabase.rpc('taskbar_state');
  const row = (state?.[0] ?? {}) as TaskbarStateRow;
  const tier = row.tier ?? 'silver';
  const caps = capsForTier(tier);

  const tiles = tilesForRank(rankForTier(tier)).map((def) => {
    let count: number | null = null;
    let unlimited = false;
    switch (def.key) {
      case 'chats':
        count = left(caps.messages, row.messages_sent_today);
        unlimited = caps.messages === null;
        break;
      case 'swipes':
        // The sparks hub's shared allowance: new people reachable today.
        count = left(caps.people, row.new_people_today);
        break;
      case 'l3':
        // L³ rides the same new-people allowance (no separate daily limit).
        count = left(caps.people, row.new_people_today);
        break;
      case 'matchmaker':
        // Plays left from the 2/3/4/5 dial — the RPC returns the remainder.
        count = row.matchmaker_plays_left;
        break;
      case 'blind':
        count = left(caps.blindDate, row.blind_date_joins_today);
        break;
      case 'gifts':
        // One send/hour: 1 when ready, minutes-to-ready when cooling.
        count = row.gift_ready ? 1 : (row.gift_ready_in_minutes ?? 0);
        break;
      case 'coat':
        // One a day: 1 to do until it's done, 0 after.
        count = row.checked_in_today ? 0 : 1;
        break;
      default:
        count = null;
    }
    return {
      key: def.key,
      icon: def.icon,
      label: def.label,
      href: def.href,
      count,
      unlimited
    };
  });

  return NextResponse.json({ tier, tiles });
}
