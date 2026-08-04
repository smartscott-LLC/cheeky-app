import 'server-only';
import { cookies } from 'next/headers';

const FLOOR_SLUGS = ['silver', 'gold', 'platinum', 'diamond'];

/**
 * The floor the member last stood on (a cookie set by middleware on
 * /floor/* visits) — every inside-club "back to the floor" exit uses it so
 * the exit is real, not a trip to the wrong room. Falls back to the lobby.
 */
export async function getReturnFloor(): Promise<string> {
  const store = await cookies();
  const slug = store.get('cc_last_floor')?.value;
  return slug && FLOOR_SLUGS.includes(slug) ? `/floor/${slug}` : '/club';
}
