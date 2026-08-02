// Direct DeepSeek via the official AI SDK provider — best of both worlds:
// the `ai` package's machinery (streaming, robust parsing, future tools)
// pointed straight at api.deepseek.com with your own key. No gateway, no
// aggregator markup (Baseten/OpenRouter all add a cut).
//
// Model: DEEPSEEK_MODEL (default deepseek-chat; deepseek-reasoner for the
// R1 chain-of-thought mode).

import { createDeepSeek } from '@ai-sdk/deepseek';
import { streamText } from 'ai';

const DEEPSEEK_BASE = 'https://api.deepseek.com';

export interface DirectMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Streams a completion as a web ReadableStream of text chunks.
 * A cheap /models pre-flight makes bad keys and empty wallets surface as
 * clean errors (401 / 402 / 404) instead of mid-stream failures.
 */
export async function streamDeepseekDirect(opts: {
  apiKey: string;
  model: string;
  system: string;
  messages: DirectMessage[];
}): Promise<ReadableStream<Uint8Array>> {
  const probe = await fetch(`${DEEPSEEK_BASE}/models`, {
    headers: { Authorization: `Bearer ${opts.apiKey}` }
  });
  if (!probe.ok) {
    throw new Error(`deepseek_http_${probe.status}`);
  }

  const deepseek = createDeepSeek({ apiKey: opts.apiKey });
  const result = streamText({
    model: deepseek(opts.model),
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
