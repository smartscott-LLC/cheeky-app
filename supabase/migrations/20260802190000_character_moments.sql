-- Character Moments: milestone greetings from the cast.
-- Common milestones (verification, first match) use the fixed cast;
-- personal milestones (membership upgrades, gift accepted) pick the
-- character by the member's interested_in preference — privately, never
-- displayed publicly (same rule as Speed Dating grouping).

create table public.character_moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  character_id uuid references public.characters(id) on delete cascade not null,
  milestone text not null, -- verification | first_match | membership | gift_accepted
  message text not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

alter table public.character_moments enable row level security;
create policy "Read your moments"
  on public.character_moments for select using (user_id = auth.uid());
create policy "Mark your moments seen"
  on public.character_moments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Server-side recorder (service-role / security-definer contexts write).
-- No authenticated grant: only the service role or security-definer RPCs
-- can create moments, so members can't spam greetings at each other.
create or replace function public.record_character_moment(
  p_user uuid,
  p_character_slug text,
  p_milestone text,
  p_message text
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.character_moments (user_id, character_id, milestone, message)
  select p_user, id, p_milestone, p_message
  from public.characters
  where slug = p_character_slug;
end;
$$;
