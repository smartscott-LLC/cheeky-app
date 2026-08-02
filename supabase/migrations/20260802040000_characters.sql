-- The Characters module (Phase 5): asset-driven NPC personas.
-- Founder supplies the personas + graphics (public/personas/{slug}/); the
-- engine only points at them. Dropping a character in = a row + a folder.
--
-- House rule: character voices follow the Three Principles (see
-- docs/PRD-phase5-wing.md) — even Brutus is rough, never unkind.

-- ============================================================
-- CHARACTERS (the cast — asset contract)
-- ============================================================
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  role text not null, -- bouncer | dj | bartender | hostess | coatcheck
  tagline text,
  portrait_path text,        -- public/personas/{slug}/portrait.*
  fullbody_path text,        -- public/personas/{slug}/full.*
  scene_video_path text,     -- public/personas/{slug}/scene.mp4 (6-10s)
  persona_prompt text,       -- founder's persona system (conversational layer later)
  greeting_lines jsonb not null default '[]', -- scripted ~30s dialogue moments
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.characters enable row level security;
create policy "Characters are public"
  on public.characters for select using (true);

-- ============================================================
-- CHARACTER RELATIONS (per-member friendship meter)
-- Level thresholds + rewards live in the character's config; points
-- accrue from milestones (verified → Brutus, first event → DJ,
-- first gift → Bartender, first date night → Hostess).
-- ============================================================
create table public.character_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  character_id uuid references public.characters(id) on delete cascade not null,
  level int not null default 0,
  points int not null default 0,
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, character_id)
);

alter table public.character_relations enable row level security;
create policy "Read your character relations"
  on public.character_relations for select using (user_id = auth.uid());
create policy "Insert your character relations"
  on public.character_relations for insert with check (user_id = auth.uid());

-- ============================================================
-- SEED: the founding cast (placeholder flavor — founder personas
-- replace taglines/greetings/art via the asset pipeline).
-- ============================================================
insert into public.characters (slug, name, role, tagline, greeting_lines) values
  ('brutus', 'Brutus', 'bouncer', 'The door. The rules. Your ID, please.',
   '["I check the IDs here, and yours came through clean. Welcome to the club, VIP.", "A clean check is the best check. You earned your place on the floor."]'),
  ('dj', 'The DJ', 'dj', 'He spins the room. Your match song is his cue.',
   '["When the lights hit you, that is your moment — make it count.", "I have seen a lot of matches on this floor. Yours had the best song."]'),
  ('bartender', 'The Bartender', 'bartender', 'Every gift comes from behind his bar.',
   '["A gift is a story you are telling. Make it a good one.", "The best pours are the ones you mean."]'),
  ('hostess', 'The Hostess', 'hostess', 'She knows the calendar like her own hand.',
   '["The club is always spinning — there is always a next room for you.", "You two make a good team on the floor. Keep showing up."]'),
  ('coatcheck', 'The Coat Check', 'coatcheck', 'Your inventory lives in her care.',
   '["I will hold onto that for you. Come back for it when the time is right.", "Nothing gets lost in my care — gifts included."]')
on conflict (slug) do nothing;
