-- Fix (2026-08-08, found by tests/matchmaker.live.test.mjs): the
-- matchmaker_cards unique (board_id, target_id) constraint was wrong — a
-- pair is ONE person with TWO cards, so both cards share target_id and the
-- second insert violated the constraint. One-person-per-board is guaranteed
-- by construction (the board builder picks 8 distinct targets); position
-- uniqueness is covered by unique (board_id, card_position).

alter table public.matchmaker_cards
  drop constraint if exists matchmaker_cards_board_id_target_id_key;
