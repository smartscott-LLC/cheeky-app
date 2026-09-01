-- Fix (2026-08-08, found by tests/club-chat.live.test.mjs): the profanity
-- normalizer kept spaces, so letter-spaced swearing ("f u c k e d") slipped
-- through — exactly the workaround the founder said people would try. Now
-- every non-alphanumeric char is stripped (the message is squished) before
-- matching, and multi-word terms are listed squished too.

create or replace function public.club_chat_profanity(p_body text)
returns boolean
language sql stable
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from unnest(array[
      'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'whore', 'slut', 'dick',
      'cock', 'pussy', 'faggot', 'nigga', 'nigger', 'kike', 'retard',
      'rape', 'killyourself', 'dieinafire'
    ]) as w(word)
    where regexp_replace(lower(p_body), '[^a-z0-9]', '', 'g') like '%' || w.word || '%'
  );
$$;
