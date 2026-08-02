// Direct DeepSeek API client — straight to the provider, no aggregator
// markup (Baseten/OpenRouter/gateways all add a cut). Streaming via SSE.
// Model: DEEPSEEK_MODEL (default deepseek-chat; tune to a specific release
// like deepseek-v4-flash-0731 if that id is live on api.deepseek.com).

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

export interface DirectMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Streams a completion as a web ReadableStream of text chunks.
 * Throws before streaming if the request itself fails (bad key, bad model,
 * no credits) so the caller can return a clean error.
 */
export async function streamDeepseekDirect(opts: {
  apiKey: string;
  model: string;
  system: string;
  messages: DirectMessage[];
}): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: opts.system },
        ...opts.messages
      ],
      max_tokens: 300,
      stream: true
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const err = new Error(`deepseek_http_${res.status}`);
    (err as Error & { detail?: string }).detail = detail.slice(0, 300);
    throw err;
  }
  if (!res.body) {
    throw new Error('deepseek_no_body');
  }

  // SSE -> text chunks.
  const encoder = new TextEncoder();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (typeof delta === 'string' && delta.length > 0) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // Ignore malformed keep-alive frames.
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    }
  });
}
