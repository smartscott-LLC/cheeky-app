-- Stream Chat — moderation mirror (2026-08-29). The town square now
-- runs on Stream for the live transport; Supabase stays as the moderation
-- log + the fallback path. The webhook receiver in
-- /api/chat/stream-webhook inserts new messages into this table so the
-- Lion Den monitor + the 30-day purge keep working without a second
-- client. RLS stays as before (verified reads, block-aware); the
-- mirror writes use the service role.

alter table public.club_chat_messages
  add column if not exists stream_message_id text;

create unique index if not exists club_chat_messages_stream_msg_idx
  on public.club_chat_messages (stream_message_id)
  where stream_message_id is not null;
