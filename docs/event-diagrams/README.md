# Event Diagrams — the flow library

The source-of-truth library for how Club Cheeky's events and games play —
their sequence, progression, and mechanics. Each event/game gets a Mermaid
chart here so it can be rebuilt, tweaked, or swapped out (per season, per
promo) from the base format instead of reverse-engineered.

## Convention

- **`.mmd` = the source of truth.** Always edit the Mermaid source, never the
  PDF.
- **`.pdf` = rendered reference** (optional) for quick eyeballing — re-render
  from the `.mmd` (`npx mmdc -i <name>.mmd -o <name>.pdf`) whenever the source
  changes so they never drift.
- **Swap in/out per season:** the chart travels with the event — pull one,
  drop the next in, the base format is already here.
- Charts cross-reference the matching PRD where one exists.

## Library

| Chart | What it is | PRD |
|---|---|---|
| `matchmaker.mmd` | Matchmaker — the memory-game intro unlocker (draft picks → 4×4 board → 2-match win / 3-strike loss → first-impression message) | `docs/PRD-matchmaker.md` |

More charts land here as they're built — Dance Floor, L³, and every event
engine addition.
