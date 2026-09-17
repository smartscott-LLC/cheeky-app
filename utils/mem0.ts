import { MemoryClient } from 'mem0ai';

const MEM0_API_KEY = process.env.MEM0_API_KEY || '';

let _client: MemoryClient | null = null;

export function getMem0Client(): MemoryClient {
  if (!_client) {
    _client = new MemoryClient({ apiKey: MEM0_API_KEY });
  }
  return _client;
}

/**
 * Extract user memories from a chat message.
 * Called after a successful message send to build user profiles.
 */
export async function addChatMemory(userId: string, message: string) {
  if (!MEM0_API_KEY || !userId) return;
  
  try {
    const client = getMem0Client();
    await client.add(
      [{ role: 'user', content: message }],
      { user_id: userId }
    );
  } catch (err) {
    console.error('mem0 add failed:', err);
  }
}

/**
 * Search memories for a user (for dating recommendations, matching, etc.)
 */
export async function searchMemories(userId: string, query: string) {
  if (!MEM0_API_KEY || !userId) return [];
  
  try {
    const client = getMem0Client();
    const results = await client.search(query, { user_id: userId });
    return results;
  } catch (err) {
    console.error('mem0 search failed:', err);
    return [];
  }
}
