-- Security hardening (2026-08-08): Supabase creates views with
-- SECURITY DEFINER semantics by default — the view reads the underlying
-- tables with the OWNER's privileges, ignoring RLS. swag_codes_stale reads
-- swag_codes (every giveaway code), so a future grant slip to anon or a
-- member role would expose the whole codebook. Only service_role reads it
-- today (and it bypasses RLS anyway), but the foot-gun goes away: with
-- security_invoker, the view enforces the querying role's privileges + RLS
-- on the underlying tables. Functionally identical for service_role.

alter view public.swag_codes_stale set (security_invoker = true);
