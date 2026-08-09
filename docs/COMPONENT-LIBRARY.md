# Club Cheeky — Component Library

The UI primitives and their conventions. `components/ui/` is **presentational** — business logic
lives in `utils/`, data mutations in server actions/API routes, and UI primitives never talk to
the database directly.

## Conventions (binding)

- **Server components by default.** `'use client'` only where interactivity requires it (forms,
  streaming chat, timers, toasts, audio).
- **Colors are tokens, never hex.** Floor colors come from `styles/palettes/*.scss` (source of
  truth) and are mirrored as Tailwind tokens in `tailwind.config.js`: `club`, `gold`,
  `platinum`, `diamond` (e.g. `text-club`, `border-gold/60`). Never hardcode a hex in a
  component — a floor repaint is a token edit, not a hunt.
- **Component-specific styles** use the CSS-modules pattern
  (`components/ui/Navbar/Navbar.module.css`) when utilities aren't enough.
- **Interactions through actions/RPCs.** Chat send, joins, purchases, reports all go through
  server actions or Supabase RPCs — the client never writes money, swag, or owner data.
- **One room, one floor's art**: rooms position over the floor backdrop via the shared
  `FloorLayout` (see `docs/floor-map.md` for what belongs on every floor).

## The inventory

### Primitives (presentational)

| Component         | What it is                                                             |
| ----------------- | ---------------------------------------------------------------------- |
| `ui/Button/`      | The button (variants incl. `slim`; loading state)                      |
| `ui/Card/`        | Card surface                                                           |
| `ui/Input/`       | Text inputs                                                            |
| `ui/Toasts/`      | Radix-powered toaster (`Toaster` mounted in the root layout)           |
| `ui/LoadingDots/` | Stream/loading indicator                                               |
| `ui/LogoCloud/`   | The "Powered by" trust row (Next.js, Stripe, Supabase)                 |
| `ui/Footer/`      | Site footer — club links, legal pages, contact desks, 🦁 The Lions Den |

### Shell & navigation

| Component                | What it is                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `ui/Navbar/`             | The marquee — logo, centered links, Enter-the-club/Lobby switch, account, swag, sign-out   |
| `ui/PWA/`                | `ServiceWorkerRegister` (offline shell for the Android wrapper)                            |
| `ui/Audio/`              | `ClubAudio` — the house DJ (synthesized fallback + the founder's tracks, crossfaded)       |
| `ui/AnnouncementBanner/` | The floor marquee — ticker/roll/fade, fed from the `announcements` table via the Lions Den |

### Identity & account

| Component          | What it is                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `ui/AuthForms/`    | Sign-in/sign-up forms (honeypots, OAuth)                                                                              |
| `ui/Verification/` | Brutus and the door — `CheckInForm` (the one-stop: consents + account fields), `VerificationPanel` (mid-flow members) |
| `ui/AccountForms/` | Profile form (avatar name, bio, one-liner, identity, photos, honeypot)                                                |

### The club & events

| Component       | What it is                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ui/Club/`      | `FloorLayout` — the shared room scene (art backdrop + positioned room spots); lobby + every floor render through it |
| `ui/Events/`    | `EventFloor` (grid room + song phase), `SpeedDatingFloor` (rotation/certificates), `MatchedOverlay`                 |
| `ui/DateNight/` | Couple Trivia — the mutual-tap game in matched chats                                                                |
| `ui/Browse/`    | The spark hub: `SparkLab` (mode tabs), `BrowseCard` (the 1-for-1 Swipes card — like/wave, match overlay), `L3Trio` (Leave · Like · Love), and the Matchmaker suite — `Matchmaker` (the room: incoming unlocks + board orchestration), `MatchmakerDraft` (phase-1 picks), `MatchmakerBoard` (the 4×4 board + flip/unlock), `MatchmakerHistory` (results + the decline consolation) |
| `ui/Messages/`  | `MessageThread` — Cheeky Chats: composer, report/block, waves, Date Night, song mode                                |

### Cast & commerce

| Component     | What it is                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| `ui/Agent/`   | `CastChat` (full-page character chat), `Concierge` (Chaz's floating panel) |
| `ui/Store/`   | The Exchange — membership cards + token packs (embedded Stripe checkout)   |
| `ui/Gifts/`   | `GiftShop` — buy/send gifts with tokens, featured + gesture tiers          |
| `ui/Swag/`    | The Swag Shop — redeem `SWAG-…` codes                                      |
| `ui/Pricing/` | The membership pricing surface (messaging-never-for-sale card)             |

## Adding a component

1. Prefer composing existing primitives over new ones.
2. New primitives go in `components/ui/<Name>/` with an `index.ts`; feature components sit at
   `components/<Feature>/`.
3. Server-first; add `'use client'` only when interactivity demands it.
4. Use tokens (`club`/`gold`/`platinum`/`diamond`) and existing utility patterns — copy an
   adjacent component's structure.
5. Update this doc's inventory when you add a durable component.

## The rooms (for context)

The lobby and floors are the same bones with different art: `FloorLayout` renders the floor
backdrop, then positions the room spots (Dance Floor, Event Center, Gift Shop, Chats, Spark
List, Elevators, Crew) per `utils/floors.ts` — the source of truth mirrored by
`docs/floor-map.md`. A room's look changes by swapping art + tokens, never by forking layout.
