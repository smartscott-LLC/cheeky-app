// Direct AGNES via REST — no provider packages needed; the API is
// OpenAI-compatible and the probe in tests/ai-probe.live.test.mjs
// proves fetch works fine. The `ai` SDK streamText/createAGNES were
// removed during the dep migration; this is the zero-dep path.

const AGNES_BASE =
  process.env.MODEL_BASE_URL ||
  'https://apihub.agnes-ai.com/v1';

export interface DirectMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Streams a completion as a web ReadableStream of text chunks.
 * A cheap /models pre-flight makes bad keys and empty wallets surface as
 * clean errors (401 / 402 / 404) instead of mid-stream failures.
 */
export async function streamAGNESDirect(opts: {
  apiKey: string;
  model: string;
  system: string;
  messages: DirectMessage[];
}): Promise<ReadableStream<Uint8Array>> {
  const probe = await fetch(`${AGNES_BASE}/models`, {
    headers: { Authorization: `Bearer ${opts.apiKey}` }
  });
  if (!probe.ok) {
    throw new Error(`AGNES_http_${probe.status}`);
  }

  const response = await fetch(`${AGNES_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`
    },
    body: JSON.stringify({
      model: opts.model,
      stream: true,
      messages: [
        ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
        ...opts.messages
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`AGNES_http_${response.status}: ${text.slice(0, 200)}`);
  }

  return response.body!;
}
