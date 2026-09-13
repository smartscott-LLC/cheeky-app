-- Replace boolean lives_at_home with a text living_arrangement field
-- so we can offer distinct, non-overlapping options.

alter table public.profiles
  drop column if exists lives_at_home,
  add column if not exists living_arrangement text check (living_arrangement in ('own', 'rent', 'parents', 'roommates', 'other'));
