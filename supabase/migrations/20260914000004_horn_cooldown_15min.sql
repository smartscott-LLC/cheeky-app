-- FIX: Horn cooldown — change from 1/hour to 1/15min.
-- Also fixes both lounge (10 tokens) and gift-shop (5 tokens) horn paths.

-- 1. Update the rate-limit check in streamHorn (handled in app/chat/stream-actions.ts)
--    — key stays 'horn:user:{user_id}', just change the window from 3600 to 900.

-- 2. Update the gift-shop horn cooldown in gifts/actions.ts blowHorn()
--    — key stays 'horn:shop:{user_id}', just change the window from 3600 to 900.

-- Note: These are app-code changes, not SQL. This migration documents the intent.
-- The actual cooldown change is in the TypeScript action files above.
