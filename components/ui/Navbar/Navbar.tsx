import { createClient } from '@/utils/supabase/server';
import { getProfile } from '@/utils/supabase/queries';
import s from './Navbar.module.css';
import Navlinks from './Navlinks';

export default async function Navbar() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  // Floor-intuitive nav: know the member's tier + verification so the links
  // only show rooms they can actually reach.
  const [profile, tierData] = await Promise.all([
    user ? getProfile(supabase, user.id) : Promise.resolve(null),
    user
      ? supabase.rpc('current_tier', { p_user: user.id })
      : Promise.resolve({ data: 'standard' })
  ]);
  const tier = (tierData?.data as string) ?? 'standard';
  const verified = Boolean(profile?.verified_at);

  return (
    <nav className={s.root}>
      <a href="#skip" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <div className="max-w-6xl px-6 mx-auto">
        <Navlinks user={user} tier={tier} verified={verified} />
      </div>
    </nav>
  );
}
