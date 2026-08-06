# NewsFlow Editorial Office

## Product direction

NewsFlow is not a generic news dashboard with a review button. It is a living journal with two legitimate identities:

- **Reader** enters the publication, reads formal Issues, follows Storylines, saves Signals and provides preference feedback.
- **Editor-in-Chief** enters the editorial office, interprets Storylines as calls for papers, reviews candidate manuscripts and closes a finite Issue.

The game feeling comes from role, ceremony, scarce publication space and consequential editorial judgment. It must never feel like a casual swipe game, an engagement leaderboard or a cartoon newsroom.

## Design style: Institutional Editorial Roleplay

The visual system combines mature publishing cues:

1. warm archival paper rather than app-card white;
2. editorial serif hierarchy and compact monospaced folio metadata;
3. oxblood red reserved for institutional authority and the CCUS Special Issue;
4. manuscript numbers, issue labels, decision letters and publication archives;
5. restrained seals and formal receipts instead of points, badges or celebratory effects.

The experience should feel slightly ceremonial and deliberately serious: the user is entering a publication with rules, not operating a content moderation queue.

## Role flow

1. The shared Hao Apps account remains the login authority.
2. After first sign-in, NewsFlow opens the identity registry.
3. The user chooses Reader or Editor-in-Chief.
4. Reader receives a clear admission receipt and enters the current Issue.
5. Editor-in-Chief enters the Editorial Office.
6. The role is saved locally per account and synchronized into the NewsFlow product account state.
7. The role may be changed from the role control or inside the editorial office.

Mobile identity controls use the explicit labels `读者` and `主编`, not unexplained abbreviations.

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

The Editor-in-Chief signs exactly one review decision:

- **Accept** — ready to enter publication planning;
- **Minor Revision** — the core is valid but wording, sourcing or scope needs bounded repair;
- **Major Revision** — the issue matters but evidence, structure or conclusion needs material reconstruction;
- **Reject** — below the journal's factual, timeliness or industry-impact threshold.

Contract: **Accept / Minor Revision / Major Revision / Reject**.

Cover selection is not a review decision. It happens after acceptance, inside Issue Desk.

Each decision produces a visible receipt and may be undone for five seconds. Mobile confirmation never depends on a hidden footer.

## Core game loop

### Issue Desk

The Editor-in-Chief moves accepted manuscripts into a finite **Issue Desk**:

- five formal publication positions;
- accepted manuscripts may be added or removed;
- one selected manuscript must be designated as the cover;
- acceptance does not automatically place a manuscript in the current Issue.

The interface deliberately avoids a free-form drag-and-drop page builder. `加入本期`, `移出本期` and `设为封面` are the complete Phase 1 controls.

### Close Issue

When the Issue contains at least one manuscript and has a cover, the Editor-in-Chief may sign **Close Issue** / `本期付印`.

Closing an Issue:

1. assigns an Issue number;
2. freezes the selected manuscript IDs and article snapshots;
3. records the cover selection;
4. records the editor and publication time;
5. clears the draft Issue Desk;
6. opens the newly published Issue inside Editorial Record.

The publication receipt is restrained:

> ISSUE 004 已付印。六项判断进入正式记录。

## Information architecture

The office contains four surfaces:

1. **Pending Manuscripts / 待审稿件** — current manuscript and the four-decision letter;
2. **Issue Desk / 本期编排** — finite publication positions and cover designation;
3. **Calls for Papers / 征稿启事** — active Storylines and the CCUS Special Issue;
4. **Editorial Record / 出版档案** — published Issues, decisions and export.

The existing review entry points open this office only for the Editor-in-Chief role. Reader users are routed to identity selection instead of the retired three-way review game.

## Editorial Record

The local-first record stores:

- review decisions;
- the current Issue draft;
- published Issues;
- cover and article IDs;
- publication timestamps;
- editor identity.

The export contract is schema version `3.0`. The former five-state decision record is retired rather than migrated or silently mapped.

## Engineering boundaries

- no new runtime dependency;
- no framework migration;
- no compatibility layer for the retired five-state decision model;
- the existing `editorial-office` module remains the single interaction owner;
- the additional stylesheet owns only the Issue Desk, receipts and mobile game-loop layout;
- existing Edition, Storyline, Issue and Signal data remain repository-native;
- review candidates continue to be generated from `content/inbox` during the existing build;
- shared account authentication remains external to the publication runtime;
- role state synchronizes through the existing shared product-account API;
- editorial and Issue records remain local-first until a server contract is explicitly required.

## Next phases

Phase 2 may add evidence, timeliness, range and judgment checks plus the CCUS Special Issue coverage rule. Phase 3 may compare published judgments with later Storyline evidence and form a long-term Editorial Record. Neither phase should introduce points, levels, streaks, coins or public rankings.
