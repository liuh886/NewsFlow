# NewsFlow serious-play design system

NewsFlow should feel like a credible academic journal operated through a game console. The product phrase is **严肃的不正经**: editorial authority is real; playful feedback is emotional theatre.

## Product rule

The journal layer owns facts, evidence, decisions, issue composition and publication records. The game layer owns pacing, anticipation, stamps, short animations and humorous emotional feedback. Game copy must never alter a score, decision, evidence record or exported audit artifact.

## Visual grammar

- Paper, ink, rules, folio numbers, manuscript IDs and editorial stamps establish institutional authority.
- Serif typography carries article and decision hierarchy; mono typography carries metadata, keyboard shortcuts and system state.
- Burgundy is the editorial accent. Green, blue and ochre are reserved for accepted, minor-revision and major-revision feedback.
- Motion should resemble paper handling and rubber stamps, not arcade particles or cartoon bounce.
- Interfaces may be witty, but never visually childish.

## Core game loop

1. A manuscript enters the desk with a stable ID, scope and evidence summary.
2. The editor signs one of four decisions: accept, minor revision, major revision or reject.
3. The real decision is immediately persisted to the local editorial record.
4. A short editorial event appears as emotional feedback. It is random, dismissible and explicitly marked as excluded from the record.
5. Accepted manuscripts compete for limited issue slots and one cover position.
6. Closing an issue converts a sequence of judgments into a formal publication artifact.

## Humour boundary

Humour should target familiar academic rituals: reviewer two, impossible robustness requests, ambiguous requests for clarity, citation politics and endless revisions. It must remain original, non-personal and non-abusive. It may tease the system, never a real author or reviewer.

## Interaction timing

- Hover and focus feedback: 120–200 ms.
- Decision event entrance: about 300 ms.
- Automatic dismissal: 2.1–2.6 seconds, with click and Escape available immediately.
- All motion must collapse cleanly under `prefers-reduced-motion`.

## Data freshness

The masthead date beside NEWSFLOW is not the browser date and not the newest article date. It is derived from the latest applied content-run audit artifact. The content pipeline must update `public/data/data-status.json` whenever accepted Signals are applied.
