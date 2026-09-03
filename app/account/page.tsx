import CustomerPortalForm from '@/components/ui/AccountForms/CustomerPortalForm';
import EmailForm from '@/components/ui/AccountForms/EmailForm';
import GuestPassForm from '@/components/ui/AccountForms/GuestPassForm';
import ProfileForm from '@/components/ui/AccountForms/ProfileForm';
import LoungePrefs from '@/components/ui/ClubChat/LoungePrefs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getReturnFloor } from '@/utils/return-floor';
import {
  getSubscription,
  getUser,
  getProfile,
  getTokenBalance
} from '@/utils/supabase/queries';

export default async function Account() {
  const supabase = await createClient();
  const [user, subscription] = await Promise.all([
    getUser(supabase),
    getSubscription(supabase)
  ]);

  if (!user) {
    return redirect('/signin');
  }

  const [
    profile,
    tokenBalance,
    photos,
    tierData,
    grants,
    passes,
    certRows,
    interestRows
  ] = await Promise.all([
    getProfile(supabase, user.id),
    getTokenBalance(supabase),
    supabase
      .from('photos')
      .select('id, storage_path, is_primary, position')
      .eq('user_id', user.id)
      .order('position', { ascending: true }),
    supabase.rpc('current_tier', { p_user: user.id }),
    supabase
      .from('entitlement_grants')
      .select('tier, reason, expires_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('guest_passes')
      .select('tier, expires_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('certificates')
      .select('id, kind, issued_at, matches!inner(id, user_id_a, user_id_b)')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false }),
    supabase
      .from('special_interests')
      .select('id, interest_user_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
  ]);

  const tier = (tierData?.data as string) ?? 'standard';
  const floorHref = await getReturnFloor();
  const tierLabel =
    tier === 'gold'
      ? 'Gold'
      : tier === 'platinum'
        ? 'Platinum'
        : tier === 'diamond'
          ? 'Diamond'
          : 'Silver';
  const cardLabel =
    tier === 'diamond'
      ? '💎 Your Diamond card'
      : tier === 'platinum'
        ? '💳 Your Platinum card'
        : tier === 'gold'
          ? '🥇 Your Gold card'
          : '🪪 Your Silver card';
  // Far-future grants (owner comps, giveaways) read as permanent — no
  // misreading a 2126 date as days.
  const grantExpiry = (iso: string) => {
    const exp = new Date(iso).getTime();
    if (exp - Date.now() > 10 * 365 * 86400000) return 'permanent';
    return `expires ${new Date(iso).toLocaleDateString()}`;
  };
  const photoLimit =
    tier === 'gold' ? 6 : tier === 'platinum' ? 8 : tier === 'diamond' ? 10 : 3;

  // Certificates + special interests: who did you meet at Speed Dating?
  const certPartners = (certRows?.data ?? []).map((c) => {
    const m = c.matches;
    const otherId = m.user_id_a === user.id ? m.user_id_b : m.user_id_a;
    return { certificateId: c.id, issuedAt: c.issued_at, otherId };
  });
  const interestUserIds = (interestRows?.data ?? []).map(
    (i) => i.interest_user_id
  );
  const partnerIds = [
    ...certPartners.map((p) => p.otherId),
    ...interestUserIds
  ].filter((id, i, arr) => arr.indexOf(id) === i);

  const partnerProfiles =
    partnerIds.length > 0
      ? ((
          await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', partnerIds)
        ).data ?? [])
      : [];
  const myConvos =
    partnerIds.length > 0
      ? ((
          await supabase
            .from('conversations')
            .select('id, user_id_a, user_id_b')
            .or(`user_id_a.eq.${user.id},user_id_b.eq.${user.id}`)
        ).data ?? [])
      : [];

  const nameOf = (id: string) =>
    partnerProfiles.find((p) => p.id === id)?.display_name ?? 'Member';
  const convoByOther = new Map<string, string>();
  for (const c of myConvos) {
    const other = c.user_id_a === user.id ? c.user_id_b : c.user_id_a;
    if (!convoByOther.has(other)) convoByOther.set(other, c.id);
  }

  return (
    <section className="mb-32 bg-black">
      <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
        <Link
          href={floorHref}
          className="text-sm font-semibold font-body font-body text-club hover:text-white"
        >
          ← Back to the floor
        </Link>
        <div className="sm:align-center sm:flex sm:flex-col">
          <h1 className="font-hero text-gold text-4xl sm:text-center sm:text-6xl">
            Account
          </h1>
          <p className="font-body font-body text-club max-w-2xl m-auto mt-5 text-xl sm:text-center sm:text-2xl">
            We partnered with Stripe for a simplified billing.
          </p>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-header text-cyan text-xl">{cardLabel}</h2>
              <p className="font-body font-body text-club mt-1">
                {profile?.verified_at
                  ? 'Verified — VIP badge active.'
                  : 'Not verified yet. Brutus is at the door.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-bold font-body font-body text-club">
                {tokenBalance} tokens
              </span>
              {!profile?.verified_at && (
                <Link
                  href="/verify"
                  className="rounded-lg bg-club px-4 py-2 font-semibold text-white transition hover:bg-club-cotton"
                >
                  Get your card
                </Link>
              )}
              {tier === 'standard' && (
                <Link
                  href="/#membership"
                  className="rounded-lg border-2 border-gold px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] font-body font-body text-club transition hover:bg-gold/10"
                >
                  ✦ Boost your chances — obtain a membership today
                </Link>
              )}
            </div>
          </div>
        </div>
        <CustomerPortalForm
          subscription={subscription}
          tier={tier}
          tierLabel={tierLabel}
        />
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="font-header text-cyan text-xl">Your floor</h2>
          <p className="font-body font-body text-club mt-1">
            Current floor:{' '}
            <span className="font-bold font-body font-body text-club">{tierLabel}</span>
            {tier !== 'standard' &&
              (grants?.data?.[0] || passes?.data?.[0]) && (
                <span className="ml-2 text-sm text-cyan">
                  (
                  {grants?.data?.[0]
                    ? `grant — ${grantExpiry(grants.data[0].expires_at)}`
                    : `guest pass — expires ${new Date(
                        passes!.data![0].expires_at
                      ).toLocaleDateString()}`}
                  )
                </span>
              )}
          </p>
          {tier !== 'standard' && (
            <div className="mt-4">
              <GuestPassForm />
            </div>
          )}
        </div>
        <div className="mb-6">
          <ProfileForm
            userId={user.id}
            displayName={profile?.display_name ?? ''}
            bio={profile?.bio ?? ''}
            interestedIn={
              (profile?.interested_in as 'women' | 'men' | 'everyone') ??
              'everyone'
            }
            gender={(profile?.gender as 'gentleman' | 'lady' | null) ?? null}
            oneLiner={profile?.one_liner ?? null}
            photos={(photos?.data ?? []).map((p) => ({
              id: p.id,
              storage_path: p.storage_path,
              is_primary: p.is_primary,
              position: p.position
            }))}
            photoLimit={photoLimit}
            photoBase={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profiles/`}
          />
        </div>
        <div className="mb-6 rounded-xl border border-platinum/30 bg-zinc-900/50 p-6">
          <h2 className="font-header text-cyan text-xl">
            💎 Certificates
          </h2>
          <p className="font-body font-body text-club mt-1">
            Speed Dating matches that made it count.
          </p>
          {certPartners.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {certPartners.map((p) => (
                <li
                  key={p.certificateId}
                  className="font-body font-body text-club flex flex-wrap items-center justify-between gap-3 rounded-lg border border-platinum/20 bg-platinum/5 px-4 py-3"
                >
                  <div>
                    <p className="font-body font-body text-club text-sm font-bold">
                      Speed Dating certificate
                    </p>
                    <p className="font-body font-body text-club text-sm">
                      Matched with {nameOf(p.otherId)} ·{' '}
                      {new Date(p.issuedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {convoByOther.has(p.otherId) && (
                    <Link
                      href={`/messages/${convoByOther.get(p.otherId)}`}
                      className="rounded-lg border border-platinum/40 px-3 py-1.5 text-xs font-semibold font-body font-body text-club transition hover:bg-platinum hover:text-platinum-navy"
                    >
                      Open chat
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-body font-body text-club mt-3 text-sm">
              No certificates yet. Meet someone at Speed Dating on the Platinum
              floor and this shelf lights up.
            </p>
          )}
          <h3 className="font-header text-cyan mt-6 text-xs uppercase tracking-wide">
            Special interests
          </h3>
          {interestRows?.data && interestRows.data.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {interestRows.data.map((i) => (
                <li
                  key={i.id}
                  className="font-body font-body text-club rounded-full border border-platinum/30 bg-platinum/10 px-3 py-1 text-xs font-semibold"
                >
                  ⭐ {nameOf(i.interest_user_id)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-body font-body text-club mt-2 text-sm">
              Nobody yet. Certificate matches can be added from the chat.
            </p>
          )}
        </div>
        <EmailForm userEmail={user.email} />
        <div className="mt-8">
          <LoungePrefs />
        </div>
      </div>
    </section>
  );
}
