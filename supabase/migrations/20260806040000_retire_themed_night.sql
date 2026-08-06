-- Themed Night retires (PRD-event-logic §1): the Gold slot is now Blind
-- Date — host-driven, not on the clock. The grid engine still supports the
-- kind (historic events keep working, the mechanics remain tested), but the
-- scheduler stops minting them.

create or replace function public.ensure_floor_events(p_hours int default 2)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_anchor timestamptz := date_trunc('hour', now());
  i int;
begin
  for i in 0 .. p_hours - 1 loop
    -- :00 — The Dance Floor (Silver)
    insert into public.events (kind, floor, starts_at, status, token_cost, min_fill)
    values ('dance_floor', 'silver', v_anchor + make_interval(hours => i), 'open', 3, 20)
    on conflict (kind, starts_at) do nothing;
    -- :30 — Speed Dating (Platinum)
    insert into public.events (kind, floor, starts_at, status, token_cost, min_fill)
    values ('speed_dating', 'platinum', v_anchor + make_interval(hours => i, mins => 30), 'open', 25, 4)
    on conflict (kind, starts_at) do nothing;
    -- :45 — The Rooftop (Diamond)
    insert into public.events (kind, floor, starts_at, status, token_cost, min_fill)
    values ('rooftop', 'diamond', v_anchor + make_interval(hours => i, mins => 45), 'open', 40, 6)
    on conflict (kind, starts_at) do nothing;
  end loop;
end;
$$;

grant execute on function public.ensure_floor_events(int) to authenticated;

-- Clear any open Themed Night slots the old scheduler left behind (the
-- minute hand would cancel them anyway — this is just the tidy version).
delete from public.events
where kind = 'themed_night'
  and status = 'open';
