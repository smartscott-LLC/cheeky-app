-- club_chat_ban is moderator/owner-only: revoking from anon/public/
-- authenticated was right, but the owner booth and moderation scripts call
-- it through the service role — grant it there.

grant execute on function public.club_chat_ban(uuid, int, text) to service_role;
