# PRD — Avatar Maker Integration (mini_model_maker → Club Cheeky)

**Status:** DRAFT for founder approval · 2026-10-01
**Engine:** `/home/server/C5/mini_model_maker` (standalone Next.js, club palette + fonts native)

## The one-line shape

The maker is the forge; the club is the gallery. The maker **writes** a per-user
avatar manifest; the club **reads** it. They never share tables, code paths, or
builds — only this contract. (The last engine failed because it leaked through
every other seam.)

## Deploy topology (founder-approved 2026-10-01)

- Maker ships as **its own Vercel subdomain** (founder names + attaches it,
  aligned with the club's domain family) — not a `/maker` path.
- **Auth-first**: maker middleware gates every route (Supabase session,
  `@supabase/ssr`). Signed-out → redirected to club `/signin/password`
  (no return param yet; the club HUD "Create Model" button is the front door).
- **Cross-subdomain session**: Supabase cookies carry
  `domain = .smartscott.online` via `NEXT_PUBLIC_COOKIE_DOMAIN` — set in the
  Vercel env of BOTH projects (club + maker). Deliberately unset locally so
  dev cookies stay host-only. Implemented in club
  `utils/supabase/{server,middleware}.ts` + maker `utils/supabase/middleware.ts`.

## The flow (founder spec, 2026-10-01)

1. Member clicks **Create Model** in the club HUD → maker subdomain
   (session already valid — auth-first gate).
2. In the maker: pick a **preset**, adjust **sliders/swatches** (colors,
   height, etc.), preview on the stage (HDRI lighting).
3. **Save** → written to _their_ manifest (single write door, below).
4. The model appears on their **bio card**, in their own **HUD**, and on
   **anyone's** view of their bio card (info button), plus their
   **coat-check** area.
5. Coat-check roadmap: clothing assets live there too — a preview area with a
   "make adjustments" button back to the maker. The maker will be enhanced
   later; the contract stays.

## The bio card (founder spec — visual doctrine)

Baseball-card format. Custom card backs: **heart = ladies, gold/silver =
men**. Face layout, with deliberate _depth_ — overlays float above the frame,
borders and image sit beneath:

- Main photo (chosen/uploaded), top-left, in the card frame
- **Intro line** beneath the photo (Rancho body)
- **Bio in short** + "Read More" for the long form
- Age | Height | Location row (only if they chose to display)
- **The 3D model**, bottom-right corner, ~half card height — text _pads
  against_ her rather than being covered; frame borders pass behind her
- **Membership badge**, top-left corner, overlaying the photo/border
  (badge art from club assets)
- **One earned badge** of their choosing, top-right corner, same float

## The manifest (contract v0)

**Master manifest** `user-manifests/_master.json` → indexes every member's
manifest (path + updatedAt). Anyone needing a user's data (bio card render on
click, coat check, HUD) reads the master → it points at the user's manifest →
one fetch, cacheable at the route level — smoother than keeping avatars
rendered or state in-app. **All per-user data lives and dies in that one
user's manifest** — written and read solely there. Per-user object:
`user-manifests/{userId}/manifest.json` (1 MB cap — data, not media).

```json
{
  "version": 0,
  "userId": "uuid",
  "updatedAt": "ISO-8601",
  "name": "Punk Girl",
  "model": {
    "url": "https://…/avatar-models/{userId}/body_v3.glb",
    "rig": "mixamo"
  },
  "segments": {
    "body": "fit_female_0_0",
    "hair": "hair_female3_1_2",
    "top": "female_tops_2_3",
    "bottom": "female_bottoms1_0_4",
    "shoes": "female_shoes2_1_1",
    "accessories": ["accessories1_0_3"]
  },
  "palette": { "skin": "#hex", "hair": "#hex" },
  "stage": "magenta-cyan-cinematic-studio-2k"
}
```

- **Writes:** maker's server routes only, via service key, through the club's
  save endpoint `POST /api/avatar/save` (lives in cheeky-app — one validator,
  one home; the maker never touches Storage directly).
- **Reads:** club surfaces consume via `/api/me` (lounge), coat-check card, and
  profile pages. Always through the save/read endpoints — never raw bucket
  access from components.
- Validation: server-side schema check + 1 MB cap + userId = auth.uid(), no
  exceptions. Refuses unknown fields (forward-compatible by version bump).

## Asset homes

| Asset                                        | Bucket                                           | Public | Notes                                                                                                               |
| -------------------------------------------- | ------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------- |
| Per-user rigged GLBs                         | `avatar-models` (new)                            | yes    | `{userId}/*.glb`; needs `model/gltf-binary` in MIME allowlist                                                       |
| Shared segment library (22 girls → full set) | `quest-assets` successor: `avatar-library` (new) | yes    | the maker's read-only catalog                                                                                       |
| Stage HDRI                                   | `cheeky-assets/hdri/`                            | yes    | ✅ live: `magenta-cyan-cinematic-studio-2k.exr` (BlenderKit, royalty free, 01-Oct-2026; 4K master archived locally) |

## Model standards (rigging contract)

- **T-pose** export, single skeleton, **Mixamo bone names** (`mixamorigHips`…)
  — the club's animation library (idle/dance/wave) is Mixamo-sourced.
- Clip naming the viewer expects: `idle` (required, autoplays), `dance`
  (Dance Floor), `wave` (greeting). Missing clip = graceful static fallback.
- Budget: ≤ 5 MB per final GLB (gltf-transform meshopt pass on export).
- The maker's viewer (`AvatarViewer.tsx`) keeps the Lightformer rig as fallback;
  `<Environment files>` uses the stage HDRI when named in the manifest.

## Aesthetic doctrine (non-negotiable, all surfaces)

Fascinate = gold `#FFD800` heroes/section labels · Damion = cyan `#66FFFF`
headers/small labels · Rancho = pink `#FF97FF` body text. Maker, forms, lounge,
coat-check, every corner. Already true in the maker; audited 2026-10-01. ✅

## Open questions (founder)

1. Segment library bucket name OK (`avatar-library`)? The old `quest-assets`
   name is dead and we do not resurrect dead names.
2. ~~Guest dress-up~~ — **answered 2026-10-01: auth-first, members only**
   (maker middleware gate shipped).
3. Bio card rendering: live WebGL per card, or a render **snapshot** the maker
   stamps into the manifest on save? (Snapshot = cheap + cache-friendly for
   the everyone-clicks-everyone path; live = the wow. Master-manifest caching
   favors snapshot for browse surfaces, live for coat-check/HUD.)
4. `POST /api/avatar/save` in cheeky-app — approved as the single write door
   (validates schema, writes the user manifest, updates `_master.json`)?

## Explicitly NOT in scope

- Vector search over manifests (future phase, as designed).
- Anything quest-gameplay — the RPG layer is its own PRD when it comes.
