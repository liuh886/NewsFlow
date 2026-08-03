# Editorial Signal Desk

This document is the visual and interaction handoff for the production NewsFlow frontend. `DESIGN.md` remains the authoritative product architecture.

## Direction

NewsFlow uses a modern editorial-workspace direction instead of a generic AI dashboard. The interface should read as calm, credible and deliberate:

- paper-toned surfaces;
- near-black typography;
- blue for active signals and evidence;
- restrained red for freshness;
- serif display typography and compact sans-serif controls;
- no stock imagery, neon glow, oversized dashboard chrome or decorative telemetry.

## Desktop composition

1. **Top bar** — identity, search, theme, help.
2. **Left rail** — edition, channels, reading queues, date density.
3. **Main column** — masthead, lead signal, stream.
4. **Brief rail** — three highlights, entities, source mix.
5. **Evidence drawer** — layered summary, evidence and source link.

The main editorial column always receives the largest share of horizontal space.

## Mobile composition

- compact brand header;
- single editorial column;
- off-canvas filters;
- four-item bottom navigation;
- full-width evidence drawer;
- no dependency on hover states.

## Design tokens

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#f4f1ea` | `#161715` |
| Surface | `#fbfaf6` | `#1d1f1d` |
| Ink | `#17191c` | `#f2efe7` |
| Signal | `#175cd3` | `#7ca9ff` |
| Live | `#d1432f` | `#ff7a67` |
| Headline | Newsreader | Newsreader |
| UI | DM Sans | DM Sans |
| Metadata | Roboto Mono | Roboto Mono |

## Interaction QA

Before release, verify:

- global search preserves focus while typing;
- all filters can be reset;
- bookmarks persist across reloads;
- list/grid and theme preferences persist;
- the lead signal is not duplicated in the stream;
- keyboard `J/K`, `Enter`, `S`, `T`, `L`, `/`, `?`, and `Esc` work;
- the mobile filter sheet and evidence drawer close correctly;
- external links include safe target attributes;
- empty and unavailable data states remain usable;
- reduced-motion preference disables nonessential animation.

## Content QA

The interface may communicate source tier and a quality score, but it must not imply independent factual verification. Direct quotes are shown only when present in the payload. Missing evidence is left empty rather than invented.
