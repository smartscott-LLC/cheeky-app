// Server-side DeepSeek client — the backbone behind the Club Cheeky
// characters. OpenAI-compatible endpoint, no SDK needed. The key lives in
// DEEPSEEK_API_KEY (Vercel connector + .env.local for local dev).

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }[];
}

export interface AgentTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AgentResult {
  text?: string;
  toolCalls?: { id: string; name: string; arguments: string }[];
}

export async function callDeepSeek(opts: {
  system: string;
  messages: AgentMessage[];
  tools?: AgentTool[];
  maxTokens?: number;
}): Promise<AgentResult> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error('deepseek_key_missing');
  }

  const body: Record<string, unknown> = {
    model: MODEL,
    messages: [{ role: 'system', content: opts.system }, ...opts.messages],
    max_tokens: opts.maxTokens ?? 300,
    temperature: 0.8,
    stream: false
  };
  if (opts.tools && opts.tools.length > 0) {
    body.tools = opts.tools;
  }

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('DeepSeek error:', res.status, detail.slice(0, 300));
    throw new Error(`deepseek_http_${res.status}`);
  }

  const json = (await res.json()) as {
    choices?: {
      message?: {
        content?: string | null;
        tool_calls?: {
          id: string;
          function: { name: string; arguments: string };
        }[];
      };
    }[];
  };

  const message = json.choices?.[0]?.message;
  if (message?.tool_calls?.length) {
    return {
      toolCalls: message.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments
      }))
    };
  }
  return { text: message?.content?.trim() ?? '' };
}
