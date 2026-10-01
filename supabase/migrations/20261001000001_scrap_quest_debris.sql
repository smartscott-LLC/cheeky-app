-- Scrap the abandoned quest/avatar engine (2026-01 attempt). The avatar work
-- lives in the standalone mini_model maker now; the club integrates it fresh
-- with its own manifest-per-user design (user-manifests bucket).
--
-- Drops, in dependency order: the catalog RPC helpers, then the four tables.
-- Storage buckets (quest-assets = 845 GLBs, quest-avatars, ui-assets) were
-- purged via the Storage API on 2026-10-01 — Supabase guards storage.objects/
-- storage.buckets against direct SQL, so that purge can only live outside a
-- migration. Keepers untouched: user-manifests, profiles, cheeky-assets
-- (icons/personas/brand).

-- Catalog helpers built for asset_catalog/quest_catalog/ui_catalog
drop function if exists public.add_asset_to_catalog(
  p_table text, p_category text, p_slug text, p_filename text, p_url text,
  p_mime_type text, p_size_bytes bigint, p_gender text, p_subtype text,
  p_quest_id text, p_tags text[], p_metadata jsonb
);
drop function if exists public.get_assets_by_category(
  p_table text, p_category text, p_gender text, p_quest_id text, p_limit integer
);
drop function if exists public.lookup_asset(
  p_table text, p_slug text, p_category text, p_gender text, p_quest_id text
);

-- avatars: 2 test rows ("Boss", "Test Hero", both user_id null) from the
-- pre-manifest columns era (20260917000001). Policies drop with the table.
drop table if exists public.avatars;

-- ~1,730 .vrm rows from the mid-pivot, every url null — never wired up.
-- Created ad-hoc; no committed migration (hence this drop is self-contained).
drop table if exists public.asset_catalog;
drop table if exists public.quest_catalog;
drop table if exists public.ui_catalog;
