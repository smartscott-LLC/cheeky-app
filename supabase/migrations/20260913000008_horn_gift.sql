-- Add a "Horn Blower" gift to the catalog so members can blow the horn
-- directly from the gift shop (not just from the lounge). Available to all tiers.
-- When accepted/used, creates a club_announcements entry and awards the horn badge.

insert into public.gift_catalog (slug, name, emoji, floor, token_cost, kind)
values ('chat_horn', 'Horn Blower', '🎺', 'silver', 5, 'gesture')
on conflict (slug) do update set
  token_cost = excluded.token_cost,
  kind = excluded.kind;
