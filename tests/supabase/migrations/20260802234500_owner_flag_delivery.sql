-- Cast delivery: when the owner approves a flag, they can choose to hand the
-- CODE to the cast instead of applying it directly. The code is minted as an
-- owner code, tied to the member + the character who flagged it, and the
-- agent route delivers it in-character the next time they talk ("the owner
-- came through — here's your code"). Redeemed in the Swag Shop like any code.
alter table public.swag_codes
  add column if not exists deliver_to_user_id uuid references auth.users(id) on delete set null,
  add column if not exists deliver_via_actor text,
  add column if not exists deliver_shown_at timestamptz;
