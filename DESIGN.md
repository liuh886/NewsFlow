# DESIGN: NewsFlow

## Product position

NewsFlow is a GitHub-native autonomous publication with two deliberately different experiences built on the same editorial system.

> **Reader Mode is a publication. Editor Mode is a game.**

The product must never collapse those two jobs into a generic dashboard.

- **Reader Mode** presents a serious professional journal: Issue, Signals, Storylines, Archive and evidence.
- **Editor Mode** is a focused review game: one manuscript, one decision, immediate consequence, next manuscript.
- **Edition** remains the editorial constitution: reader promise, worldview, scope, source policy, materiality, Storylines and publication cadence.
- Automation may process evidence but may not silently rewrite the Edition's formal position.

The concise product statement is:

> NewsFlow looks like a serious journal when you read it, and behaves like a card game when you edit it.

## Core principles

1. **Publication before tooling.** Reader Mode must feel like a journal before it feels like software.
2. **Editor means game mode.** Entering Editor Mode immediately hands the viewport to the review loop; it does not open an admin dashboard.
3. **One review engine.** Formal editors and invited guest editors use the same card, five decisions, motion and reaction system. Role changes authority, not interaction design.
4. **One manuscript, one decision.** The primary editor viewport contains one manuscript and exactly five editorial outcomes.
5. **Serious surface, playful consequence.** Humour appears after the decision as an editorial aside, never as decorative clutter before judgment.
6. **Post-game administration.** Issue composition and records appear only after the review loop; they do not compete with the manuscript while reviewing.
7. **New evidence stays attached to prior judgment.** Reader-facing Signals are interpreted against the current Issue and persistent Storylines.
8. **Continuity over novelty.** Storylines accumulate evidence and retain editorial memory.
9. **Fixed rhythm, variable length.** Formal Issues publish on the 1st and 15th, including no-material-change Issues.
10. **Editorial restraint.** The system must be willing not to publish low-value material.

## Shared content objects

### Edition

The executable editorial constitution. Runtime metadata comes from `public/data/edition.json`; the readable source lives in `editions/reference/edition.yaml`.

### Signal

A normalized evidence item with provenance, quality, summaries, tags and canonical source URL. A Signal can appear on the continuous Desk without entering a formal Issue.

### Storyline

A persistent editorial question with current view, evidence movement, watch items and falsifiers.

### Issue

A frozen semi-monthly publication artifact with central judgment, adopted Signals, Storyline movement, coverage window and provenance.

### Review candidate

A manuscript-like editorial candidate assembled from the content pipeline and durable human-preflight queue. It is the unit shown in Editor Mode.

### Review record

One editor's decision on one candidate. Formal and guest review records use the same five-decision vocabulary but different authority boundaries.

## Mode 1: Reader

Reader Mode is a traditional professional web publication.

### Reader information hierarchy

1. publication identity;
2. latest material change since the current Issue;
3. Current Issue;
4. additional Signals accumulating toward the next Issue;
5. Storylines;
6. Archive;
7. evidence and original sources.

### Reader interaction rules

- Homepage pacing is magazine-like: large editorial typography, whitespace and one dominant judgment per viewport.
- The continuous Desk scans like a newspaper: numbered rows, compact metadata and restrained summaries.
- Deep evidence views read like research briefs.
- Search, filters, bookmarks and account controls are supporting tools, not the dominant visual identity.
- Reader Mode contains no game HUD, five-decision bar, review progress or editorial stamps.

### Reader visual language

- warm paper canvas and near-black ink;
- restrained blue for evidence and active state;
- muted red only for meaningful editorial movement;
- `Newsreader` for publication hierarchy;
- `DM Sans` for controls and summaries;
- `Roboto Mono` for dates, issue numbers and method;
- visible editorial rules;
- no neon, glassmorphism or generic analytics-dashboard styling.

## Mode 2: Editor

Editor Mode is the primary serious-play experience.

The core loop is:

> **一屏一稿，一键裁决，一次反馈，然后下一稿。**

Entering Editor Mode does not reveal tabs, sidebars, queues, Storyline panels, score dashboards or issue-management controls. It opens the current manuscript.

### Card model

Each viewport contains one dominant manuscript card with:

- manuscript number;
- title;
- concise abstract/editorial summary;
- source, date and section;
- one optional original-source link;
- progress such as `03 / 12`.

A quiet card stack may imply that more submissions remain, but the next manuscript must not compete for attention.

### Five decisions

Every manuscript receives exactly one of five decisions:

1. **封面文章 / COVER STORY** — strongest endorsement and preferred Issue lead.
2. **录用 / ACCEPT** — publishable and worth adopting.
3. **小修 / MINOR REVISION** — core is sound; bounded clarification or evidence work remains.
4. **大修 / MAJOR REVISION** — meaningful potential, but argument/evidence/framing needs substantial work.
5. **拒稿 / REJECT** — does not meet fit, evidence, timeliness or materiality threshold.

Desktop shortcuts are `1–5`. Mobile keeps the same five choices in a fixed bottom decision bar. Ordinary decisions require no confirmation dialog.

### Decision feedback

The game lives in the moment after judgment.

- **Cover Story:** premium cover stamp and rare celebratory editorial aside.
- **Accept:** authoritative accepted stamp and restrained positive response.
- **Minor Revision:** dry academic humour.
- **Major Revision:** heavier treatment and suitably ominous editorial note.
- **Reject:** decisive rejection stamp and a deeper pool of academic-circle rejection jokes.

Examples of the intended tone:

- “感谢投稿。本刊与本文的缘分止于摘要。”
- “审稿人二号虽然没有出现，但我们决定尊重他的意见。”
- “小修。理论上。”
- “大修。不是把摘要换个标题再投一次。”

Humour targets academic rituals and editorial situations, never personal traits or protected characteristics.

### Review timing

`read → decide → stamp / quip → next manuscript`

Feedback is brief, automatically advances and remains compatible with reduced-motion settings. The immediately previous decision can be undone with `Z` or the visible undo control.

## Formal editor and guest editor

Formal Editor and Guest Editor share one Review Game implementation.

### Formal editor

- requires the signed-in Editor role;
- sees real pending review candidates only;
- decisions are stored as formal local editorial records;
- Cover Story and Accept become eligible for post-game Issue composition;
- post-game settlement can select up to five articles, designate a cover and close a local Issue record;
- can generate and copy a guest-editor invitation.

### Guest editor

- enters through a public invitation URL;
- registration is not required before the first review loop;
- uses the exact same manuscript card and five-decision bar as the formal editor;
- judgments remain parallel editorial opinions and do not gain Edition authority;
- when the live queue is sparse, the invitation may include clearly labeled blind editorial exercises derived from already public Signals;
- completion provides a shareable review receipt.

The invitation URL must never embed privileged credentials.

## Mode switching

The account identity control is a mode selector, not a role-management dashboard.

- **Reader** returns to the normal publication.
- **Editor** immediately opens the Review Game.
- A returning signed-in Editor may reopen directly into the game.
- Guest invitation URLs take precedence over the saved formal-editor mode for that visit.

The mode controller owns identity only. It must not contain its own review decisions, manuscript renderer or duplicate editorial state machine.

## Post-game settlement

Issue composition appears only after the editor has finished the immediate review queue.

The settlement surface is intentionally quieter than the game:

- list accepted/Cover Story manuscripts;
- select up to the current Issue capacity;
- designate one cover;
- close the local Issue record;
- invite another editor;
- return to the publication.

No review scoring or five-decision controls appear in settlement. Quality judgment has already happened.

## Invitation experience

An invitation opens as a formal `EDITORIAL APPOINTMENT`, not a registration page.

It communicates:

- publication identity;
- Guest Editor role;
- manuscript count;
- whether blind exercises are included;
- one primary action: **接受任命**.

After acceptance, the invitee immediately enters the same Review Game used by the formal editor.

## What Editor Mode intentionally excludes

The core product does not need:

- points or coins;
- XP or levels;
- streak pressure;
- daily quests;
- loot boxes;
- marketplace mechanics;
- leaderboards;
- multi-factor scoring forms;
- reviewer dashboards during the game.

The game must earn engagement through editorial role-play, rapid judgment and emotional feedback before any meta-game is considered.

## Responsive contract

### Reader

- wide desktop: publication column plus quiet Storyline margin;
- compact desktop/tablet: one publication column and contextual panels;
- mobile: one-column journal with essential navigation and full-width evidence panels.

### Editor

- desktop: one centered manuscript card, visible card-stack depth and five-wide decision rail;
- mobile: manuscript fills available height and the same five decisions remain fixed at the bottom;
- no essential action depends on hover;
- all actions have visible focus states and usable touch targets;
- reduced-motion mode removes stamp animation without removing decision feedback.

## Automatic publication contract

The reference workflow runs twice monthly and writes `public/data/issues.json`.

- On the 1st, coverage is the 16th through the final day of the previous month.
- On the 15th, coverage is the 1st through the 14th.
- Signals below `materiality.minimum_quality` are rejected.
- Adopted Signals are capped per channel and per Issue.
- A no-change Issue remains a valid formal Issue.
- Automation records evidence movement but cannot silently alter the Edition's formal view.

## Trust and quality requirements

- Repository data and fallback data remain mutually exclusive.
- Visible freshness comes from payload dates.
- Source tiers and quality scores do not claim independent verification.
- Generated Issues expose candidate count, selected count, primary-source count, Edition version and automation provenance.
- External text is escaped before HTML insertion.
- Original source links remain safely reachable.
- Public clients never receive Supabase service-role credentials.
- Formal and guest decisions remain distinguishable in storage and analytics.
- Guest invitations are bounded public appointments, not authority tokens.

## Architecture constraints

1. The reader application owns publication rendering.
2. The mode controller owns Reader/Editor identity and nothing else.
3. `review-game.js` owns both formal and guest review interaction.
4. There is no second four-state editor path.
5. There is no guest-only duplicate review renderer.
6. Decision feedback is part of Review Game, not a separate DOM-decorator layer.
7. Runtime coordination uses explicit lifecycle events; no `MutationObserver` patch layers.
8. No backward-compatibility layer is retained for the retired review architecture.

## Acceptance criteria

A release is complete only when:

1. `npm run check` passes;
2. `npm run build` produces the complete static site;
3. Reader Mode preserves the magazine-first hierarchy and existing search/filter/bookmark/evidence behavior;
4. selecting Editor Mode immediately opens the Review Game;
5. formal and guest editors render the same manuscript card and same five decisions;
6. the five decisions are exactly 封面文章、录用、小修、大修、拒稿 with shortcuts `1–5`;
7. every decision produces immediate editorial feedback and advances without a blocking modal;
8. mobile keeps all five decisions reachable without introducing dashboard navigation;
9. formal review uses real pending candidates and does not silently substitute training cases;
10. guest review clearly labels any blind exercise fallback;
11. Issue composition appears only after the review loop;
12. invitation URLs contain no privileged credentials;
13. retired four-state and guest-only runtimes are absent from the deployed app;
14. README, Edition protocol, design contract and runtime describe the same implemented product.
