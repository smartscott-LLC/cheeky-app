// The Tiki Taskbar's data endpoint. One round trip to the taskbar_state RPC
// (usage counts), then the "left" math against the tier caps. Hard-capped
// daily allowances only — token-spend items never appear. The client polls
// this; no realtime in v1.
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
      case 'sparks':
        count = left(caps.people, row.new_people_today);
        break;
      case 'matchmaker':
        count = left(caps.plays, row.matchmaker_plays_left);
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
