# NewsFlow Editorial Office

## Product direction

NewsFlow is not a generic news dashboard with a review button. It is a living journal with two legitimate identities:

- **Reader** enters the publication, reads formal Issues, follows Storylines, saves Signals and provides preference feedback.
- **Editor-in-Chief** enters the editorial office, interprets Storylines as calls for papers and signs formal decisions on candidate manuscripts.

The game feeling comes from role, ceremony and consequential editorial judgment. It must never feel like a casual swipe game, an engagement leaderboard or a cartoon newsroom.

## Design style: Institutional Editorial Roleplay

The visual system combines five mature publishing cues:

1. warm archival paper rather than app-card white;
2. editorial serif hierarchy and compact monospaced folio metadata;
3. oxblood red reserved for institutional authority and the CCUS Special Issue;
4. manuscript numbers, issue labels, decision letters and decision archives;
5. restrained seal and stamp interactions instead of points, badges or celebratory effects.

The experience should feel slightly ceremonial and deliberately serious: the user is entering a publication with rules, not operating a content moderation queue.

## Role flow

1. The shared Hao Apps account remains the login authority.
2. After first sign-in, NewsFlow opens the identity registry.
3. The user chooses Reader or Editor-in-Chief.
4. The role is saved locally per account and synchronized into the NewsFlow product account state.
5. The role may be changed from the role control or inside the editorial office.

Reader remains the safest default experience. Editor is a chosen role, not a paid entitlement or hidden administrator route.

## Editorial model

### Calls for papers

Every active Storyline becomes a formal call-for-papers scope. Its question, current editorial view and watch list explain what evidence the journal is seeking.

### Special Issue 01: CCUS

The `ccus-energy-transition` Storylines form the first Special Issue:

- CCUS project delivery;
- CO₂ network and commercial structure;
- CCUS institutions, evidence and responsibility.

The Special Issue is a coherent editorial programme, not merely a topic filter.

### Editorial decisions

The Editor-in-Chief signs exactly one of five decisions:

- **Cover Story** — accepted at the highest priority and nominated for the Issue cover;
- **Accept** — ready for formal publication;
- **Minor Revision** — the core is valid but wording, sourcing or scope needs bounded repair;
- **Major Revision** — the issue matters but evidence, structure or conclusion needs material reconstruction;
- **Reject** — below the journal's factual, timeliness or industry-impact threshold.

The first implementation stores decisions locally and exports a versioned decision record. It does not silently map the five-state editorial model back into the retired accept/reject/skip semantics.

## Information architecture

### Reader surface

The existing magazine-first publication remains intact. A compact identity control is added to the publication bar.

### Editorial office

The office contains three surfaces:

1. **Editorial Desk** — current manuscript and the five-decision letter;
2. **Calls for Papers** — active Storylines and the CCUS Special Issue;
3. **Decision Archive** — decision counts, recent records and export.

The existing review entry points open this office only for the Editor-in-Chief role. Reader users are routed to the identity registry instead of the old three-way review game.

## Engineering boundaries

- no new runtime dependency;
- no framework migration;
- one isolated `editorial-office` module with its own CSS and deterministic contract check;
- existing Edition, Storyline, Issue and Signal data remain repository-native;
- shared account authentication remains external to the publication runtime;
- role state can synchronize through the existing shared product-account API;
- editorial decisions remain local-first until a five-state server contract is explicitly introduced.
