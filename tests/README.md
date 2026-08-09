# Club Cheeky test suite

A small, honest suite — no giant test pyramid. It targets the three things
that matter at scale: **the webhook handlers**, **the token engine**, and
**the AI spend path**.

## Running

| Command                      | What it runs                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `pnpm test`                  | Safe tests only — pure logic, no network, no DB. CI runs this.                    |
| `RUN_LIVE_TESTS=1 pnpm test` | Everything, including the live tests below (hits the production app + hosted DB). |

Live tests need the real env in `.env.local` (they load it via dotenv) and
are individually skippable:

| File                               | Proves                                                                                                                                                                                                                                | Env needed                                                   | Knobs                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `tests/webhook.live.test.mjs`      | Signature rejection (no sig / forged), valid sig on unhandled types, **idempotency on replay**, 15 concurrent events through the idempotency store                                                                                    | `STRIPE_WEBHOOK_SECRET`                                      | `WEBHOOK_TEST_ENDPOINT` (default `https://smartscott.online/api/webhooks`)                          |
| `tests/token-engine.live.test.mjs` | `redeem_swag_code` credits the **exact** amount once and can't double-redeem; **N members join one event concurrently** and every hold lands consistently; a member with 3 tokens **cannot hold two 3-token events** (no over-commit) | Supabase URL + service role + anon + `POSTGRES_URL` (pooler) | `STRESS_N` (default 20 — set 1000 for the full burst; measured: 1000 joins in ~13s, all consistent) |
| `tests/ai-probe.live.test.mjs`     | How one DeepSeek key survives a concurrent burst — successes / 429s / failures / latency / token usage                                                                                                                                                                                                | `DEEPSEEK_API_KEY`                                           | `PROBE_CONCURRENCY` (default 8)                                                                     |
| `tests/l3.live.test.mjs`           | The L³ tier engine end-to-end: trio shape + picked-exclusion, T1 (like+like and like+love) match + 5-message free line each, T2 (love+love) super match + floor-tiered gift + club announcement, Leave is silent, and the free line at the daily cap (5 spends, then refuses)                                                                                             | Supabase URL + anon + service role                          | —                                                                                                   |
| `tests/matchmaker.live.test.mjs`  | The Matchmaker game end-to-end: server-filtered draft phase (2-pick cap, drafts never write real likes), 16-card / 8-pair board build with the drafts as stakes, flip reveal → match/strike → win/lose, one unlock per matched pair on its own allowance, accept (conversation + match + recipient earns the sender-floor exclusive gift), decline (silent end + sender earns their own-floor consolation gift), the 2/3/4/5 plays dial, and `buy_gift` refusing the matchmaker-only items | Supabase URL + anon + service role                          | —                                                                                                   |
| `tests/club-chat.live.test.mjs`   | Club Chat (the town square) end-to-end: the floor ladder (your floor + global, upper floors refuse), the always-on profanity filter, the Horn (10 tokens, 1/hour, ticker + badge), whispers, take-private invite → accept = match + conversation with both parties' new-people allowance checked, the Chatterbox badge family, moderator chat bans, and block-aware RLS | Supabase URL + anon + service role                          | —                                                                                                   |

Example — the full "thousand people at once" event burst:

```sh
RUN_LIVE_TESTS=1 STRESS_N=1000 node --test tests/token-engine.live.test.mjs
```

## How it works

- **Runner:** Node's built-in `node:test` — zero new dependencies.
- **Safe vs live:** live tests are plain `node:test` files with a
  `{ skip: ... }` guard on `RUN_LIVE_TESTS=1`, so `pnpm test` in CI skips
  them automatically. They never fake or mock the stack — they exercise the
  real deployed endpoint and the real hosted DB with throwaway members that
  get deleted (rows and all) when the run finishes.
- **The unit test** (`tests/unit.test.mjs`) pins the token-amount rule —
  `utils/token-amount.ts` is the exact function the webhook uses to credit a
  token purchase, so a bad product name can never silently credit the wrong
  amount.

## Notes

- Live webhook tests write only idempotency-store rows (what the handler is
  designed to record) — no products, no customers, no grants.
- Token-engine tests seed tokens and mint codes with a `test:` note and a
  `toktest-*@clubcheeky.test` email prefix so they're identifiable; cleanup
  removes every trace.
- The AI probe spends a few cents of DeepSeek usage per run — keep
  `PROBE_CONCURRENCY` small unless you're deliberately load-testing.
