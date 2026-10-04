-- The 2026-10-03 Supabase engine upgrade re-applied default function
-- privileges, silently re-granting anon EXECUTE on taskbar_state() — undoing
-- part of 20261001000003's hardening. Re-revoke. (is_test_member stays:
-- RLS policy evaluation on profiles requires it for anon.)
--
-- Standing rule after any Supabase upgrade: re-check
--   select proname from pg_proc ... where prosecdef
--     and has_function_privilege('anon', oid, 'execute')
-- and expect exactly one row: is_test_member.

do $$
declare
  f record;
begin
  for f in
    select p.oid from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'taskbar_state'
  loop
    execute 'revoke execute on function ' || f.oid::regprocedure::text || ' from anon, public';
  end loop;
end $$;
