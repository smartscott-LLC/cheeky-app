**Testing suite**

server@smartserver:\~/cheeky-app$ RUN\_LIVE\_TESTS=1 pnpm test  
$ node \--test \--experimental-strip-types tests/\*.test.mjs  
◇ injected env (40) from env.new // tip: ⌘ multiple files { path: \['.env.local', '.env'\] }  
﹣ AGNES burst probe (live) (0.679804ms) \# AGNES\_API\_KEY not in .env.local  
◇ injected env (40) from env.new // tip: ◈ encrypted .env \[www.dotenvx.com\]  
▶ Cheeky Lounge (live)  
✔ the ladder: your floor and below, global for everyone (2946.358714ms)  
✔ the always-on profanity filter (63.234805ms)  
✔ the Horn: 10 tokens, one per hour, ticker \+ badge (597.380517ms)  
✔ whispers: ephemeral pair rooms, both sides read (2197.625142ms)  
✔ take-private: invite \-\> accept \= match \+ conversation (670.655974ms)  
✖ take-private: the daily new-people allowance is checked on BOTH sides (2654.907868ms)  
✖ privacy toggles: invites\_disabled \+ gifts\_disabled (336.470477ms)  
✔ the Chatterbox collectible family (chat\_50) (282.610239ms)  
✔ moderator chat bans block posting (253.817709ms)  
✖ blocks hide messages at RLS (both directions) (922.520085ms)  
✖ Cheeky Lounge (live) (12437.224075ms)  
✔ profanity: the straight word is caught (1.442768ms)  
✔ profanity: the squish fix — letter-spaced and punctuated forms (0.333043ms)  
✔ profanity: clean messages are never blocked (0.251609ms)  
✔ horn: announcement prefix and kind (0.208481ms)  
✔ ladder: Global is everyone's (0.272634ms)  
✔ ladder: your floor and below, the climb is read-only above (0.177935ms)  
✔ horn: rate limit key shape and 1-per-hour cap (0.335099ms)  
✔ chatterbox: thresholds land in order, never skip (0.218142ms)  
◇ injected env (40) from env.new // tip: ⌘ multiple files { path: \['.env.local', '.env'\] }  
▶ event kinds (live)  
✖ the hourly wheel: scheduled kinds on the quarter, live (244.493164ms)  
✔ dance\_floor: mutual pick \-\> match, holds \-\> debits (2772.42644ms)  
✔ themed\_night: mutual pick \-\> match, holds \-\> debits (3620.597958ms)  
✔ rooftop pool: 10s rounds, mutuals leave the board, final pair auto-matches, everyone pays 40 (5170.343884ms)  
✔ rooftop pool: an odd pool refunds the lone leftover (4944.918724ms)  
{  
severity\_local: 'NOTICE',  
severity: 'NOTICE',  
code: '00000',  
message: 'table "\_sd\_matched" does not exist, skipping',  
where: 'SQL statement "drop table if exists \_sd\_matched"\\n' \+  
'PL/pgSQL function resolve\_speed\_dating(uuid) line 11 at SQL statement',  
file: 'tablecmds.c',  
line: '1427',  
routine: 'DropErrorMsgNonExistent'  
}  
✔ speed dating: full ranking, strongest mutuals match, everyone pays 25 (4493.003477ms)  
✔ date night: matched pair, mutual taps lock the round (1334.881627ms)  
✔ blind date: host asks, suitors answer, most tallies wins, suitors pay 15 (8221.634548ms)  
finalize: 120 entries cycled (reserved \-\> released) in one call, ledger untouched  
✔ finalize under load: 120 members, one cycle, all holds released cleanly (44308.008076ms)  
✖ event kinds (live) (80057.923411ms)  
◇ injected env (40) from env.new // tip: ⌘ override existing { override: true }  
▶ L³ tier engine (live)  
✔ l3\_trio returns verified candidates with photos, never self, never re-picked (2326.276641ms)  
✔ T1: mutual like → match, tier t1, 5-message free line each (1780.597859ms)  
✔ T1: like \+ love is still T1 (only love+love is T2) (2090.461878ms)  
✔ T2: mutual love → super match \+ floor-tiered gift \+ announcement (1746.133045ms)  
✖ Leave is silent — never matches, even against a love (688.103461ms)  
✖ the free line at the daily cap — reward spends, then refuses (681.946389ms)  
✖ L³ tier engine (live) (10128.629313ms)  
✔ drag: a single short drag stays within the viewport (1.393286ms)  
✔ drag: a long drag that would push past the right edge is clamped (0.285259ms)  
✔ drag: a long drag upward is clamped to the top (0.197399ms)  
✔ drag: the snap-forward prevents cumulative drift (the off-screen bug) (0.373505ms)  
✔ drag: a small drag lands the panel inside the viewport (the actual invariant) (1.660247ms)  
✔ drag: a no-op stroke (pointer didn't move) keeps the panel put (0.218272ms)  
✔ drag: a stroke that ends at the anchor (delta \= 0\) is a no-op (0.305467ms)  
✔ drag: the panel never escapes the viewport in any direction (0.464473ms)  
✔ resilience: a setState that throws does not bubble to the caller (1.333598ms)  
✔ resilience: an async IIFE that rejects still calls .catch (0.336587ms)  
✔ resilience: a watch() rejection is not fatal (0.255591ms)  
✔ resilience: missing messages array hydrates to empty list (1.035787ms)  
✔ resilience: a malformed message object survives the hydration (1.348292ms)  
✔ resilience: the watch effect does not run when the panel is closed (0.209058ms)  
✔ resilience: error boundary catches a synchronous throw from a child (0.421143ms)  
◇ injected env (40) from env.new // tip: ⌁ auth for agents \[www.vestauth.com\]  
▶ Matchmaker game (live)  
✖ draft phase: filtered candidates, 2-pick cap, no real likes (8927.447485ms)  
✖ start\_board: 16 cards, 8 pairs, the drafts are the stakes (143.763572ms)  
✖ flip: reveal, match, strike, and the 2-match win (55.748052ms)  
✖ send\_unlock: one first impression per matched pair, its own allowance (55.670565ms)  
✖ accept: chat opens, both can talk, recipient earns the sender-floor gift (58.865282ms)  
✖ decline: silent end, sender earns their own-floor consolation gift (1176.76017ms)  
✔ 3 strikes lose — a board with one match ends quiet (802.866543ms)  
✔ plays dial: silver burns two boards, then the third is refused (695.902355ms)  
✔ exclusivity: buy\_gift refuses the matchmaker-only items (72.601982ms)  
✖ Matchmaker game (live) (12153.759504ms)  
✔ verify: a fresh signature is accepted (1.450762ms)  
✔ verify: a forged signature is rejected (0.465402ms)  
✔ verify: a missing header is rejected (0.195718ms)  
✔ verify: a signature of the wrong length is rejected (no crash) (0.290891ms)  
✔ verify: the body is hashed exactly as the bytes were sent (0.592639ms)  
✔ verify: gzipped bodies are decompressed before hashing (1.382263ms)  
✔ verify: the signature is case-sensitive hex (lowercase) (0.541211ms)  
◇ injected env (40) from env.new // tip: ⌘ multiple files { path: \['.env.local', '.env'\] }  
▶ Tiki Taskbar state (live)  
✔ fresh member: tier \+ zero usage, not checked in (1875.956121ms)  
✔ check-in flips the flag; messages move the usage counts (2097.662282ms)  
✔ Tiki Taskbar state (live) (5433.368327ms)  
✔ the bar carries every hard-capped allowance — no hourly/token-only items (1.846308ms)  
✔ tile expansion: silver sees the spark hub \+ gifts; gold adds Blind Date (0.447077ms)  
✔ Matchmaker is live (un-gated) now that the dial is locked (0.201803ms)  
✔ tier caps mirror the enforcement ladder \+ the plays dial \+ blind-date cap (0.245759ms)  
✔ rank \+ caps mapping is forgiving (0.414781ms)  
✔ route gating hides only the street/door/office/auth — never the club (0.211036ms)  
◇ injected env (40) from env.new // tip: ⌘ enable debugging { debug: true }  
▶ token engine (live)  
✔ redeem\_swag\_code credits the exact amount, once (1804.733412ms)  
✔ swag codes expire and stale gifts fail closed (1137.4349ms)  
burst: 20 concurrent joins in 1073ms (19 joins/sec) — all 20 landed  
✔ 20 members join one event concurrently — all land, holds consistent (5605.592705ms)  
✖ no over-commit: 3 tokens cannot hold two 3-token events (285.559414ms)  
✖ token engine (live) (10129.307351ms)  
✔ parseTokenAmount extracts the token count from product names (0.718758ms)  
✔ membership token grants: every paid tier, every cycle (0.187565ms)  
◇ injected env (40) from env.new // tip: ◈ encrypted .env \[www.dotenvx.com\]  
▶ webhook handlers (live)  
✔ rejects a request with no signature (2043.109491ms)  
✔ rejects a forged signature (289.400472ms)  
✔ pre-flight: deployed handler knows the webhook secret (449.072785ms)  
✔ accepts a valid signature on an unhandled event type (496.187024ms)  
✔ idempotency: replaying the same event is acknowledged, never reprocessed (640.247244ms)  
✔ handles a burst of concurrent requests without error (1725.845039ms)  
✔ webhook handlers (live) (5645.312474ms)  
ℹ tests 92  
ℹ suites 0  
ℹ pass 73  
ℹ fail 18  
ℹ cancelled 0  
ℹ skipped 1  
ℹ todo 0  
ℹ duration\_ms 80199.966794

**pnpm /Dependancy State**

server@smartserver:\~/cheeky-app$ pnpm outdated

server@smartserver:\~/cheeky-app$ pnpm audit  
No known vulnerabilities found  
server@smartserver:\~/cheeky-app$ pnpm doctor  
✓ Versions: pnpm 12.3.4, Node.js 24.18.0  
✓ Install method: pnpm  
✓ Global bin directory: not configured  
✓ Cache directory: /home/server/.cache/pnpm  
✓ Store directory: /home/server/.local/share/pnpm/store/v11  
✓ Filesystem: available: hardlink, symlink  
✓ Registry connectivity: https://registry.npmjs.org/ (115ms)  
✓ Install smoke test: offline "file:" install linked its dependency

All checks passed  
server@smartserver:\~/cheeky-app$ pnpm peers check  
Issues with peer dependencies found

✕ unmet peer typescript  
Installed: 7.0.2  
Wanted:  
"^5 || ^6":  
i18next@25.10.10  
server@smartserver:\~/cheeky-app$

**Oxlint \- Output**

I ran this with the plugins and had it output the results in an agent format. I know it looks like a lot but you will be able to do mass edits as many are the same thing replicated in a diff spot. It will go fast and the payoff getting these things right is so worth it.

_“pnpm lint:fix \--type-aware \--nextjs-plugin \--react-plugin \--format=agent”_

server@smartserver:\~/cheeky-app$ pnpm lint:fix \--type-aware \--nextjs-plugin \--react-plugin \--format=agent  
$ oxlint \--fix \--type-aware \--nextjs-plugin \--react-plugin \--format=agent  
utils/supabase/queries.ts:15:31: error eslint(no-unused-vars): Variable 'error' is declared but never used. Unused variables should start with a '\_'. help: Consider removing this declaration.  
utils/supabase/queries.ts:25:27: error eslint(no-unused-vars): Variable 'error' is declared but never used. Unused variables should start with a '\_'. help: Consider removing this declaration.  
next-env.d.ts:3:1: error typescript(triple-slash-reference): Do not use a triple slash reference for ./.next/types/routes.d.ts, use \`import\` style instead. help: Use of triple-slash reference type directives is generally discouraged in favor of ECMAScript Module imports.  
components/ui/Browse/MatchmakerHistory.tsx:29:10: error react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders help: Effects should synchronize React with external systems. Calling setState synchronously inside an effect starts another render and is usually unnecessary. Derive the value during render, initialize state directly, or update it from the event that caused the change. Use an effect only when synchronizing with an external system.  
tests/club-chat.live.test.mjs:300:21: error eslint(no-unused-vars): Variable 'bs' is declared but never used. Unused variables should start with a '\_'. help: Consider removing this declaration.  
tests/club-chat.live.test.mjs:572:21: error eslint(no-unused-vars): Variable 'ss' is declared but never used. Unused variables should start with a '\_'. help: Consider removing this declaration.  
components/ui/Events/RooftopPool.tsx:33:3: error eslint(no-unused-vars): Parameter 'startsAt' is declared but never used. Unused parameters should start with a '\_'. help: Consider removing this parameter.  
components/ui/ClubChat/LoungePrefs.tsx:90:10: error react(static-components): Cannot create components during render help: Components created during render will reset their state each time they are created. Declare components outside of render  
components/ui/ClubChat/LoungePrefs.tsx:96:10: error react(static-components): Cannot create components during render help: Components created during render will reset their state each time they are created. Declare components outside of render  
components/ui/Browse/L3Trio.tsx:60:10: error react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders help: Effects should synchronize React with external systems. Calling setState synchronously inside an effect starts another render and is usually unnecessary. Derive the value during render, initialize state directly, or update it from the event that caused the change. Use an effect only when synchronizing with an external system.  
app/events/page.tsx:34:34: error react(purity): Cannot call impure function during render help: \`Date.now\` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component re-renders  
components/ui/Browse/MatchmakerDraft.tsx:44:10: error react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders help: Effects should synchronize React with external systems. Calling setState synchronously inside an effect starts another render and is usually unnecessary. Derive the value during render, initialize state directly, or update it from the event that caused the change. Use an effect only when synchronizing with an external system.  
app/events/speed/page.tsx:58:32: error react(purity): Cannot call impure function during render help: \`Date.now\` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component re-renders  
components/ui/Browse/Matchmaker.tsx:39:10: error react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders help: Effects should synchronize React with external systems. Calling setState synchronously inside an effect starts another render and is usually unnecessary. Derive the value during render, initialize state directly, or update it from the event that caused the change. Use an effect only when synchronizing with an external system.  
app/api/chat/stream-webhook/route.ts:135:9: error eslint(no-unused-vars): Variable 'supabase' is declared but never used. Unused variables should start with a '\_'. help: Consider removing this declaration.  
components/ui/Messages/MessageThread.tsx:104:3: error eslint(no-unused-vars): Parameter 'giftExpiresAt' is declared but never used. Unused parameters should start with a '\_'. help: Consider removing this parameter.  
app/global-error.tsx:6:3: error eslint(no-unused-vars): Parameter 'error' is declared but never used. Unused parameters should start with a '\_'. help: Consider removing this parameter.  
components/ui/PWA/InstallPrompt.tsx:28:5: error react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders help: Effects should synchronize React with external systems. Calling setState synchronously inside an effect starts another render and is usually unnecessary. Derive the value during render, initialize state directly, or update it from the event that caused the change. Use an effect only when synchronizing with an external system.  
components/ui/AccountForms/ProfileForm.tsx:33:3: error eslint(no-unused-vars): Parameter 'userId' is declared but never used. Unused parameters should start with a '\_'. help: Consider removing this parameter.  
components/ui/Browse/MatchmakerBoard.tsx:89:10: error react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders help: Effects should synchronize React with external systems. Calling setState synchronously inside an effect starts another render and is usually unnecessary. Derive the value during render, initialize state directly, or update it from the event that caused the change. Use an effect only when synchronizing with an external system.  
components/ui/Browse/MatchmakerBoard.tsx:125:35: error eslint(no-self-assign): this expression is assigned to itself help: Remove the self-assignment or assign to a different variable.  
app/events/\[kind\]/page.tsx:85:32: error react(purity): Cannot call impure function during render help: \`Date.now\` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component re-renders  
app/messages/\[id\]/page.tsx:81:18: error react(purity): Cannot call impure function during render help: \`Date.now\` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component re-renders  
components/ui/Owner/StreamLoungeMonitor.tsx:56:10: error react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders help: Effects should synchronize React with external systems. Calling setState synchronously inside an effect starts another render and is usually unnecessary. Derive the value during render, initialize state directly, or update it from the event that caused the change. Use an effect only when synchronizing with an external system.  
components/ui/FloatingHearts/FloatingHearts.tsx:23:20: error react(purity): Cannot call impure function during render help: \`Math.random\` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component re-renders  
components/ui/Events/EventFloor.tsx:220:11: error eslint(no-unused-vars): Variable 'res' is declared but never used. Unused variables should start with a '\_'. help: Consider removing this declaration.  
components/ui/DateNight/DateNightPanel.tsx:112:11: error eslint(no-unused-vars): Variable 'result' is declared but never used. Unused variables should start with a '\_'. help: Consider removing this declaration.  
components/ui/DateNight/DateNightPanel.tsx:41:34: error react(purity): Cannot call impure function during render help: \`Date.now\` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component re-renders  
components/ui/DateNight/DateNightPanel.tsx:77:10: error react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders help: Effects should synchronize React with external systems. Calling setState synchronously inside an effect starts another render and is usually unnecessary. Derive the value during render, initialize state directly, or update it from the event that caused the change. Use an effect only when synchronizing with an external system.  
components/ui/DateNight/DateNightPanel.tsx:106:5: error react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders help: Effects should synchronize React with external systems. Calling setState synchronously inside an effect starts another render and is usually unnecessary. Derive the value during render, initialize state directly, or update it from the event that caused the change. Use an effect only when synchronizing with an external system.  
components/ui/Story/StoryPlayer.tsx:194:15: error next(no-html-link-for-pages): Do not use \`\<a\>\` elements to navigate between Next.js pages. help: Use \`\<Link /\>\` from \`next/link\` instead for internal navigation. See https://nextjs.org/docs/messages/no-html-link-for-pages  
components/ui/Story/StoryPlayer.tsx:255:13: error next(no-html-link-for-pages): Do not use \`\<a\>\` elements to navigate between Next.js pages. help: Use \`\<Link /\>\` from \`next/link\` instead for internal navigation. See https://nextjs.org/docs/messages/no-html-link-for-pages  
components/ui/Story/StoryPlayer.tsx:279:11: error next(no-html-link-for-pages): Do not use \`\<a\>\` elements to navigate between Next.js pages. help: Use \`\<Link /\>\` from \`next/link\` instead for internal navigation. See https://nextjs.org/docs/messages/no-html-link-for-pages  
app/gifts/page.tsx:15:10: error eslint(no-unused-vars): Variable 'profile' is declared but never used. Unused variables should start with a '\_'. help: Consider removing this declaration.  
app/page.tsx:109:13: error next(no-html-link-for-pages): Do not use \`\<a\>\` elements to navigate between Next.js pages. help: Use \`\<Link /\>\` from \`next/link\` instead for internal navigation. See https://nextjs.org/docs/messages/no-html-link-for-pages  
components/ui/Taskbar/TikiTaskbar.tsx:82:10: error react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders help: Effects should synchronize React with external systems. Calling setState synchronously inside an effect starts another render and is usually unnecessary. Derive the value during render, initialize state directly, or update it from the event that caused the change. Use an effect only when synchronizing with an external system.  
components/ui/Owner/LoungeMonitor.tsx:111:10: error react(set-state-in-effect): Calling setState synchronously within an effect can trigger cascading renders help: Effects should synchronize React with external systems. Calling setState synchronously inside an effect starts another render and is usually unnecessary. Derive the value during render, initialize state directly, or update it from the event that caused the change. Use an effect only when synchronizing with an external system.  
app/account/page.tsx:88:15: error react(purity): Cannot call impure function during render help: \`Date.now\` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component re-renders  
types\_db.ts:3252:7: error typescript(no-redundant-type-constituents): 'never' is overridden by other types in this union type.  
app/chat/stream-actions.ts:162:18: error typescript(require-array-sort-compare): Require 'compare' argument.  
app/owner/actions.ts:349:14: error typescript(no-base-to-string): 'formData.get('company') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/owner/actions.ts:352:24: error typescript(no-base-to-string): 'formData.get('email') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/owner/actions.ts:353:26: error typescript(no-base-to-string): 'formData.get('message') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/verify/actions.ts:22:27: error typescript(no-base-to-string): 'formData.get('company') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/verify/actions.ts:27:23: error typescript(no-base-to-string): 'formData.get('email') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/verify/actions.ts:40:24: error typescript(no-base-to-string): 'formData.get('email') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/verify/actions.ts:41:27: error typescript(no-base-to-string): 'formData.get('password') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/verify/actions.ts:42:27: error typescript(no-base-to-string): 'formData.get('full\_name') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/verify/actions.ts:43:25: error typescript(no-base-to-string): 'formData.get('gender') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/verify/actions.ts:44:31: error typescript(no-base-to-string): 'formData.get('interestedIn') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
components/ui/Toasts/use-toast.ts:12:21: error typescript(no-redundant-type-constituents): 'ToastProps' is an 'error' type that acts as 'any' and overrides all other types in this intersection type.  
utils/auth-helpers/server.ts:44:27: error typescript(no-base-to-string): 'formData.get('pathName')' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/server.ts:64:24: error typescript(no-base-to-string): 'formData.get('email')' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/server.ts:120:24: error typescript(no-base-to-string): 'formData.get('email')' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/server.ts:163:24: error typescript(no-base-to-string): 'formData.get('email')' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/server.ts:164:27: error typescript(no-base-to-string): 'formData.get('password')' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/server.ts:202:24: error typescript(no-base-to-string): 'formData.get('email')' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/server.ts:203:27: error typescript(no-base-to-string): 'formData.get('password')' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/server.ts:204:27: error typescript(no-base-to-string): 'formData.get('full\_name') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/server.ts:205:27: error typescript(no-base-to-string): 'formData.get('birthday') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/server.ts:207:25: error typescript(no-base-to-string): 'formData.get('gender') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/server.ts:208:31: error typescript(no-base-to-string): 'formData.get('interestedIn') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/server.ts:209:27: error typescript(no-base-to-string): 'formData.get('company') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/server.ts:341:27: error typescript(no-base-to-string): 'formData.get('password')' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/server.ts:342:34: error typescript(no-base-to-string): 'formData.get('passwordConfirm')' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/server.ts:384:27: error typescript(no-base-to-string): 'formData.get('newEmail')' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/server.ts:425:27: error typescript(no-base-to-string): 'formData.get('fullName')' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
utils/auth-helpers/client.ts:33:27: error typescript(no-base-to-string): 'formData.get('provider')' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/events/blind\_date/page.tsx:110:16: error typescript(no-redundant-type-constituents): 'any' overrides all other types in this union type.  
components/ui/AccountForms/CustomerPortalForm.tsx:14:40: error typescript(no-redundant-type-constituents): 'Tables\<"subscriptions"\>' is an 'error' type that acts as 'any' and overrides all other types in this intersection type.  
components/ui/AccountForms/CustomerPortalForm.tsx:16:7: error typescript(no-redundant-type-constituents): 'any' overrides all other types in this union type.  
components/ui/AccountForms/CustomerPortalForm.tsx:16:8: error typescript(no-redundant-type-constituents): 'Tables\<"prices"\>' is an 'error' type that acts as 'any' and overrides all other types in this intersection type.  
components/ui/AccountForms/CustomerPortalForm.tsx:17:19: error typescript(no-redundant-type-constituents): 'Tables\<"products"\>' is an 'error' type that acts as 'any' and overrides all other types in this union type.  
components/ui/AccountForms/CustomerPortalForm.tsx:23:17: error typescript(no-redundant-type-constituents): 'any' overrides all other types in this union type.  
app/owner/page.tsx:409:27: error typescript(no-base-to-string): 'fd.get('type')' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/owner/page.tsx:410:28: error typescript(no-base-to-string): 'fd.get('value') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/owner/page.tsx:412:21: error typescript(no-base-to-string): 'fd.get('notes') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/owner/page.tsx:427:21: error typescript(no-base-to-string): 'fd.get('email') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/owner/page.tsx:428:27: error typescript(no-base-to-string): 'fd.get('type')' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/owner/page.tsx:429:28: error typescript(no-base-to-string): 'fd.get('value') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/owner/page.tsx:430:22: error typescript(no-base-to-string): 'fd.get('reason') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/owner/page.tsx:477:23: error typescript(no-base-to-string): 'fd.get('message') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/owner/page.tsx:478:28: error typescript(no-base-to-string): 'fd.get('style') ?? 'scroll'' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/owner/page.tsx:553:21: error typescript(no-base-to-string): 'fd.get('email') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
app/owner/page.tsx:555:22: error typescript(no-base-to-string): 'fd.get('reason') ?? ''' may use Object's default stringification format ('\[object Object\]') when stringified. help: Consider picking a property (e.g. \`user.name\`), using a formatter (or \`JSON.stringify\`), or implementing a custom \`toString()\`/\`toLocaleString()\` on the type.  
components/ui/Browse/Matchmaker.tsx:24:40: error typescript(no-redundant-type-constituents): 'MatchmakerActiveBoard' is an 'error' type that acts as 'any' and overrides all other types in this union type.  
components/ui/Pricing/Pricing.tsx:25:13: error typescript(no-redundant-type-constituents): 'Tables\<"products"\>' is an 'error' type that acts as 'any' and overrides all other types in this union type.  
components/ui/Pricing/Pricing.tsx:56:54: error typescript(no-redundant-type-constituents): 'Tables\<"prices"\>' is an 'error' type that acts as 'any' and overrides all other types in this union type.  
components/ui/Story/StoryPlayer.tsx:30:15: error typescript(no-redundant-type-constituents): 'StoryBeat' is an 'error' type that acts as 'any' and overrides all other types in this union type.  
components/ui/Verification/VerificationPanel.tsx:11:12: error typescript(no-redundant-type-constituents): 'Tables\<"profiles"\>' is an 'error' type that acts as 'any' and overrides all other types in this union type.  
\[ELIFECYCLE\] Command failed with exit code 1\.  
server@smartserver:\~/cheeky-app$
