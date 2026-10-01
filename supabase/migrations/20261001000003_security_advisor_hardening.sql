-- Security advisor hardening (supabase_warnings_needing_fixed.txt, 2026-10-01 scan).
--
-- Three categories, one migration:
--
-- (1) lint 0028 anon_security_definer_function_executable — 22 functions were
--     callable WITHOUT signing in. The app never calls these as anon (every
--     call site is behind a session), so EXECUTE is revoked from anon+PUBLIC.
--     Members (authenticated) keep them — they are the app's RPC spine, with
--     auth.uid() checks + RLS inside. NOTE: policy helpers are NOT in this
--     list; is_test_member() is deliberately excluded — a blanket revoke once
--     broke every anon table read (fixed earlier today by restoring its grant).
--
-- (2) rls_auto_enable + on_subscription_activate are ops/trigger internals
--     with zero RPC call sites (trigger invocations need no EXECUTE grant),
--     so they are revoked from authenticated too.
--
-- (3) lint 0011 function_search_path_mutable — pin search_path on the two
--     flagged functions (privilege-escalation vector for DEFINER functions).
--
-- (4) lint 0025 public_bucket_allows_listing — cheeky-assets is a public
--     bucket; public object URLs need no storage.objects SELECT policy, and
--     no app code lists the bucket (grep-verified). The broad policy is gone.
--
-- lint 0029 (58 authenticated DEFINER warnings) is the app's by-design RPC
-- architecture — each function enforces auth.uid()/tier/ownership internally.
-- Reviewed 2026-10-01; intentionally not revoked (revoking would break the
-- club). This comment is the record of that decision.

-- (1) + (2) revoke anon-executable SECURITY DEFINER surface
do $$
declare
  f record;
  member_fns text[] := array[
    'club_chat_heartbeat','club_chat_horn','club_chat_invite',
    'club_chat_respond_invite','club_chat_send','club_chat_whisper_get',
    'club_chat_whisper_send','insert_challenge_leaderboard',
    'matchmaker_board_cards','matchmaker_draft_candidates','matchmaker_flip',
    'matchmaker_incoming','matchmaker_pick_draft','matchmaker_respond_unlock',
    'matchmaker_send_unlock','matchmaker_start_board','matchmaker_start_draft',
    'matchmaker_unpick_draft','taskbar_state','use_icebreaker'
  ];
  admin_only_fns text[] := array['rls_auto_enable','on_subscription_activate'];
begin
  for f in
    select p.oid from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any(member_fns)
  loop
    execute 'revoke execute on function ' || f.oid::regprocedure::text || ' from anon, public';
  end loop;
  for f in
    select p.oid from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any(admin_only_fns)
  loop
    execute 'revoke execute on function ' || f.oid::regprocedure::text || ' from anon, public, authenticated';
  end loop;
end $$;

-- (3) pin search_path on the two flagged functions
alter function public.handle_new_user() set search_path = pg_catalog, public;
alter function public.use_icebreaker() set search_path = pg_catalog, public;

-- (4) drop the broad public-bucket listing policy (public URLs unaffected)
drop policy if exists "Read cheeky-assets" on storage.objects;
