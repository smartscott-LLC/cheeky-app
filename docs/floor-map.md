# Floor Map — what belongs on every floor

Source of truth for the room scene on each page. **Floors are equal to pages.**
If a room is missing or mislabeled, fix it here first, then in `utils/floors.ts`
(floor rooms) and `app/club/page.tsx` (lobby). Tailwind scans `utils/**` so every
spot class ships in the CSS — do not move spot styling to unscanned files.

Rule of thumb: **the special event lives on its own floor. The elevators are on
every floor. The Gift Shop and Coat Check live where the map says.** No button is
tier-restricted except the elevators — the floor pages themselves block entry
(`/floor/[slug]` shows the velvet rope), so rooms never need their own locks.

---

## 🚪 The Lobby — `/club`

The entrance room. First stop after verification.

| Where          | Button                          | Takes you to    |
| -------------- | ------------------------------- | --------------- |
| Left           | **VIP area** (the silver floor) | `/floor/silver` |
| Middle         | **Cheeky Chats**                | `/messages`     |
| Middle         | **The Spark List**              | `/browse`       |
| Right (top)    | **Elevators**                   | `/floors`       |
| Right (middle) | **Gift Shop**                   | `/gifts`        |
| Right (bottom) | **Coat Check**                  | `/coat-check`   |

> The Dance Floor is **not** in the lobby. It's only reachable from the silver
> floor. The lobby's left door is the VIP area.

---

## 🪩 Silver floor — the VIP area — `/floor/silver`

The free floor. Dance Floor lives here and nowhere else.

| Where           | Button             | Takes you to          |
| --------------- | ------------------ | --------------------- |
| Left            | **Dance Floor**    | `/events/dance_floor` |
| Middle          | **Cheeky Chats**   | `/messages`           |
| Middle          | **The Spark List** | `/browse`             |
| Middle (center) | **Event Center**   | `/events`             |
| Right (top)     | **Elevators**      | `/floors`             |
| Right           | **Gift Shop**      | `/gifts`              |

---

## 🎭 Gold floor — `/floor/gold`

| Where           | Button             | Takes you to           |
| --------------- | ------------------ | ---------------------- |
| Left            | **Themed Night**   | `/events/themed_night` |
| Middle          | **Cheeky Chats**   | `/messages`            |
| Middle          | **The Spark List** | `/browse`              |
| Middle (center) | **Event Center**   | `/events`              |
| Right (top)     | **Elevators**      | `/floors`              |
| Right           | **Gift Shop**      | `/gifts`               |

---

## 💘 Platinum floor — `/floor/platinum`

| Where           | Button             | Takes you to    |
| --------------- | ------------------ | --------------- |
| Left            | **Speed Dating**   | `/events/speed` |
| Middle          | **Cheeky Chats**   | `/messages`     |
| Middle          | **The Spark List** | `/browse`       |
| Middle (center) | **Event Center**   | `/events`       |
| Right (top)     | **Elevators**      | `/floors`       |
| Right           | **Gift Shop**      | `/gifts`        |

---

## 🌇 Diamond floor — `/floor/diamond`

| Where           | Button             | Takes you to      |
| --------------- | ------------------ | ----------------- |
| Left            | **The Rooftop**    | `/events/rooftop` |
| Middle          | **Cheeky Chats**   | `/messages`       |
| Middle          | **The Spark List** | `/browse`         |
| Middle (center) | **Event Center**   | `/events`         |
| Right           | **Elevators**      | `/floors`         |
| Right           | **Gift Shop**      | `/gifts`          |

---

## 🎭 The cast — who lives where

Each floor has its own face. Tap their square (top-left of the room) to chat.
Chats are gated by floor — you meet the cast you can reach, and the cast can
always reach you (they greet members on milestones regardless of tier).

| Floor      | Character                  | Chat                              | Button image                      | Avatar                       |
| ---------- | -------------------------- | --------------------------------- | --------------------------------- | ---------------------------- |
| Lobby      | **Brutus**, the bouncer    | `/chat/brutus`                    | `personas/brutus/door.png`        | `portrait.png`               |
| Silver     | **The DJ** (D34D_B34T)     | `/chat/dj`                        | `personas/dj/crowd.png`           | `stage.png`                  |
| Gold       | **Roxy**, the mixologist   | `/chat/bartender`                 | `personas/bartender/fullbody.png` | `portrait.png`               |
| Platinum   | **Trixie**, the waitress   | `/chat/trixie`                    | `personas/trixie/fullbody.png`    | `portrait.png`               |
| Diamond    | **Valentina**, the hostess | `/chat/hostess`                   | `personas/hostess/fullbody.png`   | `portrait.png`               |
| Everywhere | **Chaz**, the club manager | floating concierge (bottom-right) | —                                 | `personas/chaz/portrait.png` |

Chaz is the only character in the floating concierge — everyone else lives on
their floor. The coat-check cast grid keeps showing bond levels (collection,
not chat).

---

## 🧭 Nav bar — every page

| Where             | Button                              | Notes                                                                                                            |
| ----------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Left              | Logo (entrance art + "Club Cheeky") | Always                                                                                                           |
| Center            | **Meet the Crew** (→ `/crew`)       | Always — every floor, inside and out; portraits + fullbodies of the whole crew                                   |
| Right             | **Account**                         | Signed in                                                                                                        |
| Right             | **Enter the club** → **Lobby**      | The only thing that changes: on the street it's "Enter the club", inside it's "Lobby" — same destination `/club` |
| Right             | **Sign out**                        | Signed in                                                                                                        |
| Right (far right) | **Swag Shop**                       | Always accessible — codes redeem any time, even on the street                                                    |

Footer stays as-is (no floor links), with the Club Cheeky brand matching the nav.

## 🎧 The house DJ — on every page

A speaker button sits bottom-left on every page (the concierge owns
bottom-right). The DJ's real tracks play first — Pressure Gauge and Solar
Flare Summit (founder-generated MP3s, no licensing), crossfaded like a live
mix every ~35-60s. If a track ever fails to load, a synthesized house engine
(Web Audio, 200 BPM) steps in so the floor never goes quiet. Browsers block
sound until the first user gesture, so the floor comes alive on their first
click/tap anywhere. Mute state is remembered (localStorage). The MP4
versions (same music + cover art, no animation) sit in `public/video/` ready
if we ever want the art displayed. DJ announcement voice (events/matches) is
browser TTS, added with the event-audio pass.
