-- DateSafe — the automated safety reviewer (takedown-appeals.md is the spec).
-- Every report gets an AI first pass (verdict/category/confidence/summary);
-- a confirmed image violation holds the photo (removed from public view) the
-- moment the report lands. Human confirm columns complete the loop.

alter table public.reports
  add column if not exists image_url text,                    -- the reported photo (if image report)
  add column if not exists verdict text
    check (verdict in ('violation', 'clean', 'inconclusive')),
  add column if not exists category text,                     -- AUP category, e.g. explicit_content
  add column if not exists confidence numeric,                -- 0..1
  add column if not exists review_summary text,
  add column if not exists reviewed_at timestamptz,           -- when DateSafe finished its first pass
  add column if not exists held_at timestamptz,               -- when the reported content was blocked
  add column if not exists human_confirmed_at timestamptz,    -- when a human closed the loop
  add column if not exists human_verdict text
    check (human_verdict in ('upheld', 'dismissed'));

-- The hold: a held photo stops appearing anywhere the club shows photos.
alter table public.photos
  add column if not exists held_at timestamptz;
