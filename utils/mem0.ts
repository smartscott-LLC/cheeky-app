import { MemoryClient } from 'mem0ai';

const MEM0_API_KEY = process.env.MEMORY_MEM0_API_KEY || '';
const MEM0_BASE_URL = process.env.MEMORY_MEM0_BASE_URL || '';
const MEM0_ORG_ID = process.env.MEMORY_MEM0_ORG_ID || '';
const MEM0_PROJECT_ID = process.env.MEMORY_MEM0_PROJECT_ID || '';

let _client: MemoryClient | null = null;

export function getMem0Client(): MemoryClient {
  if (!_client) {
    const config: Record<string, unknown> = { apiKey: MEM0_API_KEY };
    if (MEM0_ORG_ID) config.org_id = MEM0_ORG_ID;
    if (MEM0_PROJECT_ID) config.project_id = MEM0_PROJECT_ID;
    if (MEM0_BASE_URL) config.base_url = MEM0_BASE_URL;
    _client = new MemoryClient(config as Parameters<typeof MemoryClient>[0]);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await (client as any).search(query, { user_id: userId });
    return results;
  } catch (err) {
    console.error('mem0 search failed:', err);
    return [];
  }
}
