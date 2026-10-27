# Club Cheeky — API Specification Sheet

> Full API reference for Club Cheeky: Next.js API routes, Supabase RPCs, Square + Didit webhook doors, Stream Chat integration, and third-party service contracts. (Rev 2026-10-27: Stripe retired, Didit is the door, platform is Ivy.)

---

## 1. Authentication & Authorization Standards

### 1.1 Auth Stack

Club Cheeky uses a **two-gate system**: Supabase Auth handles account creation and session management, but **Didit is the actual door** — no one enters the club without a government ID check.

| Layer                 | Technology                                  | Mechanism                                                                          | What It Grants                                                                                          |
| --------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Account Creation      | **Supabase Auth**                           | Magic link (email OTP) + password signup/signin                                    | Creates a user row — **Guest** on the street                                                            |
| Session               | **Supabase SSR**                            | Cookie-based session via `@supabase/ssr` (refresh on every request via middleware) | Keeps you signed in                                                                                     |
| Identity Verification | **Didit**                                   | Government ID check via Didit's hosted flow (`utils/didit.ts` session create)      | **The actual door** — authoritative webhook marks `profile.verified_at`, grants Silver card + 20 tokens |
| Server Auth           | `supabase.auth.getUser()`                   | Reads session cookie, refreshes if expired                                         | Confirms the request is from a known user                                                               |
| Admin Auth            | `supabaseAdmin` (service role)              | `SUPABASE_SERVICE_ROLE_KEY` — server-only, bypasses RLS                            | Database admin operations                                                                               |
| Owner Auth            | `owner_accounts` table + legacy `ADMIN_KEY` | Server action checks `authorized()` helper                                         | Founder back door                                                                                       |

### 1.2 Auth Flow (Two Gates)

```
GATE 1 — Supabase Auth (account creation):
  User → /signin → email OTP or password → Supabase Auth → session cookie set
  → User is now a "Guest" on the street
  → No events, no tokens, no chat, no club access
  → Only route available: /verify

GATE 2 — Didit (the actual door):
  User → /verify → server-side Didit session create (workflow e53ce2d4… "Fast ID check",
    vendor_data = club user_id, callback /verify?checked=1)
  → User completes the government ID check on Didit's hosted flow
  → Callback redirect is SIGNAGE ONLY; the authoritative verdict is the webhook:
  → POST /api/webhooks/didit (canonicalised HMAC-SHA256 X-Signature-V2, 300s freshness,
    event_id idempotency, case-sensitive status dispatch)
  → applyDiditVerification():
      1. Sets profile.verified_at ← THIS is the door opening
      2. Grants +20 tokens (idempotent)
      3. Awards "verified" badge + moment + welcome email
      4. profile_private: provider 'didit', birthday lifted from the signed payload
      5. Manifest mirror (membership section)
  → Declined: 3-strikes human escalation (never silently retried — checks cost money)
  → User is now a Silver member — club access granted
  → Redirected to /story (onboarding) then /club
```

### 1.3 Guest vs Member — What Changes

| Capability                        | Guest (unverified) | Silver+ (verified)      |
| --------------------------------- | ------------------ | ----------------------- |
| Browse / Swipes / L³ / Matchmaker | ❌ Blocked         | ✅ Available            |
| Events (Dance Floor, etc.)        | ❌ Blocked         | ✅ Available            |
| Lounge Chat                       | ❌ Blocked         | ✅ Available            |
| Tokens                            | ❌ None            | ✅ 25 granted on verify |
| Messages                          | ❌ Blocked         | ✅ 30/day               |
| Crew AI Chat                      | ❌ Blocked         | ✅ Available            |
| Coat Check                        | ❌ Blocked         | ✅ Available            |
| Story Mode                        | ❌ Blocked         | ✅ Available            |

### 1.4 Auth Standards

- **All API routes** require `supabase.auth.getUser()` — never trust the client alone
- **Feature access** is gated on `profile.verified_at` — checked server-side on every protected action
- **Service role key** (`SUPABASE_SERVICE_ROLE_KEY`) is server-only — never in client bundle
- **Anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) is public — RLS enforces row-level access
- **Owner actions** use a dual auth: `owner_accounts` table membership OR legacy `ADMIN_KEY` env var
- **JWT**: Supabase handles JWT issuance and validation internally — no custom JWT signing
- **Rate limiting**: Postgres RPC `bump_rate_limit` — fixed-window, fails open on infra errors

### 1.5 Auth Endpoints (Server Actions)

| Action               | Method        | Auth    | Description                                        |
| -------------------- | ------------- | ------- | -------------------------------------------------- |
| `signInWithEmail`    | Server Action | None    | Sends magic link OTP                               |
| `signInWithPassword` | Server Action | None    | Email + password signin                            |
| `signUp`             | Server Action | None    | Creates account with email/password + profile data |
| `signOut`            | Server Action | Session | Destroys session                                   |
| `updatePassword`     | Server Action | Session | Changes password                                   |
| `updateEmail`        | Server Action | Session | Changes email (requires confirmation)              |
| `updateName`         | Server Action | Session | Updates display name                               |

---

## 2. Next.js API Routes

### 2.1 Webhook doors — `POST /api/webhooks/square` · `POST /api/webhooks/didit`

**Square (the register)**: verifies `X-Hub-Signature` (URL+timestamp HMAC, constant-time,
300s freshness) → dedupes via `webhook_events` → fetches the order with `SQUARE_ACCESS_TOKEN`
→ buyer email → club account → grants per the `ITEM_LIBRARY.csv` contract (mirrored in
`utils/square-webhook.ts`): time-boxed entitlements (memberships 30d, trials 7d pro-rated),
token bundles, `store_purchases` ledger row for EVERY order (UNIQUE(order_id,sku) is the
idempotency lock). Unknown buyers and gift sets are recorded + logged loudly, never dropped.

**Didit (the door)**: canonicalise (shortenFloats→sortKeys) → HMAC-SHA256 X-Signature-V2 →
freshness → constant-time compare → `event_id` idempotency → case-sensitive status dispatch
into the `applyDiditVerification` chain (see Gate 2). The hosted callback URL is signage only.

**Legacy note**: `stripe-signature` / `manageSubscriptionStatusChange` / `creditTokenPurchase`
/ the products-sync webhook are RETIRED (2026-10) and were deleted from the codebase.

### 2.2 `POST /api/agent`

**Purpose**: AI crew character chat — streams responses from Agnes-02.5-flash.

**Auth**: Supabase session (`getUser()`)

**Rate Limits**: 60 msg/hour per user, 200 msg/hour per IP (Postgres `bump_rate_limit`)

**Request Body**:

```json
{
  "character": "brutus",
  "message": "Hey, what's the vibe tonight?",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response**: Streaming `text/plain` — SSE-style text chunks via `ReadableStream`

**Model Resolution**:

1. `model_config.cast_model` from Supabase (owner-configurable)
2. Fallback: `DEEPSEEK_MODEL` env var (default: `agnes-2.5-flash`)
3. Provider: `DEEPSEEK_URL` (default: `https://apihub.agnes-ai.com/v1`)

**System Prompt Construction**:

- Character persona prompt from `characters` table
- Member context (name, verification status, tier, token balance, upcoming events)
- House rules (honesty, encouragement, no purchase pressure)
- Optional: swag system note + cast delivery code

**Error Codes**:

| Code  | Meaning                                  |
| ----- | ---------------------------------------- |
| `401` | Not signed in                            |
| `400` | Missing character or message             |
| `404` | Character not found                      |
| `429` | Rate limited (hourly budget exceeded)    |
| `500` | AI provider error (auth, credits, model) |

### 2.3 `POST /api/chat/stream-token`

**Purpose**: Issues a Stream Chat user token for the signed-in member.

**Auth**: Supabase session (`getUser()`)

**Response**:

```json
{
  "enabled": true,
  "apiKey": "stream-api-key",
  "token": "stream-user-jwt",
  "userId": "supabase-uuid",
  "name": "Display Name"
}
```

**Behavior**:

- Upserts user into Stream (name + primary photo)
- Creates a short-lived Stream JWT
- Returns the public API key + token for client-side `connectUser()`

### 2.4 `POST /api/chat/stream-webhook`

**Purpose**: Stream Chat webhook receiver — mirrors messages into Supabase for moderation.

**Auth**: HMAC-SHA256 signature verification (`X-Signature` header + `STREAM_API_SECRET`)

**Body**: Gzip-compressed JSON (auto-detected via magic bytes)

**Handled Events**:

| Event                                                 | Action                                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `message.new`                                         | Mirror into `club_chat_messages` (global/silver/gold/platinum/diamond rooms only) |
| `message.new` (horn)                                  | Also insert into `club_announcements`                                             |
| `message.deleted` / `message.updated`                 | Soft-delete in mirror (`body = '[deleted]'`)                                      |
| `user.banned` / `channel.created` / `channel.deleted` | Logged, no mirror needed                                                          |

**Response**: `200 { ok: true }`

### 2.5 `GET /api/announcement`

**Purpose**: Returns the currently-live announcement ticker.

**Auth**: None (public read)

**Response**:

```json
{
  "message": "Dance Floor opens in 10 minutes!",
  "display_style": "scroll",
  "link": "/events/dance-floor"
}
```

### 2.6 `GET /api/taskbar`

**Purpose**: Returns the Tiki Taskbar state — usage counts and remaining allowances for the signed-in user.

**Auth**: Supabase session (`getUser()`)

**Response**:

```json
{
  "tier": "silver",
  "tiles": [
    {
      "key": "chats",
      "icon": "💬",
      "label": "Chats",
      "href": "/messages",
      "count": 25,
      "unlimited": false
    },
    {
      "key": "swipes",
      "icon": "👀",
      "label": "Browse",
      "href": "/browse",
      "count": 5,
      "unlimited": false
    },
    {
      "key": "coat",
      "icon": "🧥",
      "label": "Coat Check",
      "href": "/coat-check",
      "count": 1,
      "unlimited": false
    }
  ]
}
```

**Tier Caps**:

| Tier     | Messages | New People | Blind Date | Matchmaker |
| -------- | -------- | ---------- | ---------- | ---------- |
| Guest    | 0        | 0          | 0          | 0          |
| Silver   | 30       | 5          | 1          | 2          |
| Gold     | 75       | 15         | 2          | 3          |
| Platinum | ∞        | 40         | 3          | 4          |
| Diamond  | ∞        | 100        | 5          | 5          |

### 2.7 `POST /api/story/start`

**Purpose**: Starts a new story run for the user.

**Auth**: Supabase session (`getUser()`)

**Response**: `302 Redirect` to `/story`

### 2.8 `POST /api/story/beat`

**Purpose**: Records a beat completion and advances the story.

**Auth**: Supabase session (`getUser()`)

**Request Body**:

```json
{
  "beatNumber": 1,
  "choiceId": "respect"
}
```

**Response**:

```json
{
  "score": 20,
  "complete": false,
  "nextBeat": 2
}
```

### 2.9 `POST /api/story/persona`

**Purpose**: Saves the user's chosen Coat Check persona after story completion.

**Auth**: Supabase session (`getUser()`)

**Request Body**:

```json
{
  "personaSlug": "sasha-blonde-thai"
}
```

**Response**:

```json
{
  "ok": true,
  "persona": "sasha-blonde-thai"
}
```

---

### 2.10 `POST /api/avatar/save` — the maker save door

Session-gated single write door for avatar JSON (v0 contract folded into manifest v1);
validates against `utils/top-schema.ts`, writes the user manifest + updates `_master.json`.
Maker-only write path; the club's coat check reads through `topGet`.

### 2.11 `GET /api/avatar/{userId}` — the card read door

Sub-address projections (`?fields=profile.displayName,membership.tier,…`) from the manifest,
privacy gates enforced AT THE APEX (age/height/location behind show-flags), card-safe
allowlist, edge-cached 60s + SWR, LIVE tier overlay (mirror is the view, `current_tier()`
is the vote).

### 2.12 `POST /api/bio-draft` — AI bio suggestions

Direct REST to the Agnes hub (`MODEL_API_KEY`/`MODEL_BASE_URL`), session-gated, rate-limited.

## 3. Supabase Integration

### 3.1 Connection

| Variable                                                                 | Purpose                       |
| ------------------------------------------------------------------------ | ----------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                               | Project URL (public)          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client-side anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`                      | Admin key (server-only)       |

### 3.2 Client Patterns

| Context                          | Module                        | Pattern                                                   |
| -------------------------------- | ----------------------------- | --------------------------------------------------------- |
| Server Component / Route Handler | `@/utils/supabase/server`     | `createClient()` — reads cookies, refreshes session       |
| Client Component                 | `@/utils/supabase/client`     | `createClient()` — browser client, no session refresh     |
| Middleware                       | `@/utils/supabase/middleware` | `createClient(request)` — cookie-aware, refreshes session |
| Admin (service role)             | `@/utils/supabase/admin`      | `supabaseAdmin` — singleton, bypasses RLS                 |

### 3.3 Key Tables

| Table                   | Purpose                                                                     | RLS                                      |
| ----------------------- | --------------------------------------------------------------------------- | ---------------------------------------- |
| `profiles`              | User display name, verification, preferences                                | User reads own, service role for updates |
| `profile_private`       | Verification refs, attempts, birthday                                       | Service role only                        |
| `customers`             | Supabase UUID ↔ payment-customer mapping (Stripe-era table)                 | Service role only                        |
| `products`              | Catalog mirror for display (Square `ITEM_LIBRARY.csv` is the live contract) | Public read                              |
| `prices`                | Price mirror for display (same note)                                        | Public read                              |
| `subscriptions`         | Active subscription state                                                   | User reads own                           |
| `token_ledger`          | Token balance (delta per row)                                               | User reads own, service role inserts     |
| `events`                | Scheduled event rooms                                                       | Public read                              |
| `event_entries`         | Event participation                                                         | User reads own                           |
| `matches`               | Mutual matches                                                              | User reads own                           |
| `conversations`         | Active conversations                                                        | User reads own                           |
| `club_chat_messages`    | Lounge chat mirror (24h window)                                             | Service role (Stream is source of truth) |
| `club_chat_bans`        | Chat bans                                                                   | Service role only                        |
| `club_announcements`    | Horn announcements                                                          | Public read                              |
| `characters`            | AI crew character config                                                    | Public read                              |
| `model_config`          | AI model selection                                                          | Service role only                        |
| `swag_codes`            | Giveaway codes                                                              | Service role only                        |
| `banned_accounts`       | Account bans (email-level)                                                  | Service role only                        |
| `user_story_progress`   | Story mode progress                                                         | User reads/writes own                    |
| `story_beat_completion` | Beat-by-beat record                                                         | User reads own, service role inserts     |
| `announcements`         | Ticker announcements                                                        | Public read                              |
| `gift_catalog`          | Available gifts                                                             | Public read                              |
| `gem_catalog`           | Available gems                                                              | Public read                              |
| `badge_catalog`         | Available badges                                                            | Public read                              |

### 3.4 Key RPCs (Postgres Functions)

| RPC                        | Purpose                                                 | Auth          |
| -------------------------- | ------------------------------------------------------- | ------------- |
| `current_tier`             | Returns user's effective floor tier                     | Authenticated |
| `taskbar_state`            | Returns daily usage counts                              | Authenticated |
| `club_chat_send`           | Post a message to a room                                | Authenticated |
| `club_chat_horn`           | Send a horn announcement (costs tokens)                 | Authenticated |
| `club_chat_invite`         | Create a take-private invite                            | Authenticated |
| `club_chat_respond_invite` | Accept/decline an invite                                | Authenticated |
| `club_chat_whisper_get`    | Open/reuse a whisper channel                            | Authenticated |
| `club_chat_whisper_send`   | Send a whisper message                                  | Authenticated |
| `club_chat_heartbeat`      | Presence heartbeat                                      | Authenticated |
| `club_chat_ban`            | Ban a user from chat (owner only)                       | Service role  |
| `bump_rate_limit`          | Fixed-window rate limit counter                         | Authenticated |
| `mark_webhook_processed`   | Idempotency guard for ALL webhooks (now Square + Didit) | Service role  |
| `ensure_floor_events`      | Create upcoming events                                  | Authenticated |
| `finalize_events`          | Minute cron — finalize event rounds                     | Service role  |
| `award_badge`              | Grant a badge to a user                                 | Service role  |
| `record_common_moment`     | Record a milestone moment                               | Service role  |
| `generate_swag_code`       | Create a giveaway code                                  | Service role  |
| `flag_swag_request`        | Flag an owner-only item request                         | Service role  |
| `flag_honeypot_catch`      | Log a bot detection                                     | Service role  |

### 3.5 RLS Standards

- **Every table has RLS enabled** — never disabled "just for now"
- **User-owned tables**: `auth.uid() = user_id` policy
- **Public tables**: `true` for SELECT (products, prices, events, characters)
- **Service role tables**: No RLS policy (bypassed by `supabaseAdmin`)
- **Insert/Update**: Always scoped to `auth.uid() = user_id` or service role

---

## 4. Square & Didit Integration

### 4.1 Square (the register)

| Piece         | Contract                                                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storefront    | `smartscott.square.site` — `/memberships`, `/token-packages` (+ avatar-upgrades, gift-sets for phase two). Club CTAs open these (`utils/square-links.ts`). |
| Item contract | `ITEM_LIBRARY.csv` (11 SKUs) mirrored in `utils/square-webhook.ts`; SKU is the join key, price truth lives Square-side                                     |
| Webhook       | `POST /api/webhooks/square` — see 2.1; destination registered in Square console; `SQUARE_WEBHOOK_URL` must match what is signed                            |
| Money rules   | NO recurring billing — memberships are time-boxed entitlement grants; renewal reminders are queued phase-two work                                          |

### 4.2 Didit (the door)

Session create via REST (`DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID` env-overridable);
`vendor_data` carries the club user id as the join key; verdict arrives ONLY through
`POST /api/webhooks/didit`. Per-run cost — never test-spam; one live check, founder-capped.

### 4.3 Stripe (retired 2026-10)

The entire Stripe layer (checkout, webhook, Identity, portal, SDK deps, env vars) was
deleted estate-wide — see CHANGELOG. Historical `products`/`prices`/`subscriptions`
tables remain readable for display; no Stripe runtime paths exist.

---

## 5. Stream Chat Integration

### 5.1 Connection

| Variable                     | Purpose                                      |
| ---------------------------- | -------------------------------------------- |
| `STREAM_API_KEY`             | Server-side Stream API key                   |
| `STREAM_API_SECRET`          | Server-side Stream API secret (HMAC signing) |
| `NEXT_PUBLIC_STREAM_API_KEY` | Client-side Stream API key                   |

### 5.2 Architecture

```
Browser → POST /api/chat/stream-token → returns { apiKey, token, userId }
  → connectUser() on StreamChat singleton
  → Channel watch on cheeky-{global|silver|gold|platinum|diamond}
  → Messages flow through Stream's WebSocket
  → Stream webhook mirrors messages into Supabase club_chat_messages
```

### 5.3 Rooms

| Room Key   | Channel ID        | Label      | Access               |
| ---------- | ----------------- | ---------- | -------------------- |
| `global`   | `cheeky-global`   | The Lounge | All verified members |
| `silver`   | `cheeky-silver`   | Silver     | Silver+              |
| `gold`     | `cheeky-gold`     | Gold       | Gold+                |
| `platinum` | `cheeky-platinum` | Platinum   | Platinum+            |
| `diamond`  | `cheeky-diamond`  | Diamond    | Diamond+             |

### 5.4 Token Issuance

- Server creates a Stream JWT via `client.createToken(userId)`
- Token is short-lived (Stream default: ~1 hour)
- User is upserted into Stream with name + primary photo
- Client receives `{ apiKey, token, userId, name }` — never the secret

### 5.5 Webhook

- **HMAC-SHA256** verification against `STREAM_API_SECRET`
- Gzip auto-detection (magic bytes `0x1f, 0x8b`)
- Mirrors `message.new` into `club_chat_messages` (room-scoped)
- Horn messages also mirrored into `club_announcements`
- Soft-deletes mirrored on `message.deleted`

### 5.6 Server-Side Send

`streamSendAsUser()` — sends a message on behalf of a user using a per-call user token:

- Creates a temporary StreamChat instance with the user's token
- Watches/creates the channel
- Sends message with `{ text, user_id, custom: { floor, horn } }`

### 5.7 Moderation

- **Bans**: `club_chat_ban` RPC — 24h or 72h, enforced server-side
- **Rate limits**: Getstream.io's built-in rate limiting + Supabase `bump_rate_limit`
- **Owner monitor**: `ownerFetchLounge()` reads from Supabase mirror, `ownerFetchStreamLounge()` reads from Stream directly
- **Whispers**: Ephemeral 1:1 channels (`cheeky-whisper-{userA}-{userB}`)

---

## 6. Lounge Chat (Server Actions)(Can be changed to suit the builder**)

### 6.1 Actions

| Action                                  | RPC                        | Auth    | Description                   |
| --------------------------------------- | -------------------------- | ------- | ----------------------------- |
| `loungeSend(room, body)`                | `club_chat_send`           | Session | Post to a room                |
| `loungeHorn(body)`                      | `club_chat_horn`           | Session | Horn announcement (10 tokens) |
| `loungeInvite(userId)`                  | `club_chat_invite`         | Session | Create take-private invite    |
| `loungeRespondInvite(inviteId, accept)` | `club_chat_respond_invite` | Session | Accept/decline                |
| `loungeWhisperGet(userId)`              | `club_chat_whisper_get`    | Session | Open whisper channel          |
| `loungeWhisperSend(whisperId, body)`    | `club_chat_whisper_send`   | Session | Send whisper                  |
| `loungeHeartbeat(seconds)`              | `club_chat_heartbeat`      | Session | Presence ping                 |
| `loungeTier()`                          | `current_tier`             | Session | Get effective tier            |
| `loungeVerified()`                      | profiles query             | Session | Check verification            |
| `loungePrefs(invites, gifts)`           | profiles update            | Session | Privacy toggles               |
| `loungeFriendIds()`                     | matches + conversations    | Session | Get friend IDs                |

---

## 7. Owner Back Door

### 7.1 Auth

- **Primary**: `owner_accounts` table — user's email must be listed
- **Fallback**: `ADMIN_KEY` env var match
- Both checked server-side in `authorized()` helper

### 7.2 Actions

| Action                                       | Description                                                                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `ownerFetchState(key)`                       | Full Booth state: engine config, rules, codes, grants, flags, metrics, events, ledger, catalog, cast model, closures, reports, bans |
| `ownerFetchLounge(key)`                      | Lounge monitor: messages, invites, bans, announcements, totals                                                                      |
| `ownerFetchStreamLounge(key)`                | Stream-native lounge monitor (reads from Stream SDK)                                                                                |
| `ownerLoungeBan(key, userId, hours, reason)` | Ban user from chat (24h or 72h)                                                                                                     |
| `ownerLoungePardon(key, banId)`              | Early pardon a chat ban                                                                                                             |
| `ownerSetEngine(key, enabled)`               | Toggle promo engine                                                                                                                 |
| `ownerFetchStreamLounge(key)`                | Stream-native lounge monitor                                                                                                        |

---

## 8. AI Agent Integration

### 8.1 Provider

| Setting  | Value                                  |
| -------- | -------------------------------------- |
| Provider | AgnesAI (OpenAI-compatible API)        |
| Model    | `agnes-2.5-flash`                      |
| Base URL | `https://apihub.agnes-ai.com/v1`       |
| Auth     | `DEEPSEEK_API_KEY` (Bearer token)      |
| SDK      | `@ai-sdk/deepseek` (OpenAI-compatible) |

### 8.2 Delivery Paths

1. **Direct** (primary): `streamDeepseekDirect()` — calls AgnesAI directly via `@ai-sdk/deepseek`
2. **Gateway** (fallback): `streamAgent()` — uses Vercel AI Gateway (`ai` SDK) when no direct key is set

### 8.3 Characters

Characters are stored in the `characters` table with:

- `slug` — URL-safe identifier (e.g., `brutus`, `dj`, `bartender`, `trixie`, `hostess`)
- `name` — Display name
- `role` — Character role description
- `persona_prompt` — Full system prompt defining personality, voice, and rules
- `active` — Whether the character is currently available

### 8.4 Swag System

- **Cast delivery**: Owner can assign a swag code to be delivered by a specific character
- **SWAG markers**: `[[SWAG:slug]]` in AI responses are transformed into real codes
- **Flagging**: If a character tries to grant an owner-only item, it's flagged for review

---

## 9. Email Integration

### 9.1 Provider

| Setting      | Value                                      |
| ------------ | ------------------------------------------ |
| Provider     | **Resend**                                 |
| API Key      | `RESEND_API_KEY`                           |
| From Address | `Club Cheeky <no-reply@smartscott.online>` |
| Domain       | `REGISTERED_DOMAIN` (smartscott.online)    |

### 9.2 Emails Sent

| Trigger              | Subject                      | Content                              |
| -------------------- | ---------------------------- | ------------------------------------ |
| Verification success | Welcome to Club Cheeky       | Silver card + 20 tokens notification |
| (Future) Ban notice  | Club Cheeky — Account Notice | Ban duration + appeal info           |

### 9.3 Standards

- **Best-effort only** — mail must never fail the webhook or a report action
- `sendClubMail()` returns `{ ok: boolean }` — caller logs but never blocks on failure

---

## 10. Rate Limiting

### 10.1 Mechanism

- **Postgres RPC**: `bump_rate_limit(p_key, p_window_seconds, p_max)`
- **Fixed window**: Resets every `window_seconds`
- **Fails open**: If the RPC errors, budget is granted (logged for observability)

### 10.2 Limits

| Scope             | Key Pattern              | Window | Budget          |
| ----------------- | ------------------------ | ------ | --------------- |
| Agent chat (user) | `agent:user:{user_id}`   | 1 hour | 60 messages     |
| Agent chat (IP)   | `agent:ip:{ip}`          | 1 hour | 200 messages    |
| Messaging         | Via `club_chat_send` RPC | Daily  | Tier-based caps |

---

## 11. Monitoring & dead integrations

**Monitoring is Ivy-side**: netdata (DaemonSet, LAN :19999 — the OBS wall), Portainer,
`/owner` in-app booth. **Sentry and MongoDB are NOT wired** — no SDK, no code path;
the `mongodb` npm dep still sits in chub's package.json (store rule: delete when chub's
next code pass runs — noted in LAUNCH-STATUS).

---

## 13. Story Mode API

### 13.1 Tables

| Table                   | Purpose                                                           | RLS                                  |
| ----------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| `user_story_progress`   | One row per user — tracks current beat, score, persona, run count | User reads/writes own                |
| `story_beat_completion` | One row per beat per run — records choice + score                 | User reads own, service role inserts |

### 13.2 Beats

| Beat | Title            | Character | Location         |
| ---- | ---------------- | --------- | ---------------- |
| 1    | The Street       | Brutus    | Outside the club |
| 2    | The Silver Floor | D34D_B34T | Dance Floor      |
| 3    | The Gold Floor   | Roxy      | Gold floor bar   |
| 4    | The Gauntlet     | Trixie    | Platinum/Diamond |
| 5    | The Rooftop      | Valentina | Coat Check       |

### 13.3 Score Tiers

| Tier     | Min Score |
| -------- | --------- |
| Diamond  | 85        |
| Platinum | 65        |
| Gold     | 45        |
| Silver   | 0         |

### 13.4 Personas

| Slug                    | Name  | Variant         | Gender |
| ----------------------- | ----- | --------------- | ------ |
| `sasha-blonde-thai`     | Sasha | Blonde Thai     | Female |
| `sasha-the-keeper`      | Sasha | The Keeper      | Female |
| `sasha-black-hair-edgy` | Sasha | Black Hair Edgy | Female |
| `jax-default`           | Jax   | Default         | Male   |
| `jax-vaultkeeper`       | Jax   | The Vaultkeeper | Male   |
| `jax-slicked-back`      | Jax   | Slicked Back    | Male   |

---

## 14. Environment Variables Reference

Single source of truth: **[`docs/ENVIRONMENT.md`](ENVIRONMENT.md)** — every variable,
its purpose, public/secret status, and where values live (`.env.new` vault → Ivy
`~/club.env` → k8s Secrets, `NEXT_PUBLIC_*` baked at image build). This section is a
pointer by doctrine: one system, one way — no duplicate lists to drift.

---

## 15. API Standards Summary

| Standard           | Rule                                                       |
| ------------------ | ---------------------------------------------------------- |
| **Auth**           | All routes require `getUser()` unless explicitly public    |
| **Service Role**   | Never in client bundle — server-only imports               |
| **RLS**            | Mandatory on every table — never disabled                  |
| **Idempotency**    | Webhooks use atomic event dedup                            |
| **Rate Limiting**  | Postgres RPC, fixed window, fails open                     |
| **Error Handling** | Return structured JSON errors, never throw raw             |
| **Streaming**      | AI responses stream as `text/plain` chunks                 |
| **Best-Effort**    | Email, moments, badges — never fail the primary operation  |
| **Money**          | Stored as integers (cents)                                 |
| **Tokens**         | Server-side ledger only — never computed from client state |
| **Primary Keys**   | UUIDs everywhere — stable slugs only for URLs/config       |
