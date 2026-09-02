-- Add back the interval column to prices table (was removed from schema
-- but the Stripe webhook provides it and the pricing page needs it to
-- distinguish monthly vs yearly billing).

ALTER TABLE prices ADD COLUMN IF NOT EXISTS interval TEXT;

-- Also ensure interval_count is present (it is, but be explicit)
-- ALTER TABLE prices ADD COLUMN IF NOT EXISTS interval_count INT;