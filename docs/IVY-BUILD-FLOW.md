# IVY BUILD FLOW — the workflow law (2026-10-11, owner-review #1)

**Rule: the laptop never ships binaries. Ivy builds from its own source
copy.** This is the "own copy" law applied to deployment — Ivy pulls from
`~/src/` (its full standalone mirror), so the running cluster never depends
on this laptop staying alive.

## The loop (every UI/fix item in Owner review.md runs through this)

1. **Change here** — edit in `/home/server/Downloads/cheeks/cheeky-app` (etc).
2. **Observe locally** — `pnpm dev` → `localhost:3000`. Poke it, get it right.
   (This is the "look from the south side" sandbox — no deploy, no rebuild.)
3. **When it's right, mirror it over** —
   ```
   scripts/ivy-mirror cheeky-app      # source + git + secrets → Ivy ~/src
   ```
4. **Build + deploy ON IVY from ITS OWN copy** —
   ```
   scripts/ivy-build club             # docker build on Ivy → ctr import → rollout
   ```
   `ivy-build` takes `club|lounge|maker|forms`. It reads build args from the
   env file in Ivy's own tree (`.env.new`/`.env.local`), builds with Ivy's
   docker, ferries the image into k3s containerd, and rolls the deployment.
5. **Verify public** — `curl https://www.smartscott.online/<path>`.

## What changed vs. the old flow
- OLD (wrong, per owner): laptop `docker build` → `docker save | ssh |
  ctr import`. Ivy was "still registering external" — pulling from the
  laptop, so a dead laptop = undeployable estate.
- NEW (correct): `ivy-mirror` pushes source; `ivy-build` compiles on Ivy.
  Proven live 2026-10-11: club rebuilt entirely on Ivy, rolled out, public
  sweep green (200/307/200/307/200).

## Ground truth commands
- `scripts/ivy '<cmd>'` — run anything on Ivy.
- `scripts/ivy-mirror [app...]` — refresh Ivy's source copies.
- `scripts/ivy-build club|lounge|maker|forms` — build+deploy from Ivy's copy.
- Internal routing test (no DNS, straight at Traefik):
  `scripts/ivy 'curl -s -H "Host: www.smartscott.online" -o /dev/null -w "%{http_code}" http://localhost/club'`
