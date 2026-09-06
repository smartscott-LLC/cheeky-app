// POST /api/chat/stream-webhook — Stream's webhook receiver.
//
// Verifies the X-Signature HMAC-SHA256 against the raw body, then
// dispatches on event.type. We mirror interesting events into Supabase
// (the existing club_chat_messages / club_announcements tables) so the
// moderation surfaces and the Lion Den monitor keep working without a
// second client. The 24h visible window / 30-day purge still apply —
// Stream is the live transport; Supabase is the moderation log.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { getStreamServer, streamEnabled } from '@/utils/stream/server';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

export const dynamic = 'force-dynamic';

const GZIP_MAGIC = Buffer.from([0x1f, 0x8b]);

function gunzip(body: Buffer): Buffer {
  if (body.length >= 2 && body.subarray(0, 2).equals(GZIP_MAGIC)) {
    return zlib.gunzipSync(body);
  }
  return body;
}

function verifySignature(
  body: Buffer,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!streamEnabled()) {
    return NextResponse.json({ error: 'stream_disabled' }, { status: 503 });
  }
  const secret = process.env.STREAM_API_SECRET as string;

  const raw = Buffer.from(await req.arrayBuffer());
  const body = gunzip(raw);
  const sig =
    req.headers.get('x-signature') ??
    (req.headers.get('X-Signature') as string | null);
  if (!verifySignature(body, sig, secret)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let event: { type?: string; [k: string]: unknown };
  try {
    event = JSON.parse(body.toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  // Surfaces in Vercel logs.
  console.log('[stream-webhook]', event.type, { webhookId: req.headers.get('x-webhook-id') });

  try {
    switch (event.type) {
      case 'message.new': {
        await mirrorMessageNew(event as unknown as StreamMessageNew);
        break;
      }
      case 'message.deleted':
      case 'message.updated': {
        await mirrorMessageUpdate(
          event as unknown as { message?: { id?: string; deleted_at?: string } }
        );
        break;
      }
      case 'user.banned':
      case 'channel.created':
      case 'channel.deleted':
        // These don't need a mirror — Stream owns the source of truth
        // and the Lion Den reads from Stream via the server SDK.
        break;
      default:
        // Unknown event types: log + 200 so Stream doesn't retry forever.
        break;
    }
  } catch (err) {
    console.error('[stream-webhook] handler error', err);
    return NextResponse.json({ error: 'handler_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

interface StreamMessageNew {
  message?: {
    id?: string;
    text?: string;
    user?: { id?: string; name?: string };
    cid?: string;
    channel_id?: string;
    channel_type?: string;
    custom?: {
      floor?: string;
      horn?: boolean;
    };
    created_at?: string;
  };
  cid?: string;
  channel_id?: string;
  channel_type?: string;
}

function parseCid(event: StreamMessageNew): {
  room: 'global' | 'silver' | 'gold' | 'platinum' | 'diamond' | null;
  channelId: string;
} {
  const cid = event.cid ?? event.message?.cid ?? '';
  const m = cid.match(/^messaging:(cheeky-(global|silver|gold|platinum|diamond))$/);
  if (m) {
    return { room: m[2] as 'global' | 'silver' | 'gold' | 'platinum' | 'diamond', channelId: m[1] };
  }
  return { room: null, channelId: event.channel_id ?? '' };
}

async function mirrorMessageNew(event: StreamMessageNew) {
  const msg = event.message;
  if (!msg?.user?.id || !msg.text) return;
  const { room } = parseCid(event);
  if (!room) return; // whispers / 1:1 don't mirror — they're already
  // in their own channel and the existing conversations store covers
  // the moderation view there.

  const supabase = await createClient();
  // Best-effort insert; Supabase enforces RLS so the service role is
  // used for the mirror so the policy is a no-op for us.
  await supabaseAdmin.from('club_chat_messages').insert({
    room,
    sender_id: msg.user.id,
    body: msg.text,
    floor_tag: (msg.custom?.floor as string) || 'silver',
    horn: Boolean(msg.custom?.horn),
    created_at: msg.created_at ?? new Date().toISOString(),
    stream_message_id: msg.id ?? null
  });

  if (msg.custom?.horn) {
    await supabaseAdmin.from('club_announcements').insert({
      body: `🎺 ${msg.text}`,
      kind: 'horn',
      created_at: msg.created_at ?? new Date().toISOString()
    });
  }
}

async function mirrorMessageUpdate(event: { message?: { id?: string; deleted_at?: string } }) {
  // The Supabase mirror uses an advisory unique on stream_message_id, so
  // we update in place. For now, only deletes are mirrored (soft delete).
  if (!event.message?.id) return;
  if (event.message.deleted_at) {
    await supabaseAdmin
      .from('club_chat_messages')
      .update({ body: '[deleted]' })
      .eq('stream_message_id', event.message.id);
  }
}
