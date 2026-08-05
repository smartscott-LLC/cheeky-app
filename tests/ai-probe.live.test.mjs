// DeepSeek burst probe (audit #7). LIVE: fires a burst of concurrent chat
// completions through the same endpoint the cast uses, and reports how the
// single API key holds up — successes, 429s, failures, latency. A probe, not
// a gate: the numbers tell us whether one key is enough or we need to split
// across two or three.
//
//   RUN_LIVE_TESTS=1 PROBE_CONCURRENCY=16 node --test tests/ai-probe.live.test.mjs
//
// Requires DEEPSEEK_API_KEY in .env.local (model: DEEPSEEK_MODEL, default
// deepseek-chat). Costs a few cents of usage per run — keep it small.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from 'dotenv';

config({ path: 'env.new' });

const RUN_LIVE = process.env.RUN_LIVE_TESTS === '1';
const KEY = process.env.DEEPSEEK_API_KEY;
const MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';
const CONCURRENCY = parseInt(process.env.PROBE_CONCURRENCY ?? '8', 10);

test(
  'deepseek burst probe (live)',
  { skip: !RUN_LIVE && 'set RUN_LIVE_TESTS=1' },
  async (t) => {
    if (!KEY) return t.skip('DEEPSEEK_API_KEY not in .env.local');

    await t.test(`burst of ${CONCURRENCY} concurrent calls`, async () => {
      const start = Date.now();
      const results = await Promise.all(
        Array.from({ length: CONCURRENCY }, async () => {
          const t0 = Date.now();
          try {
            const res = await fetch('https://api.deepseek.com/chat/completions', {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${KEY}`
              },
              body: JSON.stringify({
                model: MODEL,
                messages: [
                  { role: 'user', content: 'Reply with exactly: OK' }
                ],
                max_tokens: 5
              })
            });
            const json = await res.json().catch(() => ({}));
            return { status: res.status, ms: Date.now() - t0, usage: json.usage };
          } catch (e) {
            return { status: 0, ms: Date.now() - t0, error: e.message };
          }
        })
      );

      const ok = results.filter((r) => r.status === 200);
      const limited = results.filter((r) => r.status === 429);
      const failed = results.filter(
        (r) => r.status && r.status !== 200 && r.status !== 429
      );
      const ms = results.map((r) => r.ms).sort((a, b) => a - b);
      const p50 = ms[Math.floor(ms.length / 2)];
      const usage = ok.reduce(
        (s, r) => ({
          in: s.in + (r.usage?.prompt_tokens ?? 0),
          out: s.out + (r.usage?.completion_tokens ?? 0)
        }),
        { in: 0, out: 0 }
      );

      console.log(`\n  DeepSeek probe (${MODEL}):`);
      console.log(
        `  ${ok.length}/${results.length} ok · ${limited.length} rate-limited (429) · ${failed.length} failed`
      );
      console.log(
        `  latency: min ${ms[0]}ms · p50 ${p50}ms · max ${ms[ms.length - 1]}ms · burst total ${Date.now() - start}ms`
      );
      console.log(
        `  usage: ${usage.in} prompt / ${usage.out} completion tokens (${ok.length} calls)`
      );
      if (failed.length) {
        console.log(
          `  failures: ${[...new Set(failed.map((r) => r.error ?? r.status))].join(', ')}`
        );
      }

      // The key must at least answer — anything else is a finding to act on.
      assert.ok(ok.length > 0, 'DeepSeek key should answer at least one call');
    });
  }
);
