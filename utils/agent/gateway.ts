// Vercel AI Gateway client — the `ai` SDK with model-string routing
// (e.g. deepseek/agnes-2.5-flash). Auth via VERCEL_OIDC_TOKEN
// (pulled with `vercel env pull`), so no gateway API key is needed.
// Model is configurable via AI_MODEL.

import { streamText } from 'ai';

export interface GatewayMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function streamAgent(opts: {
  system: string;
  messages: GatewayMessage[];
}) {
  // deepseek-v3 is reachable on the Vercel free tier; agnes-2.5-flash
  // resolves to a paid provider. Override via AI_MODEL anytime.
  const model = process.env.AI_MODEL ?? 'deepseek/deepseek-v3';
  return streamText({
    model,
    system: opts.system,
    messages: opts.messages
  });
}
