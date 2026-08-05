import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import s from './Navbar.module.css';
import Navlinks from './Navlinks';

export default async function Navbar() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  // The Lions Den shows only to the owner — a discreet 🦁 in the marquee.
  let isOwner = false;
  if (user) {
    const { data } = await supabaseAdmin
      .from('owner_accounts')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    isOwner = Boolean(data);
  }

  return (
    <nav className={s.root}>
      <a href="#skip" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <div className="max-w-6xl px-6 mx-auto">
        <Navlinks user={user} isOwner={isOwner} />
      </div>
    </nav>
  );
}
