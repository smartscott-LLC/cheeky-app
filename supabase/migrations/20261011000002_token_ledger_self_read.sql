-- Owner-review 2026-10-11: HUD Wallet "History" must show the member's own
-- token ledger. token_ledger has had no SELECT policy for its owner since
-- creation (service-role writes + DEFINER RPCs only) — so no member surface
-- could ever read their own money trail. Add the self-read policy; nothing
-- else gains access (append/update/delete remain service-only by absence).

alter table public.token_ledger enable row level security;

create policy "Members read own token ledger"
  on public.token_ledger
  for select
  to authenticated
  using ((auth.uid())::uuid = user_id);
