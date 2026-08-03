-- Swag rule tweak (founder 2026-08-02): the cast CAN hand out gold
-- memberships, capped per week (3/week — one-row tweak in swag_rules to
-- change). Platinum + diamond stay owner-only.
update public.swag_rules
set owner_only = false, weekly_limit = 3
where benefit_type = 'membership' and benefit_value = 'gold';
