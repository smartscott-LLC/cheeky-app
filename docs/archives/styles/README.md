# Floor Palettes

One SCSS file per floor — the source of truth for each area's color scheme.
These are Coolors exports (hex + hsl + rgb + gradients). The same values are
mirrored as design tokens in `tailwind.config.js` under the matching key, so
the UI can use Tailwind classes (`text-club`, `bg-gold`, `bg-platinum-navy`,
`bg-diamond`, …).

| File            | Floor / area                              | Key colors                                                                                |
| --------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `club.scss`     | Club Floor (Floor 1, the base experience) | shocking pink `#FF4DA6`, cotton bloom `#FF56D5`, indigo bloom `#6C089B`, canary `#F1F15E` |
| `gold.scss`     | Gold floor                                | harvest gold `#D29436`, royal gold `#E9CD42`, graphite, deep mocha                        |
| `platinum.scss` | Platinum floor                            | alice blue `#D8EEFF`, navy electric `#310A9C`, silver `#C7C7C7`, white smoke              |
| `diamond.scss`  | Diamond floor / Penthouse                 | hot fuchsia `#FB035C`, dark raspberry `#85054C`, azure mist, taupe grey                   |

Rules:

- Tailwind tokens are the only way the UI consumes palettes — no hardcoded hex
  in components.
- A floor's palette follows its area's mood (gold = warm brass, platinum =
  electric navy/silver, diamond = raspberry/fuchsia glam).
- New floors/gems (e.g. Ruby) add a `styles/palettes/<name>.scss` + matching
  Tailwind token set.
