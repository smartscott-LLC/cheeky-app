// Stream Chat — browser-side client wrapper.
//
// Returns a singleton StreamChat instance keyed by the public API key. The
// instance is lazy: it is constructed only when the app is actually
// connected. connectUser / disconnectUser are thin wrappers so the React
// tree can call them from useEffect.

import { StreamChat } from 'stream-chat';

let client: StreamChat | null = null;

export interface StreamTokenBundle {
  token: string;
  apiKey: string;
  userId: string;
  name: string;
}

export function getStreamClient(apiKey: string): StreamChat {
  if (!client) {
    client = StreamChat.getInstance(apiKey, {
      // Default to the modern realtime transport; Stream picks the best
      // available WebSocket implementation in the browser.
      enableWSFallback: true
    });
  } else if (client.key !== apiKey) {
    // The env rotated — rebuild the singleton rather than reuse the
    // previous key.
    client = StreamChat.getInstance(apiKey, { enableWSFallback: true });
  }
  return client;
}

export async function connectStream(
  apiKey: string,
  bundle: StreamTokenBundle,
  profile: { name: string; image?: string | null }
) {
  const c = getStreamClient(apiKey);
  if (c.userID) {
    // Already connected under this key — skip the round trip.
    return c;
  }
  await c.connectUser(
    {
      id: bundle.userId,
      name: profile.name || bundle.name,
      ...(profile.image ? { image: profile.image } : {})
    },
    bundle.token
  );
  return c;
}

export async function disconnectStream() {
  if (client?.userID) {
    try {
      await client.disconnectUser();
    } catch {
      // Best effort.
    }
  }
}
