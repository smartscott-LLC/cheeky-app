// Stream Chat — server-side client + user-token issuance.
//
// The server SDK uses STREAM_API_KEY + STREAM_API_SECRET. The secret never
// touches the browser; the client only ever sees a short-lived signed
// token created here.
//
// The /api/chat/stream-token route calls into this module. The token is
// generated with the user's verified id, name, and primary photo URL so
// the Stream user object is a faithful mirror of the Supabase profile.

import { StreamChat } from 'stream-chat';

let cached: StreamChat | null = null;

/** Returns the singleton server client. Throws if the secret is missing. */
export function getStreamServer(): StreamChat {
  if (cached) return cached;
  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error('stream_not_configured');
  }
  cached = StreamChat.getInstance(apiKey, apiSecret);
  return cached;
}

/** Is the Stream integration live on this deployment? */
export function streamEnabled(): boolean {
  return Boolean(
    process.env.STREAM_API_KEY &&
      process.env.STREAM_API_SECRET &&
      process.env.NEXT_PUBLIC_STREAM_API_KEY
  );
}

/** Signs a token for a Supabase member. User data is upserted into Stream
 *  so the Stream profile stays in sync. */
export async function issueStreamToken(input: {
  userId: string;
  name: string;
  image?: string | null;
}): Promise<{ token: string; apiKey: string; userId: string; name: string }> {
  const client = getStreamServer();
  const apiKey = process.env.STREAM_API_KEY as string;
  // Mirror the Supabase profile into Stream so member lookups and
  // @mentions work consistently.
  await client.upsertUsers([
    {
      id: input.userId,
      name: input.name,
      ...(input.image ? { image: input.image } : {})
    }
  ]);
  const token = client.createToken(input.userId);
  return {
    token,
    apiKey,
    userId: input.userId,
    name: input.name
  };
}

/** Sends a message on behalf of a user (server-side moderation gate).
 *  Uses a per-call user token so Stream attributes the message to the
 *  right member. The channel is created idempotently and queried
 *  before the send so membership is established. */
export async function streamSendAsUser(input: {
  userId: string;
  userName: string;
  room: string;
  text: string;
  floor: string;
  horn?: boolean;
}): Promise<{ id?: string; error?: string }> {
  if (!streamEnabled()) return { error: 'stream_disabled' };
  if (!['global', 'silver', 'gold', 'platinum', 'diamond'].includes(input.room)) {
    return { error: 'invalid_room' };
  }
  const trimmed = input.text.trim();
  if (trimmed.length < 1 || trimmed.length > 2000) {
    return { error: 'invalid_message_length' };
  }
  const client = getStreamServer();
  // Make sure the user exists in Stream before the channel lookup.
  await client.upsertUsers([{ id: input.userId, name: input.userName }]);
  // Sign a per-call user token. This is the official server-to-user
  // send pattern: use the user's token (not the API secret) so Stream
  // attributes the message correctly.
  const userToken = client.createToken(input.userId);
  const userClient = StreamChat.getInstance(
    process.env.STREAM_API_KEY as string,
    userToken
  );
  const channelId = `cheeky-${input.room}`;
  const ch = userClient.channel('messaging', channelId, {
    created_by_id: 'system'
  } as Record<string, unknown>);
  try {
    await ch.watch();
  } catch {
    // Channel may not exist — create it.
    try {
      await ch.create();
    } catch {
      // already exists, fine
    }
  }
  const sent = await ch.sendMessage({
    text: trimmed,
    user_id: input.userId,
    custom: { floor: input.floor, horn: Boolean(input.horn) }
  } as unknown as Parameters<typeof ch.sendMessage>[0]);
  return { id: (sent.message as { id?: string } | undefined)?.id };
}

export const STREAM_ROOMS = [
  { key: 'global', label: 'The Lounge', emoji: '🌐', rank: -1 },
  { key: 'silver', label: 'Silver', emoji: '🥈', rank: 0 },
  { key: 'gold', label: 'Gold', emoji: '🥇', rank: 1 },
  { key: 'platinum', label: 'Platinum', emoji: '💎', rank: 2 },
  { key: 'diamond', label: 'Diamond', emoji: '🔷', rank: 3 }
] as const;

export type StreamRoomKey = (typeof STREAM_ROOMS)[number]['key'];

/** Ensure the five town-square channels exist. Idempotent — Stream returns
 *  the existing channel if it already exists. Called on the first request
 *  after deploy; safe to run concurrently. */
export async function ensureTownSquareChannels(): Promise<void> {
  const client = getStreamServer();
  await Promise.all(
    STREAM_ROOMS.map(async (r) => {
      const ch = client.channel('messaging', `cheeky-${r.key}`, {
        name: r.label,
        // Floor ladder — every channel is visible; the typing gate is
        // enforced in our sendMessage customData + the user.role grants.
        // (Stream's role grants are server-side per channel; we keep the
        // ladder simple: the type flow uses the user_tier customData.)
        created_by_id: 'system'
      } as Record<string, unknown>);
      await ch.create().catch((err: { code?: number }) => {
        // Already exists — Stream returns a 4xx, swallow.
        if (err?.code && [400, 409].includes(err.code)) return;
        throw err;
      });
    })
  );
}

/** Open (or reuse) a 1:1 whisper channel between two members. */
export async function ensureWhisperChannel(
  userA: string,
  userB: string
): Promise<string> {
  const client = getStreamServer();
  const sorted = [userA, userB].sort();
  const id = `cheeky-whisper-${sorted[0]}-${sorted[1]}`;
  const ch = client.channel('messaging', id, {
    members: sorted,
    is_whisper: true,
    created_by_id: 'system'
  } as Record<string, unknown>);
  await ch.create().catch((err: { code?: number }) => {
    if (err?.code && [400, 409].includes(err.code)) return;
    throw err;
  });
  return id;
}
