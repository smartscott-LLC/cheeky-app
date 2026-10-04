-- Move is_test_member() out of the Data API surface (advisor option 3:
-- "move it to a schema not exposed through the Data API").
--
-- It is called by exactly one RLS policy (profiles / "Profiles are readable
-- by everyone") and by NO application RPC site. Policy expressions are
-- stored as parsed trees bound to the function OID, so ALTER ... SET SCHEMA
-- keeps the policy working untouched — but /rest/v1/rpc/is_test_member
-- disappears, clearing both advisor warnings (0028 anon + 0029 authenticated)
-- without weakening the privacy gate: test members stay invisible to
-- strangers either way, because the POLICY still calls the function.
--
-- The function keeps SECURITY DEFINER + postgres owner + its search_path
-- pin (it must read profiles bypassing RLS without recursing into the very
-- policy that calls it). EXECUTE grants travel with it — anon still needs
-- the call at policy-evaluation time; only the REST exposure goes away.

create schema if not exists guard;
revoke all on schema guard from public;

alter function public.is_test_member() set schema guard;

-- USAGE so the stored policy expression can resolve the name if Postgres
-- ever re-parses it; EXECUTE was already granted and travels with the OID.
grant usage on schema guard to anon, authenticated;
