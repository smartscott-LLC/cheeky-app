import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import { getReturnFloor } from '@/utils/return-floor';
import { redirect } from 'next/navigation';
import RedeemCode from '@/components/ui/Swag/RedeemCode';

const GIFT_LABEL: Record<string, string> = {
  teddy: '🧸 Stuffed Bear',
  golden_roses: '🌹 Golden Bouquet',
  jewelry: '💎 Jewelry',
  champagne: '🍾 Champagne',
  gift_basket: '🧺 The Gift Basket'
};

function describe(type: string, value: string): string {
  if (type === 'gift') return GIFT_LABEL[value] ?? value;
  if (type === 'membership') return `${value} membership`;
  return `${value} tokens`;
}

export default async function SwagPage() {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }
  const floorHref = await getReturnFloor();

  // Your swag history (RLS: your own rows only).
  const { data: grants } = await supabase
    .from('benefit_grants')
    .select('id, benefit_type, benefit_value, reason, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="bg-black">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          🎟️ The Swag Shop
        </h1>
        <p className="mt-2 text-sm text-cyan">
          Free stuff, on the house. Got a code from the cast — or from the club
          — drop it in and it&apos;s yours. No payment, no catch.
        </p>

        <RedeemCode />

        <div className="mt-8">
          <h2 className="text-lg font-bold">Your swag</h2>
          <div className="mt-3 space-y-2">
            {(grants ?? []).length === 0 && (
              <p className="text-sm text-cyan">
                Nothing yet. Codes come from the cast and the club — keep an eye
                out.
              </p>
            )}
            {(grants ?? []).map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-bold text-club">
                    {describe(g.benefit_type, g.benefit_value)}
                  </p>
                  <p className="text-xs text-cyan">{g.reason}</p>
                </div>
                <p className="text-xs text-cyan">
                  {new Date(g.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8">
          <Link
            href={floorHref}
            className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-cyan transition hover:border-zinc-500 hover:text-white"
          >
            ← Back to the floor
          </Link>
        </p>
      </div>
    </div>
  );
}
