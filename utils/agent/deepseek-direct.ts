// Direct AGNES via the official AI SDK provider — best of both worlds:
// the `ai` package's machinery (streaming, robust parsing, future tools)
// pointed straight at apihub.agnes-ai.com/v1 with your own key. No gateway, no
// aggregator markup (Baseten/OpenRouter all add a cut).
//
// Model: AGNES_MODEL (default AGNES-chat; AGNES-reasoner for the
// R1 chain-of-thought mode).

const AGNES_BASE = '${AGNES_URL}';

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

  const AGNES = createAGNES({ apiKey: opts.apiKey });
  const result = streamText({
    model: AGNES(opts.model),
    system: opts.system,
    messages: opts.messages
  });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    }
  });
}
