-- Index Advisor (2026-08-08): install hypopg + index_advisor so the dashboard's
-- Index Advisor can analyze query patterns and suggest indexes.
-- Both are passive analysis tools: hypopg provides hypothetical indexes for
-- EXPLAIN-only planning, index_advisor is a query-analysis function. Neither
-- adds runtime cost or changes behavior. Installed into the extensions schema
-- (Supabase convention) — this is exactly what the dashboard's enable button
-- runs, so the UI shows the advisor as enabled once applied.

create extension if not exists hypopg with schema extensions;
create extension if not exists index_advisor with schema extensions;
