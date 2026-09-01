-- Drop the duplicate realtime publication that was created manually/accidentally.
-- The standard supabase_realtime publication already has both club_chat tables.
-- Keeping both causes duplicate broadcasts.
drop publication if exists supabase_realtime_messages_publication;
